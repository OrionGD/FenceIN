"""
watchlist.py — FenceIN Offline Watchlist Engine
================================================
Maintains a local SQLite watchlist of blacklisted workers, suspended
contractors, security threats, and expired employees. Performs entirely
offline face-embedding similarity scans against this list at every gate
check-in — no internet required.

Watchlist entry types:
    BLACKLISTED      — permanently banned workers
    SUSPENDED        — temporarily suspended (still tracked)
    SECURITY_THREAT  — known bad actors, trespassers
    EXPIRED_CONTRACT — contractor whose engagement has ended
    GHOST_WORKER     — duplicate identity detected across sites

Incident types generated:
    BLACKLISTED_PERSON_DETECTED
    SUSPENDED_WORKER_ATTEMPT
    SECURITY_THREAT_DETECTED
    GHOST_WORKER_DETECTED
    UNKNOWN_PERSON_AT_GATE
"""

import os
import json
import sqlite3
import datetime
import threading
import numpy as np
from typing import Optional, Dict, Any, List

_CACHE_DIR = os.path.dirname(os.path.abspath(__file__))
_CACHE_DB  = os.path.join(_CACHE_DIR, "fencein_cache.db")

_lock = threading.Lock()

# Similarity threshold for a watchlist hit
WATCHLIST_THRESHOLD = 0.70

_CREATE_WATCHLIST_TABLE = """
CREATE TABLE IF NOT EXISTS watchlist_entries (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        TEXT,
    tenant_id      TEXT,
    entry_type     TEXT NOT NULL,
    reason         TEXT,
    severity       TEXT DEFAULT 'HIGH',
    embedding_json TEXT,
    first_name     TEXT,
    last_name      TEXT,
    photo_ref      TEXT,
    added_by       TEXT,
    expires_at     TEXT,
    is_active      INTEGER DEFAULT 1,
    created_at     TEXT NOT NULL
);
"""

