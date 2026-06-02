"""
journey_tracker.py — Worker Journey Tracking, Offline Analytics & Site Health
==============================================================================
Records and analyses worker movement throughout a site (entry → zone → exit),
computes offline site intelligence dashboards, and derives the AI Site Health
Score — all stored in SQLite with zero network dependency.

Worker Journey Events:
    ENTRY        — worker scanned in at main gate
    ZONE_CHANGE  — worker moved between authorised zones
    EXIT         — worker scanned out at main gate
    RE_VERIFY    — continuous monitoring re-verification event
    BREAK_START  — worker left work zone (break tracking)
    BREAK_END    — worker returned to work zone

Site Intelligence (offline daily):
    - Expected workers vs Present vs Absent vs Late
    - Average entry time
    - PPE compliance rate
    - Liveness failure rate
    - Geofence violation count
    - Average trust score

AI Site Health Score (0–100):
    Composite of attendance rate, PPE compliance, security incidents,
    liveness pass rate, and trust score averages.
"""

import os
import json
import sqlite3
import datetime
import threading
import math
from typing import Optional, Dict, Any, List

_CACHE_DIR = os.path.dirname(os.path.abspath(__file__))
_CACHE_DB  = os.path.join(_CACHE_DIR, "fencein_cache.db")

_lock = threading.Lock()

_CREATE_JOURNEY_TABLE = """
CREATE TABLE IF NOT EXISTS worker_journey (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    tenant_id   TEXT,
    site_id     TEXT,
    zone_id     TEXT,
    event_type  TEXT NOT NULL,
    confidence  REAL,
    trust_score REAL,
    ppe_compliant INTEGER DEFAULT 0,
    liveness_pass INTEGER DEFAULT 1,
    auth_method TEXT,
    entry_hour  INTEGER,
    created_at  TEXT NOT NULL
);
"""

