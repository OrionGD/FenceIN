"""
offline_cache.py — FenceIN Offline Embedding Cache
====================================================
Maintains a local SQLite mirror of all enrolled face embeddings so that
face-login and 1:1 verification continue to work even when the PostgreSQL
primary database is unreachable (zero-network zones, connectivity outages).

Design decisions:
- Uses Python's built-in sqlite3 — no additional dependencies.
- Embeddings stored as JSON-serialised float arrays (compact, no binary blobs).
- The cache is *read-only* during offline operation; enrollment always requires
  the primary DB to be reachable.
- Sync is idempotent: calling sync multiple times is safe.
- Thread-safe: all writes use a module-level threading.Lock.
"""

import os
import json
import sqlite3
import threading
import datetime
import numpy as np
from typing import List, Optional, Dict, Any

# ── Configuration ─────────────────────────────────────────────────────────────
_CACHE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DB_PATH = os.path.join(_CACHE_DIR, "fencein_cache.db")

_db_lock = threading.Lock()

# ── Schema ────────────────────────────────────────────────────────────────────
_CREATE_EMBEDDINGS_TABLE = """
CREATE TABLE IF NOT EXISTS face_embeddings (
    user_id         TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    first_name      TEXT,
    last_name       TEXT,
    email           TEXT,
    role            TEXT,
    embedding_json  TEXT NOT NULL,
    is_active       INTEGER DEFAULT 1,
    state           TEXT DEFAULT 'ACTIVE',
    face_registered INTEGER DEFAULT 1,
    fp_registered   INTEGER DEFAULT 0,
    synced_at       TEXT NOT NULL
);
"""

_CREATE_SYNC_LOG_TABLE = """
CREATE TABLE IF NOT EXISTS sync_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at   TEXT NOT NULL,
    record_count INTEGER NOT NULL,
    status      TEXT NOT NULL,
    note        TEXT
);
"""

_CREATE_EVENT_QUEUE_TABLE = """
CREATE TABLE IF NOT EXISTS datalake_event_queue (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type  TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    pushed_at   TEXT,
    push_status TEXT DEFAULT 'PENDING'
);
"""


