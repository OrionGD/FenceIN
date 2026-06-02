"""
datalake_adapter.py — NHAI Datalake 3.0 Integration Adapter
=============================================================
Formats and pushes FenceIN biometric/attendance events to the NHAI Datalake 3.0
endpoint. Operates with an offline-first guarantee: when the Datalake endpoint
is unreachable, events are stored in the local SQLite queue (managed by
offline_cache.py) and flushed on the next successful connection.

Datalake 3.0 Schema (NHAI Standard):
    Each event payload conforms to the NHAI Unified Event Format v1 (UEF-1),
    which wraps any domain event in a standardised envelope:

    {
      "event_id":      "<uuid>",
      "source_system": "FENCEIN",
      "source_version": "2.0.0",
      "schema_version": "UEF-1.0",
      "event_type":    "<BIOMETRIC_CHECKIN | BIOMETRIC_ENROLLMENT | INCIDENT | ATTENDANCE>",
      "timestamp_utc": "<ISO-8601>",
      "tenant_id":     "<string>",
      "site_id":       "<string | null>",
      "subject": {
        "user_id":     "<string>",
        "role":        "<string>",
        "name":        "<string>"
      },
      "payload":       { ... event-specific fields ... },
      "auth_method":   "<FACE | FINGERPRINT | PASSWORD | OFFLINE>",
      "confidence":    <float | null>,
      "liveness_pass": <bool | null>,
      "network_mode":  "<ONLINE | OFFLINE>",
      "device_id":     "<string | null>"
    }

Usage:
    from datalake_adapter import queue_biometric_event, flush_queue, get_datalake_status

Configuration (environment variables):
    DATALAKE_ENDPOINT   — Full URL of the Datalake 3.0 ingest endpoint
                          e.g. https://datalake.nhai.gov.in/api/v3/ingest
    DATALAKE_API_KEY    — Bearer token / API key for Datalake authentication
    DATALAKE_TIMEOUT    — HTTP timeout in seconds (default: 10)
"""

import os
import uuid
import json
import time
import sqlite3
import datetime
import threading
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List

# ── Configuration ─────────────────────────────────────────────────────────────
DATALAKE_ENDPOINT = os.environ.get("DATALAKE_ENDPOINT", "")
DATALAKE_API_KEY  = os.environ.get("DATALAKE_API_KEY", "")
DATALAKE_TIMEOUT  = int(os.environ.get("DATALAKE_TIMEOUT", "10"))

SOURCE_SYSTEM   = "FENCEIN"
SOURCE_VERSION  = "2.0.0"
SCHEMA_VERSION  = "UEF-1.0"

_CACHE_DIR = os.path.dirname(os.path.abspath(__file__))
_QUEUE_DB  = os.path.join(_CACHE_DIR, "fencein_cache.db")   # shared with offline_cache.py

_push_lock = threading.Lock()


# ── Payload Formatters ────────────────────────────────────────────────────────

