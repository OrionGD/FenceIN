"""
trust_engine.py — FenceIN Multi-Factor Identity Confidence Engine
==================================================================
Computes a composite Identity Trust Score from five independent signals,
replacing the binary "Face Match = Access Granted" model with a calibrated
confidence band that accounts for liveness, GPS location, device trust, and
historical behaviour patterns — all computed entirely offline.

Trust Score Formula:
    T = (F × 0.40) + (L × 0.25) + (G × 0.15) + (D × 0.10) + (B × 0.10)

    F = Face matching confidence  (0.0 – 1.0)
    L = Liveness composite score  (0.0 – 1.0)
    G = GPS / Geofence confidence (0.0 – 1.0)
    D = Device trust score        (0.0 – 1.0)
    B = Behavioural pattern score (0.0 – 1.0)

Gate Decision Bands:
    ≥ 0.80  → GRANTED          (high-confidence pass)
    0.60–0.80 → GRANTED_LOW    (pass with logged advisory)
    0.45–0.60 → MANUAL_REVIEW  (security officer confirmation required)
    < 0.45  → DENIED           (blocked, incident created)
"""

import math
import datetime
import sqlite3
import os
from typing import Optional, Dict, Any

_CACHE_DIR = os.path.dirname(os.path.abspath(__file__))
_CACHE_DB  = os.path.join(_CACHE_DIR, "fencein_cache.db")

# ── Weight constants ──────────────────────────────────────────────────────────
W_FACE     = 0.40
W_LIVENESS = 0.25
W_GPS      = 0.15
W_DEVICE   = 0.10
W_BEHAVIOR = 0.10

# ── Gate decision thresholds ─────────────────────────────────────────────────
BAND_GRANTED        = 0.80
BAND_GRANTED_LOW    = 0.60
BAND_MANUAL_REVIEW  = 0.45


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns great-circle distance in metres between two GPS coordinates."""
    R = 6_371_000.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_gps_confidence(
    worker_lat: Optional[float],
    worker_lon: Optional[float],
    site_lat: Optional[float],
    site_lon: Optional[float],
    site_radius_m: float = 100.0,
) -> float:
    """
    Computes GPS geofence confidence (0.0–1.0).

    Returns:
        1.0  — worker is within the authorised site radius
        0.5  — GPS data unavailable (neutral)
        0.0  — worker is clearly outside radius (>3× radius)
        Interpolated between 0.0 and 1.0 for border cases.
    """
    if worker_lat is None or worker_lon is None or site_lat is None or site_lon is None:
        return 0.5  # no GPS → neutral, not penalised but not rewarded

    dist = _haversine_distance(worker_lat, worker_lon, site_lat, site_lon)
    if dist <= site_radius_m:
        return 1.0
    elif dist >= site_radius_m * 3:
        return 0.0
    else:
        # Linear falloff between 1× and 3× radius
        overshoot = (dist - site_radius_m) / (site_radius_m * 2)
        return round(max(0.0, 1.0 - overshoot), 4)


def compute_device_trust(
    device_id: Optional[str],
    tenant_id: Optional[str],
    known_device_ids: Optional[list] = None,
) -> float:
    """
    Computes device trust score (0.0–1.0).

    Scoring rules:
        1.0 — device_id matches a known registered kiosk or device
        0.7 — device_id present but not in known list (new device)
        0.4 — no device_id provided (anonymous browser/mobile)
    """
    if not device_id:
        return 0.4

    if known_device_ids and device_id in known_device_ids:
        return 1.0

    # Try to look up from SQLite kiosk cache
    try:
        conn = sqlite3.connect(_CACHE_DB, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*) AS cnt FROM known_devices
            WHERE device_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
        """, (device_id, tenant_id))
        row = cur.fetchone()
        conn.close()
        if row and row["cnt"] > 0:
            return 1.0
    except Exception:
        pass

    return 0.7  # device present, unknown — slightly suspicious but not blocked