def _get_connection() -> sqlite3.Connection:
    """Opens and returns a connection to the local SQLite cache database."""
    conn = sqlite3.connect(CACHE_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_cache():
    """
    Initialises the SQLite cache database, creating tables if they do not exist.
    Safe to call on every application start.
    """
    with _db_lock:
        conn = _get_connection()
        try:
            cur = conn.cursor()
            cur.executescript(
                _CREATE_EMBEDDINGS_TABLE +
                _CREATE_SYNC_LOG_TABLE +
                _CREATE_EVENT_QUEUE_TABLE
            )
            conn.commit()
            print("[OfflineCache] ✅ SQLite cache initialised:", CACHE_DB_PATH)
        except Exception as e:
            print(f"[OfflineCache] ⚠️  Init error: {e}")
        finally:
            conn.close()


def sync_embeddings_from_pg(pg_conn) -> Dict[str, Any]:
    """
    Pulls all enrolled face embeddings from PostgreSQL and upserts them into
    the local SQLite cache. Designed to run at startup and on-demand.

    Args:
        pg_conn: An active psycopg2 connection (caller is responsible for it).

    Returns:
        dict with 'synced', 'errors', and 'timestamp' fields.
    """
    synced = 0
    errors = 0
    try:
        with pg_conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id            AS user_id,
                    "tenantId"    AS tenant_id,
                    "firstName"   AS first_name,
                    "lastName"    AS last_name,
                    email,
                    "userRole"    AS role,
                    "faceEmbedding"::text AS embedding_text,
                    "isActive"    AS is_active,
                    state,
                    "faceRegistered"        AS face_registered,
                    "fingerprintRegistered"  AS fp_registered
                FROM users
                WHERE "faceRegistered" = TRUE
                  AND "faceEmbedding" IS NOT NULL
                  AND "isActive" = TRUE
            """)
            rows = cur.fetchall()

        now_str = datetime.datetime.utcnow().isoformat()

        with _db_lock:
            cache_conn = _get_connection()
            try:
                cache_cur = cache_conn.cursor()
                for row in rows:
                    try:
                        # PostgreSQL vector format: [0.1,0.2,...] — convert to JSON array
                        emb_text = row["embedding_text"]
                        if emb_text:
                            # Strip surrounding brackets and parse
                            emb_list = [float(x) for x in emb_text.strip("[]").split(",")]
                            emb_json = json.dumps(emb_list)
                        else:
                            continue

                        cache_cur.execute("""
                            INSERT INTO face_embeddings
                                (user_id, tenant_id, first_name, last_name, email, role,
                                 embedding_json, is_active, state, face_registered, fp_registered, synced_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(user_id) DO UPDATE SET
                                tenant_id       = excluded.tenant_id,
                                first_name      = excluded.first_name,
                                last_name       = excluded.last_name,
                                email           = excluded.email,
                                role            = excluded.role,
                                embedding_json  = excluded.embedding_json,
                                is_active       = excluded.is_active,
                                state           = excluded.state,
                                face_registered = excluded.face_registered,
                                fp_registered   = excluded.fp_registered,
                                synced_at       = excluded.synced_at
                        """, (
                            row["user_id"],
                            row["tenant_id"],
                            row["first_name"],
                            row["last_name"],
                            row["email"],
                            row["role"],
                            emb_json,
                            1 if row["is_active"] else 0,
                            row["state"],
                            1 if row["face_registered"] else 0,
                            1 if row["fp_registered"] else 0,
                            now_str,
                        ))
                        synced += 1
                    except Exception as row_err:
                        print(f"[OfflineCache] Row sync error for {row.get('user_id', '?')}: {row_err}")
                        errors += 1

                # Write sync log entry
                cache_cur.execute("""
                    INSERT INTO sync_log (synced_at, record_count, status, note)
                    VALUES (?, ?, ?, ?)
                """, (now_str, synced, "SUCCESS" if errors == 0 else "PARTIAL", f"{errors} errors"))

                cache_conn.commit()
                print(f"[OfflineCache] ✅ Synced {synced} embeddings ({errors} errors)")
            finally:
                cache_conn.close()

    except Exception as e:
        print(f"[OfflineCache] ❌ Sync failed: {e}")
        errors += 1

    return {"synced": synced, "errors": errors, "timestamp": datetime.datetime.utcnow().isoformat()}


def get_cached_embeddings(tenant_id: str) -> List[Dict[str, Any]]:
    """
    Returns all active cached face embeddings for the given tenant as a list of dicts.
    Each dict contains 'user_id', 'embedding' (list[float]), and user metadata.
    """
    results = []
    with _db_lock:
        conn = _get_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT user_id, tenant_id, first_name, last_name, email, role,
                       embedding_json, is_active, state, face_registered, fp_registered
                FROM face_embeddings
                WHERE tenant_id = ? AND is_active = 1 AND face_registered = 1
                  AND state NOT IN ('SUSPENDED', 'TERMINATED', 'BLACKLISTED')
            """, (tenant_id,))
            rows = cur.fetchall()
            for row in rows:
                try:
                    embedding = json.loads(row["embedding_json"])
                    results.append({
                        "user_id":        row["user_id"],
                        "tenant_id":      row["tenant_id"],
                        "first_name":     row["first_name"],
                        "last_name":      row["last_name"],
                        "email":          row["email"],
                        "role":           row["role"],
                        "embedding":      embedding,
                        "is_active":      bool(row["is_active"]),
                        "state":          row["state"],
                        "face_registered": bool(row["face_registered"]),
                        "fp_registered":  bool(row["fp_registered"]),
                    })
                except Exception:
                    pass
        finally:
            conn.close()
    return results


def get_cached_embedding(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Returns a single user's cached embedding dict, or None if not found.
    """
    with _db_lock:
        conn = _get_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT user_id, tenant_id, first_name, last_name, email, role,
                       embedding_json, is_active, state, face_registered, fp_registered
                FROM face_embeddings
                WHERE user_id = ?
            """, (user_id,))
            row = cur.fetchone()
            if row is None:
                return None
            embedding = json.loads(row["embedding_json"])
            return {
                "user_id":        row["user_id"],
                "tenant_id":      row["tenant_id"],
                "first_name":     row["first_name"],
                "last_name":      row["last_name"],
                "email":          row["email"],
                "role":           row["role"],
                "embedding":      embedding,
                "is_active":      bool(row["is_active"]),
                "state":          row["state"],
                "face_registered": bool(row["face_registered"]),
                "fp_registered":  bool(row["fp_registered"]),
            }
        finally:
            conn.close()


def upsert_embedding(user_id: str, tenant_id: str, embedding: list,
                     metadata: Dict[str, Any]) -> bool:
    """
    Adds or updates a single user's embedding in the cache.
    Called after a successful enrollment so the cache stays current.
    """
    now_str = datetime.datetime.utcnow().isoformat()
    emb_json = json.dumps(embedding)
    with _db_lock:
        conn = _get_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO face_embeddings
                    (user_id, tenant_id, first_name, last_name, email, role,
                     embedding_json, is_active, state, face_registered, fp_registered, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', 1, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    embedding_json  = excluded.embedding_json,
                    first_name      = excluded.first_name,
                    last_name       = excluded.last_name,
                    face_registered = 1,
                    synced_at       = excluded.synced_at
            """, (
                user_id,
                tenant_id,
                metadata.get("first_name", ""),
                metadata.get("last_name", ""),
                metadata.get("email", ""),
                metadata.get("role", "WORKER"),
                emb_json,
                1 if metadata.get("fp_registered") else 0,
                now_str,
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"[OfflineCache] Upsert error: {e}")
            return False
        finally:
            conn.close()


def remove_embedding(user_id: str) -> bool:
    """
    Marks a user as de-enrolled (sets is_active = 0 and face_registered = 0).
    Does not delete the row so audit trails are preserved.
    """
    with _db_lock:
        conn = _get_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                UPDATE face_embeddings
                SET is_active = 0, face_registered = 0
                WHERE user_id = ?
            """, (user_id,))
            conn.commit()
            return True
        except Exception as e:
            print(f"[OfflineCache] Remove error: {e}")
            return False
        finally:
            conn.close()


def get_cache_status() -> Dict[str, Any]:
    """
    Returns cache health metrics: total records, last sync timestamp,
    and whether the cache has been populated.
    """
    with _db_lock:
        conn = _get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) AS cnt FROM face_embeddings WHERE face_registered = 1")
            total = cur.fetchone()["cnt"]

            cur.execute("""
                SELECT synced_at, record_count, status
                FROM sync_log
                ORDER BY id DESC
                LIMIT 1
            """)
            last_sync_row = cur.fetchone()
            last_sync = dict(last_sync_row) if last_sync_row else None

            cur.execute("SELECT COUNT(*) AS cnt FROM datalake_event_queue WHERE push_status = 'PENDING'")
            pending_events = cur.fetchone()["cnt"]

            return {
                "cached_embeddings": total,
                "last_sync": last_sync,
                "pending_datalake_events": pending_events,
                "cache_db_path": CACHE_DB_PATH,
                "operational": total > 0,
            }
        finally:
            conn.close()


def cosine_similarity_offline(query_embedding: list, tenant_id: str) -> List[Dict[str, Any]]:
    """
    Performs a full 1:N cosine similarity scan against all cached embeddings
    for the given tenant. Returns results sorted by confidence descending.

    Args:
        query_embedding: The live face embedding vector (list of floats).
        tenant_id:       The tenant scope to search within.

    Returns:
        List of dicts with 'user_id', 'confidence', and user metadata.
    """
    candidates = get_cached_embeddings(tenant_id)
    if not candidates:
        return []

    query_vec = np.array(query_embedding, dtype=np.float32)
    q_norm = np.linalg.norm(query_vec)
    if q_norm == 0:
        return []
    query_vec = query_vec / q_norm

    results = []
    for candidate in candidates:
        try:
            emb_vec = np.array(candidate["embedding"], dtype=np.float32)
            emb_norm = np.linalg.norm(emb_vec)
            if emb_norm == 0:
                continue
            emb_vec = emb_vec / emb_norm
            confidence = float(np.dot(query_vec, emb_vec))
            results.append({**candidate, "confidence": round(confidence, 4)})
        except Exception:
            pass

    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results