def _build_envelope(
    event_type: str,
    tenant_id: str,
    subject: Dict[str, Any],
    payload: Dict[str, Any],
    *,
    site_id: Optional[str] = None,
    auth_method: str = "FACE",
    confidence: Optional[float] = None,
    liveness_pass: Optional[bool] = None,
    network_mode: str = "ONLINE",
    device_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Wraps a domain payload in the NHAI UEF-1.0 envelope."""
    return {
        "event_id":       str(uuid.uuid4()),
        "source_system":  SOURCE_SYSTEM,
        "source_version": SOURCE_VERSION,
        "schema_version": SCHEMA_VERSION,
        "event_type":     event_type,
        "timestamp_utc":  datetime.datetime.utcnow().isoformat() + "Z",
        "tenant_id":      tenant_id,
        "site_id":        site_id,
        "subject":        subject,
        "payload":        payload,
        "auth_method":    auth_method,
        "confidence":     round(confidence, 4) if confidence is not None else None,
        "liveness_pass":  liveness_pass,
        "network_mode":   network_mode,
        "device_id":      device_id,
    }


def format_biometric_checkin(
    user_id: str,
    first_name: str,
    last_name: str,
    role: str,
    tenant_id: str,
    confidence: float,
    liveness_pass: bool,
    auth_method: str = "FACE",
    site_id: Optional[str] = None,
    kiosk_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    network_mode: str = "ONLINE",
) -> Dict[str, Any]:
    """
    Formats a biometric check-in event in Datalake 3.0 UEF-1.0 schema.
    Used for both face-login and fingerprint-login gate events.
    """
    return _build_envelope(
        event_type   = "BIOMETRIC_CHECKIN",
        tenant_id    = tenant_id,
        subject      = {"user_id": user_id, "role": role, "name": f"{first_name} {last_name}".strip()},
        payload      = {
            "check_type":    "CHECK_IN",
            "kiosk_id":      kiosk_id,
            "ip_address":    ip_address,
        },
        site_id      = site_id,
        auth_method  = auth_method,
        confidence   = confidence,
        liveness_pass = liveness_pass,
        network_mode = network_mode,
        device_id    = kiosk_id,
    )


def format_biometric_enrollment(
    user_id: str,
    first_name: str,
    last_name: str,
    role: str,
    tenant_id: str,
    modality: str,   # "FACE" | "FINGERPRINT"
    liveness_score: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Formats a biometric enrollment event in Datalake 3.0 UEF-1.0 schema.
    """
    return _build_envelope(
        event_type   = "BIOMETRIC_ENROLLMENT",
        tenant_id    = tenant_id,
        subject      = {"user_id": user_id, "role": role, "name": f"{first_name} {last_name}".strip()},
        payload      = {
            "modality":      modality,
            "liveness_score": liveness_score,
        },
        auth_method  = modality,
        liveness_pass = (liveness_score is not None and liveness_score >= 0.40),
    )


def format_incident_event(
    incident_type: str,
    severity: str,
    tenant_id: str,
    user_id: Optional[str] = None,
    site_id: Optional[str] = None,
    description: Optional[str] = None,
    confidence: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Formats a security incident event (spoof attempt, geofence violation, etc.)
    in Datalake 3.0 UEF-1.0 schema.
    """
    return _build_envelope(
        event_type   = "INCIDENT",
        tenant_id    = tenant_id,
        subject      = {"user_id": user_id or "UNKNOWN", "role": "UNKNOWN", "name": ""},
        payload      = {
            "incident_type": incident_type,
            "severity":      severity,
            "description":   description,
        },
        site_id      = site_id,
        confidence   = confidence,
    )


def format_attendance_event(
    user_id: str,
    first_name: str,
    last_name: str,
    role: str,
    tenant_id: str,
    check_type: str,     # "CHECK_IN" | "CHECK_OUT"
    trust_score: float,
    site_id: Optional[str] = None,
    shift_id: Optional[str] = None,
    geofence_status: str = "VALID",
    network_mode: str = "ONLINE",
) -> Dict[str, Any]:
    """
    Formats a standard attendance event in Datalake 3.0 UEF-1.0 schema.
    """
    return _build_envelope(
        event_type   = "ATTENDANCE",
        tenant_id    = tenant_id,
        subject      = {"user_id": user_id, "role": role, "name": f"{first_name} {last_name}".strip()},
        payload      = {
            "check_type":       check_type,
            "trust_score":      round(trust_score, 4),
            "shift_id":         shift_id,
            "geofence_status":  geofence_status,
        },
        site_id      = site_id,
        auth_method  = "ATTENDANCE_SYSTEM",
        network_mode = network_mode,
    )


# ── Queue Management ──────────────────────────────────────────────────────────

def queue_event(event_type: str, payload: Dict[str, Any]) -> bool:
    """
    Persists an event to the local SQLite offline queue.
    Always succeeds regardless of network state. Returns True on success.
    """
    now_str = datetime.datetime.utcnow().isoformat()
    try:
        with _push_lock:
            conn = sqlite3.connect(_QUEUE_DB, check_same_thread=False)
            try:
                cur = conn.cursor()
                # Ensure table exists (may be called before offline_cache.init_cache)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS datalake_event_queue (
                        id          INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_type  TEXT NOT NULL,
                        payload_json TEXT NOT NULL,
                        created_at  TEXT NOT NULL,
                        pushed_at   TEXT,
                        push_status TEXT DEFAULT 'PENDING'
                    )
                """)
                cur.execute("""
                    INSERT INTO datalake_event_queue (event_type, payload_json, created_at)
                    VALUES (?, ?, ?)
                """, (event_type, json.dumps(payload), now_str))
                conn.commit()
                return True
            finally:
                conn.close()
    except Exception as e:
        print(f"[DatalakeAdapter] Queue write error: {e}")
        return False


def queue_biometric_event(payload: Dict[str, Any]) -> bool:
    """Convenience wrapper — queues a pre-formatted UEF-1.0 payload."""
    return queue_event(payload.get("event_type", "UNKNOWN"), payload)


def _push_single(payload: Dict[str, Any]) -> bool:
    """
    Attempts to POST a single event payload to the Datalake 3.0 endpoint.
    Returns True if the push was accepted (HTTP 200/201/202).
    """
    if not DATALAKE_ENDPOINT:
        return False

    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept":       "application/json",
        "X-Source":     SOURCE_SYSTEM,
        "X-Schema":     SCHEMA_VERSION,
    }
    if DATALAKE_API_KEY:
        headers["Authorization"] = f"Bearer {DATALAKE_API_KEY}"

    try:
        req = urllib.request.Request(DATALAKE_ENDPOINT, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=DATALAKE_TIMEOUT) as resp:
            return resp.status in (200, 201, 202)
    except Exception as e:
        print(f"[DatalakeAdapter] Push failed: {e}")
        return False