def compute_behaviour_score(user_id: str, current_hour: Optional[int] = None) -> float:
    """
    Computes behavioural pattern confidence (0.0–1.0) from historical attendance.

    Signals:
        - Historical check-in hour matches expected shift window → boost
        - Worker has recent successful check-ins (last 7 days) → trust boost
        - Worker has recent failed liveness / risk events → penalty

    Falls back to 0.75 (neutral-positive) if no history available.
    """
    if current_hour is None:
        current_hour = datetime.datetime.utcnow().hour

    base_score = 0.75

    try:
        conn = sqlite3.connect(_CACHE_DB, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Successful check-ins in last 7 days → confidence
        cur.execute("""
            SELECT COUNT(*) AS cnt FROM worker_journey
            WHERE user_id = ?
              AND event_type = 'ENTRY'
              AND created_at >= datetime('now', '-7 days')
        """, (user_id,))
        recent_entries = cur.fetchone()["cnt"]

        # Risk events in last 48 hours → penalty
        cur.execute("""
            SELECT SUM(weight) AS total_weight FROM worker_risk_log
            WHERE user_id = ?
              AND created_at >= datetime('now', '-2 days')
        """, (user_id,))
        recent_risk_row = cur.fetchone()
        recent_risk = float(recent_risk_row["total_weight"] or 0)

        # Typical entry hours from history
        cur.execute("""
            SELECT entry_hour FROM worker_journey
            WHERE user_id = ? AND event_type = 'ENTRY'
            ORDER BY created_at DESC LIMIT 30
        """, (user_id,))
        hour_rows = cur.fetchall()
        conn.close()

        # Boost for established worker
        if recent_entries >= 5:
            base_score = min(1.0, base_score + 0.10)
        elif recent_entries >= 2:
            base_score = min(1.0, base_score + 0.05)

        # Penalise recent risk events
        if recent_risk > 30:
            base_score = max(0.0, base_score - 0.20)
        elif recent_risk > 10:
            base_score = max(0.0, base_score - 0.10)

        # Time-of-day check — unusual hours penalty
        if hour_rows:
            typical_hours = [r["entry_hour"] for r in hour_rows]
            avg_hour = sum(typical_hours) / len(typical_hours)
            hour_deviation = abs(current_hour - avg_hour)
            if hour_deviation > 6:  # accessing 6+ hours outside normal pattern
                base_score = max(0.0, base_score - 0.15)

    except Exception:
        pass

    return round(base_score, 4)


def compute_trust_score(
    face_confidence: float,
    liveness_score: float,
    gps_confidence: float = 0.5,
    device_trust: float = 0.7,
    behaviour_score: float = 0.75,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes the composite Identity Trust Score and gate decision.

    Args:
        face_confidence:  Cosine similarity from face recognition (0.0–1.0)
        liveness_score:   Composite from check_liveness_texture (0.0–1.0)
        gps_confidence:   From compute_gps_confidence (0.0–1.0)
        device_trust:     From compute_device_trust (0.0–1.0)
        behaviour_score:  From compute_behaviour_score (0.0–1.0)
        user_id:          Optional; used to fetch real behaviour from SQLite

    Returns:
        {
            trust_score:      float,        # 0.0 – 1.0
            gate_decision:    str,          # GRANTED | GRANTED_LOW | MANUAL_REVIEW | DENIED
            confidence_band:  str,          # HIGH | MEDIUM | LOW | REJECTED
            breakdown: {
                face:      float,
                liveness:  float,
                gps:       float,
                device:    float,
                behavior:  float,
            },
            weighted: {
                face:      float,
                liveness:  float,
                gps:       float,
                device:    float,
                behavior:  float,
            },
            recommendation: str,
        }
    """
    # Clamp all inputs to [0, 1]
    F = max(0.0, min(1.0, float(face_confidence)))
    L = max(0.0, min(1.0, float(liveness_score)))
    G = max(0.0, min(1.0, float(gps_confidence)))
    D = max(0.0, min(1.0, float(device_trust)))
    B = max(0.0, min(1.0, float(behaviour_score)))

    if user_id:
        B = compute_behaviour_score(user_id)

    # Weighted composite
    score = (F * W_FACE) + (L * W_LIVENESS) + (G * W_GPS) + (D * W_DEVICE) + (B * W_BEHAVIOR)
    score = round(score, 4)

    # Gate decision
    if score >= BAND_GRANTED:
        gate = "GRANTED"
        band = "HIGH"
        recommendation = "Identity confirmed with high confidence. Access authorised."
    elif score >= BAND_GRANTED_LOW:
        gate = "GRANTED_LOW"
        band = "MEDIUM"
        recommendation = "Access granted with advisory. Security officer notified."
    elif score >= BAND_MANUAL_REVIEW:
        gate = "MANUAL_REVIEW"
        band = "LOW"
        recommendation = "Confidence insufficient. Security officer manual verification required."
    else:
        gate = "DENIED"
        band = "REJECTED"
        recommendation = "Identity not confirmed. Access denied. Incident logged."

    return {
        "trust_score":     score,
        "gate_decision":   gate,
        "confidence_band": band,
        "breakdown": {
            "face":     round(F, 4),
            "liveness": round(L, 4),
            "gps":      round(G, 4),
            "device":   round(D, 4),
            "behavior": round(B, 4),
        },
        "weighted": {
            "face":     round(F * W_FACE, 4),
            "liveness": round(L * W_LIVENESS, 4),
            "gps":      round(G * W_GPS, 4),
            "device":   round(D * W_DEVICE, 4),
            "behavior": round(B * W_BEHAVIOR, 4),
        },
        "weights": {
            "face": W_FACE, "liveness": W_LIVENESS,
            "gps": W_GPS, "device": W_DEVICE, "behavior": W_BEHAVIOR,
        },
        "recommendation": recommendation,
    }


def init_known_devices_table():
    """Creates the known_devices table in the SQLite cache if not present."""
    try:
        conn = sqlite3.connect(_CACHE_DB, check_same_thread=False)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS known_devices (
                device_id  TEXT NOT NULL,
                tenant_id  TEXT,
                kiosk_name TEXT,
                site_id    TEXT,
                registered_at TEXT,
                PRIMARY KEY (device_id, tenant_id)
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[TrustEngine] Device table init error: {e}")
