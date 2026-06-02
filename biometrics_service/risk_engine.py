"""
risk_engine.py — FenceIN Edge AI Risk Scoring Engine
=====================================================
Assigns and maintains a live risk score (0–100) for every worker based on
their biometric and behavioural event history. All computation is local —
SQLite-backed, zero cloud dependency.

Risk factors and weights:
    FAILED_LIVENESS         +8   (failed passive liveness)
    SPOOF_ATTEMPT           +20  (confirmed anti-spoof failure)
    WATCHLIST_HIT           +40  (matched watchlist entry)
    GEOFENCE_VIOLATION      +12  (outside authorised zone)
    MULTIPLE_ID_ATTEMPT     +25  (tried different identities)
    UNUSUAL_ENTRY_TIME      +6   (access outside normal hours)
    FAILED_FACE_MATCH       +5   (failed recognition attempt)
    DUPLICATE_IDENTITY      +35  (ghost worker detected)
    CONTINUOUS_MONITOR_FAIL +15  (failed random re-verification)

Score decay: Risk score decays by 2 points per 24 hours of clean behaviour.

Risk levels:
    0  – 30   → LOW      (normal operations)
    31 – 55   → MEDIUM   (advisory monitoring)
    56 – 75   → HIGH     (security officer alert)
    76 – 100  → CRITICAL (block access, escalate)
"""

import os
import sqlite3
import datetime
import threading
from typing import Optional, Dict, Any, List

_CACHE_DIR = os.path.dirname(os.path.abspath(__file__))
_CACHE_DB  = os.path.join(_CACHE_DIR, "fencein_cache.db")

_lock = threading.Lock()

# ── Event weights ─────────────────────────────────────────────────────────────
EVENT_WEIGHTS: Dict[str, int] = {
    "FAILED_LIVENESS":         8,
    "SPOOF_ATTEMPT":           20,
    "WATCHLIST_HIT":           40,
    "GEOFENCE_VIOLATION":      12,
    "MULTIPLE_ID_ATTEMPT":     25,
    "UNUSUAL_ENTRY_TIME":      6,
    "FAILED_FACE_MATCH":       5,
    "DUPLICATE_IDENTITY":      35,
    "CONTINUOUS_MONITOR_FAIL": 15,
    "PPE_VIOLATION":           4,
}

# Decay: 2 points per 24 hours
DECAY_RATE_PER_HOUR = 2.0 / 24.0

_CREATE_RISK_LOG = """
CREATE TABLE IF NOT EXISTS worker_risk_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    tenant_id   TEXT,
    event_type  TEXT NOT NULL,
    weight      INTEGER NOT NULL,
    description TEXT,
    site_id     TEXT,
    created_at  TEXT NOT NULL
);
"""