def flush_queue(max_events: int = 500) -> Dict[str, Any]:
    """
    Flushes pending events from the local SQLite queue to the Datalake 3.0
    endpoint. Stops after `max_events` pushes to avoid blocking the server.

    Returns a dict with 'pushed', 'failed', 'remaining' counts.
    """
    pushed = 0
    failed = 0
    now_str = datetime.datetime.utcnow().isoformat()

    if not DATALAKE_ENDPOINT:
        return {"pushed": 0, "failed": 0, "remaining": 0, "note": "DATALAKE_ENDPOINT not configured"}

    with _push_lock:
        try:
            conn = sqlite3.connect(_QUEUE_DB, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, event_type, payload_json
                    FROM datalake_event_queue
                    WHERE push_status = 'PENDING'
                    ORDER BY id ASC
                    LIMIT ?
                """, (max_events,))
                pending = cur.fetchall()

                for row in pending:
                    try:
                        payload = json.loads(row["payload_json"])
                        ok = _push_single(payload)
                        if ok:
                            cur.execute("""
                                UPDATE datalake_event_queue
                                SET push_status = 'PUSHED', pushed_at = ?
                                WHERE id = ?
                            """, (now_str, row["id"]))
                            pushed += 1
                        else:
                            cur.execute("""
                                UPDATE datalake_event_queue
                                SET push_status = 'FAILED'
                                WHERE id = ?
                            """, (row["id"],))
                            failed += 1
                    except Exception:
                        failed += 1

                conn.commit()

                cur.execute("SELECT COUNT(*) AS cnt FROM datalake_event_queue WHERE push_status = 'PENDING'")
                remaining = cur.fetchone()["cnt"]

            finally:
                conn.close()
        except Exception as e:
            print(f"[DatalakeAdapter] Flush error: {e}")
            return {"pushed": pushed, "failed": failed, "remaining": -1, "error": str(e)}

    return {"pushed": pushed, "failed": failed, "remaining": remaining}


def get_datalake_status() -> Dict[str, Any]:
    """
    Returns connectivity status and queue depth for the Datalake 3.0 integration.
    """
    endpoint_configured = bool(DATALAKE_ENDPOINT)
    reachable = False

    if endpoint_configured:
        try:
            req = urllib.request.Request(DATALAKE_ENDPOINT, method="HEAD")
            if DATALAKE_API_KEY:
                req.add_header("Authorization", f"Bearer {DATALAKE_API_KEY}")
            with urllib.request.urlopen(req, timeout=5) as resp:
                reachable = resp.status < 500
        except Exception:
            reachable = False

    # Queue stats
    pending = 0
    pushed  = 0
    failed  = 0
    try:
        conn = sqlite3.connect(_QUEUE_DB, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            cur = conn.cursor()
            cur.execute("SELECT push_status, COUNT(*) AS cnt FROM datalake_event_queue GROUP BY push_status")
            for row in cur.fetchall():
                if row["push_status"] == "PENDING":
                    pending = row["cnt"]
                elif row["push_status"] == "PUSHED":
                    pushed = row["cnt"]
                elif row["push_status"] == "FAILED":
                    failed = row["cnt"]
        finally:
            conn.close()
    except Exception:
        pass

    return {
        "endpoint":    DATALAKE_ENDPOINT or "(not configured)",
        "configured":  endpoint_configured,
        "reachable":   reachable,
        "schema":      SCHEMA_VERSION,
        "queue": {
            "pending": pending,
            "pushed":  pushed,
            "failed":  failed,
        },
    }


def export_all_pending(limit: int = 10000) -> List[Dict[str, Any]]:
    """
    Exports all PENDING events as a list of formatted UEF-1.0 payloads for
    manual upload when completely airgapped (no network at all).
    """
    events = []
    try:
        conn = sqlite3.connect(_QUEUE_DB, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT payload_json FROM datalake_event_queue
                WHERE push_status IN ('PENDING', 'FAILED')
                ORDER BY id ASC
                LIMIT ?
            """, (limit,))
            for row in cur.fetchall():
                try:
                    events.append(json.loads(row["payload_json"]))
                except Exception:
                    pass
        finally:
            conn.close()
    except Exception as e:
        print(f"[DatalakeAdapter] Export error: {e}")
    return events