_CREATE_WATCHLIST_HITS_TABLE = """
CREATE TABLE IF NOT EXISTS watchlist_hits (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id    INTEGER,
    scanned_user_id TEXT,
    confidence      REAL,
    site_id         TEXT,
    kiosk_id        TEXT,
    tenant_id       TEXT,
    action_taken    TEXT,
    created_at      TEXT NOT NULL
);
"""


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(_CACHE_DB, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init_watchlist_tables():
    """Creates watchlist tables. Safe to call multiple times (idempotent)."""
    with _lock:
        c = _conn()
        try:
            c.executescript(_CREATE_WATCHLIST_TABLE + _CREATE_WATCHLIST_HITS_TABLE)
            c.commit()
        finally:
            c.close()


def add_to_watchlist(
    entry_type: str,
    reason: str,
    severity: str = "HIGH",
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    embedding: Optional[list] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    added_by: Optional[str] = None,
    expires_at: Optional[str] = None,
) -> int:
    """
    Adds an entry to the offline watchlist.

    Args:
        entry_type: One of BLACKLISTED, SUSPENDED, SECURITY_THREAT, EXPIRED_CONTRACT, GHOST_WORKER
        reason:     Human-readable reason for watchlisting
        severity:   LOW | MEDIUM | HIGH | CRITICAL
        user_id:    Known user ID (if registered in system)
        embedding:  512D face embedding for unknown persons
        expires_at: ISO datetime string, or None for permanent

    Returns:
        The SQLite row ID of the new entry.
    """
    now = datetime.datetime.utcnow().isoformat()
    emb_json = json.dumps(embedding) if embedding else None

    with _lock:
        c = _conn()
        try:
            cur = c.cursor()
            cur.execute("""
                INSERT INTO watchlist_entries
                    (user_id, tenant_id, entry_type, reason, severity,
                     embedding_json, first_name, last_name, added_by, expires_at,
                     is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (user_id, tenant_id, entry_type, reason, severity,
                  emb_json, first_name, last_name, added_by, expires_at, now))
            c.commit()
            return cur.lastrowid
        finally:
            c.close()


def remove_from_watchlist(entry_id: int) -> bool:
    """Deactivates a watchlist entry (soft delete — preserves audit trail)."""
    with _lock:
        c = _conn()
        try:
            c.execute("UPDATE watchlist_entries SET is_active = 0 WHERE id = ?", (entry_id,))
            c.commit()
            return True
        except Exception:
            return False
        finally:
            c.close()


def get_watchlist(tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns all active watchlist entries, optionally filtered by tenant."""
    with _lock:
        c = _conn()
        try:
            if tenant_id:
                cur = c.execute("""
                    SELECT id, user_id, tenant_id, entry_type, reason, severity,
                           first_name, last_name, added_by, expires_at, created_at
                    FROM watchlist_entries
                    WHERE is_active = 1 AND (tenant_id = ? OR tenant_id IS NULL)
                    ORDER BY severity DESC, created_at DESC
                """, (tenant_id,))
            else:
                cur = c.execute("""
                    SELECT id, user_id, tenant_id, entry_type, reason, severity,
                           first_name, last_name, added_by, expires_at, created_at
                    FROM watchlist_entries
                    WHERE is_active = 1
                    ORDER BY severity DESC, created_at DESC
                """)
            return [dict(row) for row in cur.fetchall()]
        finally:
            c.close()


def scan_against_watchlist(
    query_embedding: list,
    tenant_id: Optional[str] = None,
    site_id: Optional[str] = None,
    kiosk_id: Optional[str] = None,
    scanned_user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Performs a 1:N cosine similarity scan of the live face embedding against
    all active watchlist entries that have stored embeddings.

    Args:
        query_embedding:  Live face embedding (512D list of floats)
        tenant_id:        Tenant scope for the scan
        site_id:          Site where scan occurred (for incident logging)
        scanned_user_id:  User ID if known (for incident correlation)

    Returns:
        {
            matched:      bool,
            threat_level: str | None,
            confidence:   float,
            entry:        dict | None,      # Matched watchlist entry
            incident_type: str | None,
            alert_message: str,
        }
    """
    now = datetime.datetime.utcnow().isoformat()
    query_vec = np.array(query_embedding, dtype=np.float32)
    qn = np.linalg.norm(query_vec)
    if qn == 0:
        return _no_hit_result()

    query_vec = query_vec / qn

    best_confidence = 0.0
    best_entry = None

    with _lock:
        c = _conn()
        try:
            if tenant_id:
                rows = c.execute("""
                    SELECT * FROM watchlist_entries
                    WHERE is_active = 1
                      AND embedding_json IS NOT NULL
                      AND (tenant_id = ? OR tenant_id IS NULL)
                      AND (expires_at IS NULL OR expires_at > ?)
                """, (tenant_id, now)).fetchall()
            else:
                rows = c.execute("""
                    SELECT * FROM watchlist_entries
                    WHERE is_active = 1
                      AND embedding_json IS NOT NULL
                      AND (expires_at IS NULL OR expires_at > ?)
                """, (now,)).fetchall()

            for row in rows:
                try:
                    emb = np.array(json.loads(row["embedding_json"]), dtype=np.float32)
                    n = np.linalg.norm(emb)
                    if n == 0:
                        continue
                    emb = emb / n
                    conf = float(np.dot(query_vec, emb))
                    if conf > best_confidence:
                        best_confidence = conf
                        best_entry = dict(row)
                except Exception:
                    continue

            if best_confidence >= WATCHLIST_THRESHOLD and best_entry:
                # Log the hit
                incident_type = _incident_type_for(best_entry["entry_type"])
                c.execute("""
                    INSERT INTO watchlist_hits
                        (watchlist_id, scanned_user_id, confidence, site_id, kiosk_id,
                         tenant_id, action_taken, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (best_entry["id"], scanned_user_id, best_confidence,
                      site_id, kiosk_id, tenant_id, "ALERT_RAISED", now))
                c.commit()

                # Remove embedding from return payload for privacy
                safe_entry = {k: v for k, v in best_entry.items() if k != "embedding_json"}

                return {
                    "matched":       True,
                    "threat_level":  best_entry["severity"],
                    "confidence":    round(best_confidence, 4),
                    "entry":         safe_entry,
                    "incident_type": incident_type,
                    "alert_message": _alert_message(best_entry),
                }
        finally:
            c.close()

    return _no_hit_result()


def sync_watchlist_from_pg(pg_conn) -> Dict[str, Any]:
    """
    Pulls blacklisted/suspended/terminated users from PostgreSQL and syncs
    their face embeddings to the local watchlist for offline checking.

    Args:
        pg_conn: Active psycopg2 connection.
    """
    synced = 0
    now = datetime.datetime.utcnow().isoformat()
    try:
        with pg_conn.cursor() as cur:
            cur.execute("""
                SELECT id, "tenantId" AS tenant_id, "firstName" AS first_name,
                       "lastName" AS last_name, state, "faceEmbedding"::text AS emb_text
                FROM users
                WHERE state IN ('BLACKLISTED', 'SUSPENDED', 'TERMINATED')
                  AND "faceEmbedding" IS NOT NULL
            """)
            rows = cur.fetchall()

        with _lock:
            c = _conn()
            try:
                for row in rows:
                    emb_text = row["emb_text"]
                    if not emb_text:
                        continue
                    emb_list = [float(x) for x in emb_text.strip("[]").split(",")]
                    emb_json = json.dumps(emb_list)
                    entry_type = {
                        "BLACKLISTED": "BLACKLISTED",
                        "SUSPENDED":   "SUSPENDED",
                        "TERMINATED":  "EXPIRED_CONTRACT",
                    }.get(row["state"], "SUSPENDED")

                    # Upsert by user_id
                    c.execute("""
                        INSERT INTO watchlist_entries
                            (user_id, tenant_id, entry_type, reason, severity,
                             embedding_json, first_name, last_name, is_active, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                        ON CONFLICT DO NOTHING
                    """, (row["id"], row["tenant_id"], entry_type,
                          f"Auto-synced from system state: {row['state']}",
                          "HIGH" if row["state"] == "BLACKLISTED" else "MEDIUM",
                          emb_json, row["first_name"], row["last_name"], now))
                    synced += 1
                c.commit()
            finally:
                c.close()
    except Exception as e:
        print(f"[Watchlist] Sync error: {e}")

    return {"synced": synced, "timestamp": now}


def _incident_type_for(entry_type: str) -> str:
    return {
        "BLACKLISTED":       "BLACKLISTED_PERSON_DETECTED",
        "SUSPENDED":         "SUSPENDED_WORKER_ATTEMPT",
        "SECURITY_THREAT":   "SECURITY_THREAT_DETECTED",
        "EXPIRED_CONTRACT":  "EXPIRED_CONTRACT_ATTEMPT",
        "GHOST_WORKER":      "GHOST_WORKER_DETECTED",
    }.get(entry_type, "WATCHLIST_HIT")


def _alert_message(entry: dict) -> str:
    name = f"{entry.get('first_name', '')} {entry.get('last_name', '')}".strip() or "Unknown Person"
    return (
        f"⚠️  WATCHLIST ALERT: {entry['entry_type']} — {name}. "
        f"Reason: {entry.get('reason', 'N/A')}. "
        f"Severity: {entry.get('severity', 'HIGH')}. Notify security immediately."
    )


def _no_hit_result() -> Dict[str, Any]:
    return {
        "matched":       False,
        "threat_level":  None,
        "confidence":    0.0,
        "entry":         None,
        "incident_type": None,
        "alert_message": "No watchlist match found.",
    }