_CREATE_RISK_SCORES = """
CREATE TABLE IF NOT EXISTS worker_risk_scores (
    user_id     TEXT PRIMARY KEY,
    tenant_id   TEXT,
    raw_score   REAL DEFAULT 0,
    risk_level  TEXT DEFAULT 'LOW',
    last_event  TEXT,
    last_updated TEXT NOT NULL
);
"""


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(_CACHE_DB, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init_risk_tables():
    """Creates risk tracking tables. Idempotent."""
    with _lock:
        c = _conn()
        try:
            c.executescript(_CREATE_RISK_LOG + _CREATE_RISK_SCORES)
            c.commit()
        finally:
            c.close()


def _risk_level(score: float) -> str:
    if score >= 76:
        return "CRITICAL"
    elif score >= 56:
        return "HIGH"
    elif score >= 31:
        return "MEDIUM"
    else:
        return "LOW"


def _compute_decayed_score(user_id: str, cur) -> float:
    """
    Computes the current decayed risk score from all logged events.
    Events contribute weight × decay_factor based on how old they are.
    """
    now = datetime.datetime.utcnow()
    cur.execute("""
        SELECT weight, created_at FROM worker_risk_log
        WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
        ORDER BY created_at DESC
    """, (user_id,))
    rows = cur.fetchall()

    total = 0.0
    for row in rows:
        try:
            event_time = datetime.datetime.fromisoformat(row["created_at"])
            hours_ago = max(0.0, (now - event_time).total_seconds() / 3600.0)
            decay = max(0.0, 1.0 - DECAY_RATE_PER_HOUR * hours_ago)
            total += row["weight"] * decay
        except Exception:
            pass

    return min(100.0, round(total, 2))


def update_risk_score(
    user_id: str,
    event_type: str,
    tenant_id: Optional[str] = None,
    description: Optional[str] = None,
    site_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Records a risk event and recomputes the worker's current risk score.

    Args:
        user_id:    Worker's ID
        event_type: One of the keys in EVENT_WEIGHTS
        tenant_id:  Tenant context
        description: Human-readable event detail
        site_id:    Site where event occurred

    Returns:
        { user_id, risk_score, risk_level, event_type, weight, should_alert }
    """
    weight = EVENT_WEIGHTS.get(event_type, 5)
    now = datetime.datetime.utcnow().isoformat()

    with _lock:
        c = _conn()
        try:
            cur = c.cursor()

            # Log the event
            cur.execute("""
                INSERT INTO worker_risk_log
                    (user_id, tenant_id, event_type, weight, description, site_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, tenant_id, event_type, weight, description, site_id, now))

            # Recompute decayed score
            score = _compute_decayed_score(user_id, cur)
            level = _risk_level(score)

            # Upsert risk score summary
            cur.execute("""
                INSERT INTO worker_risk_scores
                    (user_id, tenant_id, raw_score, risk_level, last_event, last_updated)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    raw_score    = excluded.raw_score,
                    risk_level   = excluded.risk_level,
                    last_event   = excluded.last_event,
                    last_updated = excluded.last_updated
            """, (user_id, tenant_id, score, level, event_type, now))

            c.commit()

            return {
                "user_id":      user_id,
                "risk_score":   score,
                "risk_level":   level,
                "event_type":   event_type,
                "weight_added": weight,
                "should_alert": level in ("HIGH", "CRITICAL"),
                "should_block": level == "CRITICAL",
            }
        finally:
            c.close()


def get_risk_score(user_id: str) -> Dict[str, Any]:
    """
    Returns the current risk score and recent event history for a worker.
    Applies decay to the stored score for freshness.
    """
    with _lock:
        c = _conn()
        try:
            cur = c.cursor()

            # Recompute live (with decay)
            score = _compute_decayed_score(user_id, cur)
            level = _risk_level(score)

            # Recent events (last 7 days)
            cur.execute("""
                SELECT event_type, weight, description, site_id, created_at
                FROM worker_risk_log
                WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
                ORDER BY created_at DESC LIMIT 20
            """, (user_id,))
            recent_events = [dict(r) for r in cur.fetchall()]

            # Event counts
            cur.execute("""
                SELECT event_type, COUNT(*) AS cnt
                FROM worker_risk_log
                WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
                GROUP BY event_type ORDER BY cnt DESC
            """, (user_id,))
            event_summary = {r["event_type"]: r["cnt"] for r in cur.fetchall()}

            return {
                "user_id":       user_id,
                "risk_score":    score,
                "risk_level":    level,
                "should_alert":  level in ("HIGH", "CRITICAL"),
                "should_block":  level == "CRITICAL",
                "recent_events": recent_events,
                "event_summary": event_summary,
                "score_legend": {
                    "LOW":      "0–30",
                    "MEDIUM":   "31–55",
                    "HIGH":     "56–75",
                    "CRITICAL": "76–100",
                },
            }
        finally:
            c.close()


def get_high_risk_workers(tenant_id: Optional[str] = None, min_level: str = "HIGH") -> List[Dict[str, Any]]:
    """Returns all workers at or above the specified risk level."""
    target_levels = {
        "LOW":      ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "MEDIUM":   ["MEDIUM", "HIGH", "CRITICAL"],
        "HIGH":     ["HIGH", "CRITICAL"],
        "CRITICAL": ["CRITICAL"],
    }.get(min_level, ["HIGH", "CRITICAL"])

    placeholders = ",".join("?" * len(target_levels))
    with _lock:
        c = _conn()
        try:
            if tenant_id:
                rows = c.execute(f"""
                    SELECT user_id, tenant_id, raw_score, risk_level, last_event, last_updated
                    FROM worker_risk_scores
                    WHERE risk_level IN ({placeholders}) AND tenant_id = ?
                    ORDER BY raw_score DESC
                """, (*target_levels, tenant_id)).fetchall()
            else:
                rows = c.execute(f"""
                    SELECT user_id, tenant_id, raw_score, risk_level, last_event, last_updated
                    FROM worker_risk_scores
                    WHERE risk_level IN ({placeholders})
                    ORDER BY raw_score DESC
                """, target_levels).fetchall()
            return [dict(r) for r in rows]
        finally:
            c.close()


def get_continuous_monitor_queue(tenant_id: str, sample_size: int = 5) -> List[str]:
    """
    Returns a list of user_ids that should be randomly re-verified for
    continuous identity monitoring. Prioritises high-risk workers.

    Logic:
        - Always include CRITICAL and HIGH risk workers
        - Fill remaining slots with recent check-in workers (random sample)
    """
    import random
    with _lock:
        c = _conn()
        try:
            # High-risk workers
            priority = [r["user_id"] for r in c.execute("""
                SELECT user_id FROM worker_risk_scores
                WHERE risk_level IN ('HIGH', 'CRITICAL') AND tenant_id = ?
            """, (tenant_id,)).fetchall()]

            # Recent active workers (checked in today)
            recent = [r["user_id"] for r in c.execute("""
                SELECT DISTINCT user_id FROM worker_journey
                WHERE tenant_id = ?
                  AND event_type = 'ENTRY'
                  AND created_at >= datetime('now', '-8 hours')
                  AND user_id NOT IN ({})
            """.format(",".join("?" * len(priority)) if priority else "''"),
                (tenant_id, *priority)).fetchall()]

            # Fill to sample_size
            pool = priority + random.sample(recent, min(len(recent), max(0, sample_size - len(priority))))
            return pool[:sample_size]
        except Exception:
            return []
        finally:
            c.close()