_CREATE_SITE_SNAPSHOT = """
CREATE TABLE IF NOT EXISTS site_snapshots (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id           TEXT NOT NULL,
    tenant_id         TEXT,
    snapshot_date     TEXT NOT NULL,
    expected_count    INTEGER DEFAULT 0,
    present_count     INTEGER DEFAULT 0,
    absent_count      INTEGER DEFAULT 0,
    late_count        INTEGER DEFAULT 0,
    avg_trust_score   REAL DEFAULT 0,
    ppe_compliant_pct REAL DEFAULT 0,
    liveness_fail_cnt INTEGER DEFAULT 0,
    geofence_viol_cnt INTEGER DEFAULT 0,
    incident_count    INTEGER DEFAULT 0,
    site_health_score REAL DEFAULT 0,
    computed_at       TEXT NOT NULL
);
"""


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(_CACHE_DB, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init_journey_tables():
    """Creates journey and snapshot tables. Idempotent."""
    with _lock:
        c = _conn()
        try:
            c.executescript(_CREATE_JOURNEY_TABLE + _CREATE_SITE_SNAPSHOT)
            c.commit()
        finally:
            c.close()


def record_journey_event(
    user_id: str,
    event_type: str,
    *,
    tenant_id: Optional[str] = None,
    site_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    confidence: float = 0.0,
    trust_score: float = 0.0,
    ppe_compliant: bool = True,
    liveness_pass: bool = True,
    auth_method: str = "FACE",
) -> int:
    """
    Records a worker journey event (entry, zone change, exit, etc.).

    Returns: SQLite row ID of the inserted event.
    """
    now = datetime.datetime.utcnow()
    now_str = now.isoformat()
    entry_hour = now.hour

    with _lock:
        c = _conn()
        try:
            cur = c.cursor()
            cur.execute("""
                INSERT INTO worker_journey
                    (user_id, tenant_id, site_id, zone_id, event_type,
                     confidence, trust_score, ppe_compliant, liveness_pass,
                     auth_method, entry_hour, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, tenant_id, site_id, zone_id, event_type,
                  confidence, trust_score,
                  1 if ppe_compliant else 0,
                  1 if liveness_pass else 0,
                  auth_method, entry_hour, now_str))
            c.commit()
            return cur.lastrowid
        finally:
            c.close()


def get_worker_timeline(
    user_id: str,
    date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Returns a complete movement timeline for a worker on a given date.

    Args:
        user_id: Worker ID
        date:    ISO date string 'YYYY-MM-DD' (defaults to today UTC)

    Returns:
        { user_id, date, events: [...], summary: {...} }
    """
    if date is None:
        date = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    with _lock:
        c = _conn()
        try:
            events = [dict(r) for r in c.execute("""
                SELECT event_type, site_id, zone_id, confidence, trust_score,
                       ppe_compliant, liveness_pass, auth_method, created_at
                FROM worker_journey
                WHERE user_id = ?
                  AND created_at >= ? AND created_at < ?
                ORDER BY created_at ASC
            """, (user_id, f"{date}T00:00:00", f"{date}T23:59:59")).fetchall()]

            # Summary
            entries = [e for e in events if e["event_type"] == "ENTRY"]
            exits   = [e for e in events if e["event_type"] == "EXIT"]
            zones   = [e for e in events if e["event_type"] == "ZONE_CHANGE"]

            first_entry = entries[0]["created_at"] if entries else None
            last_exit   = exits[-1]["created_at"]  if exits   else None

            total_seconds = 0
            if first_entry and last_exit:
                try:
                    t_in  = datetime.datetime.fromisoformat(first_entry)
                    t_out = datetime.datetime.fromisoformat(last_exit)
                    total_seconds = int((t_out - t_in).total_seconds())
                except Exception:
                    pass

            avg_trust = 0.0
            trust_events = [e for e in events if e["trust_score"]]
            if trust_events:
                avg_trust = round(sum(e["trust_score"] for e in trust_events) / len(trust_events), 4)

            return {
                "user_id": user_id,
                "date":    date,
                "events":  events,
                "summary": {
                    "first_entry":      first_entry,
                    "last_exit":        last_exit,
                    "time_on_site_sec": total_seconds,
                    "zone_changes":     len(zones),
                    "re_verifications": sum(1 for e in events if e["event_type"] == "RE_VERIFY"),
                    "avg_trust_score":  avg_trust,
                    "ppe_compliant_all": all(e["ppe_compliant"] for e in entries),
                },
            }
        finally:
            c.close()


def get_site_intelligence(
    site_id: str,
    tenant_id: Optional[str] = None,
    date: Optional[str] = None,
    expected_count: int = 0,
    shift_start_hour: int = 6,
    late_threshold_minutes: int = 30,
) -> Dict[str, Any]:
    """
    Computes an offline daily site intelligence snapshot.

    Returns:
        {
            site_id, date,
            expected_count, present_count, absent_count, late_count,
            attendance_rate, avg_trust_score, ppe_compliant_pct,
            liveness_fail_count, workers_on_site: [...],
        }
    """
    if date is None:
        date = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    late_cutoff_hour = shift_start_hour
    late_cutoff_min  = late_threshold_minutes

    with _lock:
        c = _conn()
        try:
            base_q = """
                FROM worker_journey
                WHERE site_id = ?
                  AND created_at >= ? AND created_at < ?
                  AND event_type = 'ENTRY'
            """
            params_base = (site_id, f"{date}T00:00:00", f"{date}T23:59:59")

            # Present workers
            present_ids = [r["user_id"] for r in c.execute(
                f"SELECT DISTINCT user_id {base_q}", params_base).fetchall()]
            present_count = len(present_ids)

            # Late workers (entry after shift_start + grace)
            late_time = (datetime.datetime(2000, 1, 1, shift_start_hour, 0) +
                         datetime.timedelta(minutes=late_threshold_minutes)).strftime("%H:%M")
            late_ids = [r["user_id"] for r in c.execute(f"""
                SELECT DISTINCT user_id {base_q}
                  AND strftime('%H:%M', created_at) > ?
            """, (*params_base, late_time)).fetchall()]
            late_count = len(late_ids)

            absent_count = max(0, expected_count - present_count)
            attendance_rate = round(present_count / expected_count, 4) if expected_count > 0 else 0.0

            # Average trust score
            trust_row = c.execute(f"""
                SELECT AVG(trust_score) AS avg_t {base_q}
                  AND trust_score > 0
            """, params_base).fetchone()
            avg_trust = round(float(trust_row["avg_t"] or 0), 4)

            # PPE compliance
            ppe_row = c.execute(f"""
                SELECT COUNT(*) AS total,
                       SUM(ppe_compliant) AS compliant
                {base_q}
            """, params_base).fetchone()
            ppe_total    = int(ppe_row["total"] or 1)
            ppe_compliant = int(ppe_row["compliant"] or 0)
            ppe_pct       = round(ppe_compliant / ppe_total, 4)

            # Liveness failures today
            live_fail = c.execute("""
                SELECT COUNT(*) AS cnt FROM worker_journey
                WHERE site_id = ?
                  AND created_at >= ? AND created_at < ?
                  AND liveness_pass = 0
            """, (site_id, f"{date}T00:00:00", f"{date}T23:59:59")).fetchone()["cnt"]

            # Current workers on site (entered but not exited)
            on_site = [r["user_id"] for r in c.execute("""
                SELECT DISTINCT j1.user_id FROM worker_journey j1
                WHERE j1.site_id = ?
                  AND j1.event_type = 'ENTRY'
                  AND j1.created_at >= ?
                  AND NOT EXISTS (
                      SELECT 1 FROM worker_journey j2
                      WHERE j2.user_id = j1.user_id
                        AND j2.site_id = j1.site_id
                        AND j2.event_type = 'EXIT'
                        AND j2.created_at >= j1.created_at
                  )
            """, (site_id, f"{date}T00:00:00")).fetchall()]

            return {
                "site_id":            site_id,
                "date":               date,
                "expected_count":     expected_count,
                "present_count":      present_count,
                "absent_count":       absent_count,
                "late_count":         late_count,
                "attendance_rate":    attendance_rate,
                "avg_trust_score":    avg_trust,
                "ppe_compliant_pct":  ppe_pct,
                "liveness_fail_count": int(live_fail),
                "workers_on_site":    on_site,
                "workers_on_site_count": len(on_site),
            }
        finally:
            c.close()


def compute_site_health_score(
    site_id: str,
    tenant_id: Optional[str] = None,
    date: Optional[str] = None,
    expected_count: int = 0,
) -> Dict[str, Any]:
    """
    Computes the AI Site Health Score (0–100) for an NHAI highway site.

    Factors:
        Attendance Rate        × 30
        PPE Compliance Rate    × 25
        Avg Trust Score        × 20
        Security (low incident) × 15
        Liveness Pass Rate     × 10

    Returns:
        { site_id, date, health_score, health_grade, breakdown, recommendations }
    """
    if date is None:
        date = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    intel = get_site_intelligence(site_id, tenant_id, date, expected_count)

    # Component scores (0.0–1.0)
    attendance_score = intel["attendance_rate"]
    ppe_score        = intel["ppe_compliant_pct"]
    trust_score      = intel["avg_trust_score"]

    # Liveness pass rate
    with _lock:
        c = _conn()
        try:
            total_entries = c.execute("""
                SELECT COUNT(*) AS cnt FROM worker_journey
                WHERE site_id = ? AND event_type = 'ENTRY'
                  AND created_at >= ? AND created_at < ?
            """, (site_id, f"{date}T00:00:00", f"{date}T23:59:59")).fetchone()["cnt"]
            liveness_ok = c.execute("""
                SELECT COUNT(*) AS cnt FROM worker_journey
                WHERE site_id = ? AND event_type = 'ENTRY' AND liveness_pass = 1
                  AND created_at >= ? AND created_at < ?
            """, (site_id, f"{date}T00:00:00", f"{date}T23:59:59")).fetchone()["cnt"]
            incident_count = c.execute("""
                SELECT COUNT(*) AS cnt FROM worker_risk_log
                WHERE site_id = ?
                  AND created_at >= ? AND created_at < ?
                  AND event_type IN ('SPOOF_ATTEMPT', 'WATCHLIST_HIT', 'GEOFENCE_VIOLATION')
            """, (site_id, f"{date}T00:00:00", f"{date}T23:59:59")).fetchone()["cnt"]
        finally:
            c.close()

    liveness_rate   = round(liveness_ok / max(total_entries, 1), 4)
    present_count   = intel["present_count"]
    # Security score: penalise per incident relative to workforce size
    incident_rate   = min(1.0, int(incident_count) / max(present_count, 1))
    security_score  = max(0.0, 1.0 - incident_rate)

    # Composite
    health = (
        attendance_score * 30 +
        ppe_score        * 25 +
        trust_score      * 20 +
        security_score   * 15 +
        liveness_rate    * 10
    )
    health = round(health, 2)

    # Grade
    if health >= 90:
        grade = "A+"
    elif health >= 80:
        grade = "A"
    elif health >= 70:
        grade = "B"
    elif health >= 55:
        grade = "C"
    else:
        grade = "D"

    # Recommendations
    recs = []
    if attendance_score < 0.80:
        recs.append("🔴 Attendance below 80% — investigate absenteeism.")
    if ppe_score < 0.90:
        recs.append("🟠 PPE compliance below 90% — enforce helmet/vest check at gate.")
    if liveness_rate < 0.95:
        recs.append("🟡 Liveness failures detected — check camera quality and lighting.")
    if security_score < 0.90:
        recs.append("🔴 Security incidents detected — review watchlist and audit access logs.")
    if trust_score < 0.70:
        recs.append("🟠 Low average trust score — calibrate GPS accuracy and device registration.")
    if not recs:
        recs.append("✅ Site operating within all normal parameters.")

    return {
        "site_id":      site_id,
        "date":         date,
        "health_score": health,
        "health_grade": grade,
        "breakdown": {
            "attendance":  round(attendance_score * 30, 2),
            "ppe":         round(ppe_score        * 25, 2),
            "trust":       round(trust_score      * 20, 2),
            "security":    round(security_score   * 15, 2),
            "liveness":    round(liveness_rate    * 10, 2),
        },
        "raw_scores": {
            "attendance_rate":   attendance_score,
            "ppe_compliant_pct": ppe_score,
            "avg_trust_score":   trust_score,
            "security_score":    security_score,
            "liveness_pass_rate": liveness_rate,
        },
        "intelligence": intel,
        "recommendations": recs,
    }
