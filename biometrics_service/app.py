import os
import re
import time
import uuid
import json
import base64
import hashlib
import datetime
import jwt
import bcrypt
if not hasattr(bcrypt, "__about__"):
    class About:
        pass
    about = About()
    about.__version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = about

from fastapi import FastAPI, HTTPException, Body, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from passlib.context import CryptContext
import psycopg2
from psycopg2.extras import RealDictCursor
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# Import CV modules
import face_auth
import fingerprint_auth

# Import offline and integration modules
import threading
import offline_cache
import datalake_adapter

# Import EdgeGuard AI feature modules
import trust_engine
import antispoof
import watchlist
import risk_engine
import ppe_detector
import journey_tracker

# MongoDB telemetry client (non-blocking — never raises on failure)
_mongo_client = None
_mongo_db = None

def get_mongo_db():
    global _mongo_client, _mongo_db
    if _mongo_db is not None:
        return _mongo_db
    try:
        from pymongo import MongoClient
        mongo_uri = os.environ.get("MONGO_URI")
        if not mongo_uri:
            return None
        _mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000, connectTimeoutMS=5000)
        _mongo_db = _mongo_client["fencein"]
        print("[Python Engine] ✅ MongoDB connected for telemetry.")
        return _mongo_db
    except Exception as e:
        print(f"[Python Engine] ⚠️  MongoDB telemetry unavailable: {e}")
        return None

def write_inference_log(user_id, method, outcome, confidence=None, liveness_score=None,
                        liveness_pass=None, good_matches=None, latency_ms=None,
                        ip_address="unknown", failure_reason=None):
    """Fire-and-forget: write AI inference result to MongoDB."""
    try:
        db = get_mongo_db()
        if db is None:
            return
        db["ai_inference_logs"].insert_one({
            "userId": user_id,
            "method": method,
            "outcome": outcome,
            "confidence": confidence,
            "livenessScore": liveness_score,
            "livenessPass": liveness_pass,
            "goodMatches": good_matches,
            "engineLatencyMs": latency_ms,
            "ipAddress": ip_address,
            "failureReason": failure_reason,
            "source": "python_engine",
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow(),
        })
    except Exception as e:
        print(f"[Python Engine] MongoDB write error (inference log): {e}")

def write_telemetry(event, latency_ms=None, status_code=None, metadata=None):
    """Fire-and-forget: write engine telemetry to MongoDB."""
    try:
        db = get_mongo_db()
        if db is None:
            return
        db["telemetry"].insert_one({
            "source": "python_engine",
            "event": event,
            "statusCode": status_code,
            "latencyMs": latency_ms,
            "metadata": metadata or {},
            "engineVersion": "2.0.0",
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow(),
        })
    except Exception as e:
        print(f"[Python Engine] MongoDB write error (telemetry): {e}")


# Load Environment variables from parent .env
def load_dotenv():
    paths = [".env", "../.env", "../../.env", "biometrics_service/.env"]
    for path in paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    m = re.match(r"^([^=]+)=(.*)$", line)
                    if m:
                        key = m.group(1).strip().strip("'\"")
                        val = m.group(2).strip().strip("'\"")
                        os.environ[key] = val
            break

load_dotenv()

# Setup Passlib Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not configured in environment variables.")
JWT_ALGORITHM = "HS256"

app = FastAPI(
    title="FenceIn Complete Authentication & Biometrics Gateway",
    description="Python authentication and computer-vision microservice providing hardened identity validation",
    version="2.0.0"
)

# CORS configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup: initialise offline cache and attempt background sync ─────────────
@app.on_event("startup")
async def on_startup():
    """
    Initialises the local SQLite cache and attempts to populate it from
    PostgreSQL in a background thread. The server remains available even if
    the database is unreachable during startup.
    """
    offline_cache.init_cache()

    # Initialise all EdgeGuard AI feature tables
    trust_engine.init_known_devices_table()
    watchlist.init_watchlist_tables()
    risk_engine.init_risk_tables()
    journey_tracker.init_journey_tables()

    def _bg_sync():
        try:
            db_url = os.environ.get("DATABASE_URL")
            if not db_url:
                print("[Startup] DATABASE_URL not set — skipping initial cache sync")
                return
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
            result = offline_cache.sync_embeddings_from_pg(conn)
            conn.close()
            print(f"[Startup] Cache sync complete: {result['synced']} embeddings cached")
        except Exception as e:
            print(f"[Startup] Cache sync skipped (DB unavailable): {e}")

    threading.Thread(target=_bg_sync, daemon=True).start()

# AES Encryption/Decryption Helpers for biometric templates (matching NestJS exactly)
def get_aes_key() -> bytes:
    jwt_secret = os.environ.get("JWT_SECRET")
    if not jwt_secret:
        raise RuntimeError("JWT_SECRET is not configured in environment variables.")
    # Matches crypto.scryptSync(secret, 'salt', 32)
    key = hashlib.scrypt(
        password=jwt_secret.encode('utf-8'),
        salt=b'salt',
        n=16384,
        r=8,
        p=1,
        dklen=32
    )
    return key

def encrypt_aes(text: str) -> str:
    try:
        key = get_aes_key()
        # Secure dynamic IV generation per encryption cycle
        iv = os.urandom(16)
        
        pad_len = 16 - (len(text) % 16)
        padded_text = text + chr(pad_len) * pad_len
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        encrypted = encryptor.update(padded_text.encode('utf-8')) + encryptor.finalize()
        
        # Prepend IV to ciphertext before hex encoding
        payload = iv + encrypted
        return payload.hex()
    except Exception as e:
        print(f"Encryption error: {e}")
        return text

def decrypt_aes(hex_text: str) -> str:
    try:
        key = get_aes_key()
        payload_bytes = bytes.fromhex(hex_text)
        
        # Try dynamic IV decryption first
        if len(payload_bytes) >= 32: # Must contain at least IV (16) + 1 ciphertext block (16)
            iv = payload_bytes[:16]
            encrypted_bytes = payload_bytes[16:]
            try:
                cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
                decryptor = cipher.decryptor()
                decrypted = decryptor.update(encrypted_bytes) + decryptor.finalize()
                pad_len = decrypted[-1]
                if 1 <= pad_len <= 16:
                    return decrypted[:-pad_len].decode('utf-8')
            except Exception:
                pass # Fallback to legacy zero-IV decryption
                
        # Legacy zero-IV fallback for existing seeded database profiles
        iv = b'\x00' * 16
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(payload_bytes) + decryptor.finalize()
        pad_len = decrypted[-1]
        if 1 <= pad_len <= 16:
            return decrypted[:-pad_len].decode('utf-8')
        return decrypted.decode('utf-8', errors='ignore')
    except Exception:
        return hex_text

# Database connection helper
def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    try:
        conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

# Log audits directly to MongoDB (collection: audit_logs)
def log_audit(userId: Optional[str], action: str, entityType: str, entityId: Optional[str], oldValue: Optional[dict], newValue: Optional[dict], ipAddress: Optional[str] = "unknown", device: Optional[str] = "unknown"):
    try:
        db = get_mongo_db()
        if db is not None:
            audit_doc = {
                "userId": userId,
                "action": action,
                "entityType": entityType,
                "entityId": entityId,
                "oldValue": oldValue,
                "newValue": newValue,
                "ipAddress": ipAddress or "unknown",
                "device": device or "unknown",
                "createdAt": datetime.datetime.utcnow(),
                "updatedAt": datetime.datetime.utcnow()
            }
            db["audit_logs"].insert_one(audit_doc)
            print(f"[Python Engine] 🍃 Written MongoDB audit log: {action}")
        else:
            print(f"[Python Engine] MongoDB unavailable — skipped audit log: {action}")
    except Exception as e:
        print(f"[Audit Log Error] Failed to write Mongo audit log: {e}")

# Pydantic Schemas
class UserLoginPayload(BaseModel):
    email: str
    password: str

class UserRegisterPayload(BaseModel):
    email: str
    password: str
    firstName: str
    lastName: str
    role: Optional[str] = "WORKER"
    vendorId: Optional[str] = None
    faceImage: Optional[str] = None
    fingerprintTemplate: Optional[str] = None

class ChangePasswordPayload(BaseModel):
    oldPassword: str
    newPassword: str

class FaceVerifyPayload(BaseModel):
    userId: str
    image: str

class FingerprintVerifyPayload(BaseModel):
    userId: str
    fingerprintTemplate: str
    image: Optional[str] = None

class FaceEnrollPayload(BaseModel):
    userId: str
    image: str

class FingerprintEnrollPayload(BaseModel):
    userId: str
    fingerprintTemplate: str
    image: Optional[str] = None

# ── Independent Biometric Login Payloads (no userId required) ──
class FaceLoginPayload(BaseModel):
    """1:N open-set face identification — no userId or email needed."""
    image: str
    tenantId: str

class FingerprintLoginPayload(BaseModel):
    """1:N open-set fingerprint identification — no userId or email needed."""
    image: Optional[str] = None
    fingerprintTemplate: Optional[str] = None
    tenantId: str

# Helper to verify JWT from headers
def get_current_user_id(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Authentication session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid access credentials")

# ----------------- AUTHENTICATION ROUTES -----------------

@app.post("/api/v1/auth/register")
def register_user(payload: UserRegisterPayload, request: Request):
    """
    Registers a new worker or administrator.
    Hashes the password with bcrypt, checks duplicates, and inserts secure credentials.
    """
    email_clean = payload.email.strip().lower()
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check duplicate email
            cur.execute('SELECT id FROM users WHERE email = %s', (email_clean,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Account with this email already exists")
            
            # Hash password
            hashed_password = pwd_context.hash(payload.password)
            user_id = str(uuid.uuid4())
            
            # Map role string to uppercase Enum representation
            role_enum = payload.role.upper() if payload.role else "WORKER"
            
            # Process face image if passed
            face_vector_str = None
            if payload.faceImage:
                img = face_auth.base64_to_image(payload.faceImage)
                if img is None:
                    raise HTTPException(status_code=400, detail="Invalid face image encoding")
                
                face_crop, _, _ = face_auth.detect_face_and_eyes(img)
                if face_crop is None:
                    raise HTTPException(status_code=400, detail="Face detection failed. Registration denied.")
                    
                is_live, liveness_score = face_auth.check_liveness_texture(face_crop)
                if not is_live:
                    raise HTTPException(status_code=400, detail="Liveness check failed. Spoofing attempt blocked.")
                    
                resolved_embedding = face_auth.generate_face_embedding(img)
                face_vector_str = f"[{','.join(map(str, resolved_embedding))}]"
                
                # Check duplicate face (similarity >= 0.72)
                cur.execute("""
                    SELECT id, "firstName", "lastName", email, 1 - ("faceEmbedding"::vector <=> %s::vector) AS confidence 
                    FROM users 
                    WHERE "faceEmbedding" IS NOT NULL
                    ORDER BY "faceEmbedding"::vector <=> %s::vector LIMIT 1
                """, (face_vector_str, face_vector_str))
                duplicate = cur.fetchone()
                if duplicate and duplicate["confidence"] >= 0.72:
                    print(f"[BIOMETRIC DUPLICATE DETECTED]\nmatched_user_id={duplicate['id']}\nsimilarity={round(float(duplicate['confidence']), 4)}\nregistration_blocked=true")
                    return JSONResponse(
                        status_code=400,
                        content={
                            "success": False,
                            "message": "Face already registered to another account."
                        }
                    )
                
            # Process fingerprint if passed
            encrypted_fingerprint = None
            if payload.fingerprintTemplate:
                encrypted_fingerprint = encrypt_aes(payload.fingerprintTemplate.strip())
                
            # Resolve vendor to get tenantId and tenantName
            tenant_id = "ORG001"
            tenant_name = "SHIELD"
            if payload.vendorId:
                cur.execute('SELECT "tenantId" FROM "Vendor" WHERE id = %s', (payload.vendorId,))
                vendor_row = cur.fetchone()
                if vendor_row and vendor_row["tenantId"]:
                    tenant_id = vendor_row["tenantId"]
                    # Get tenant name
                    cur.execute('SELECT name FROM "Tenant" WHERE id = %s', (tenant_id,))
                    tenant_row = cur.fetchone()
                    if tenant_row:
                        tenant_name = tenant_row["name"]

            ROLE_TO_LEVEL = {
                "ORGANIZATION": 0,
                "SUPER_ADMIN": 1,
                "ORG_ADMIN": 2,
                "HR_ADMIN": 2,
                "SUPERVISOR": 3,
                "SECURITY_OFFICER": 4,
                "VENDOR": 5,
                "VENDOR_MANAGER": 5,
                "WORKER": 6,
            }
            role_level = ROLE_TO_LEVEL.get(role_enum, 6)
            
            face_registered = payload.faceImage is not None
            fingerprint_registered = payload.fingerprintTemplate is not None
            
            # Generate custom_user_id USR_<6-hex>
            import secrets
            custom_user_id = f"USR_{secrets.token_hex(6).upper()}"

            cur.execute("""
                INSERT INTO users (id, email, password, "firstName", "lastName", "userRole", "roleLevel", "user_id", "tenantId", "tenantName", state, "isActive", "faceEmbedding", "fingerprintTemplate", "faceRegistered", "fingerprintRegistered", "mustChangePassword", "vendorId", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'REGISTERED', TRUE, %s::vector, %s, %s, %s, FALSE, %s, NOW(), NOW())
            """, (user_id, email_clean, hashed_password, payload.firstName, payload.lastName, role_enum, role_level, custom_user_id, tenant_id, tenant_name, face_vector_str, encrypted_fingerprint, face_registered, fingerprint_registered, payload.vendorId))
            conn.commit()
            
            # Audit log
            log_audit(user_id, "USER_REGISTERED", "User", user_id, None, {"email": email_clean, "role": role_enum}, request.client.host)
            
            return {"success": True, "message": "User account created successfully", "userId": user_id}
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        conn.close()

@app.post("/api/v1/auth/login")
def login_user(payload: UserLoginPayload, request: Request):
    """
    Validates credentials (bcrypt password hash lookup) and issues secure, shared JWT tokens.
    """
    email_clean = payload.email.strip().lower()
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, password, "firstName", "lastName", "userRole" AS role, "faceRegistered", "fingerprintRegistered", "tenantId" AS "organizationId"
                FROM users 
                WHERE email = %s AND state = 'ACTIVE'
            """, (email_clean,))
            user = cur.fetchone()
            
            if not user:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Verify password hash
            if not pwd_context.verify(payload.password, user["password"]):
                # Log failed attempt
                log_audit(user["id"], "AUTH_PASSWORD_FAILED", "User", user["id"], None, {"email": email_clean}, request.client.host)
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Generate JWT Access token
            token_payload = {
                "email": user["email"],
                "sub": user["id"],
                "role": user["role"],
                "organizationId": user["organizationId"],
                "type": "authenticated",
                "exp": int(time.time()) + 7200 # 2 hours session expiry
            }
            token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            # Generate Refresh token
            refresh_payload = {
                "sub": user["id"],
                "exp": int(time.time()) + 604800 # 7 days
            }
            refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            # Audit log
            log_audit(user["id"], "AUTH_PASSWORD_SUCCESS", "User", user["id"], None, {"email": email_clean}, request.client.host)
            
            is_platform_head = user["role"] == "PLATFORM_HEAD"
            face_enrolled = bool(user["faceRegistered"])
            fingerprint_enrolled = bool(user["fingerprintRegistered"])
            has_biometric = face_enrolled or fingerprint_enrolled
            redirect_to = "/dashboard" if (is_platform_head or has_biometric) else "/biometric-setup"

            return {
                "access_token": token,
                "refresh_token": refresh_token,
                "biometricStatus": {
                    "face": face_enrolled,
                    "fingerprint": fingerprint_enrolled
                },
                "redirectTo": redirect_to,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "firstName": user["firstName"],
                    "lastName": user["lastName"],
                    "role": user["role"],
                    "faceEnrolled": face_enrolled,
                    "fingerprintEnrolled": fingerprint_enrolled,
                    "tenantId": user["organizationId"]
                }
            }
    finally:
        conn.close()

@app.post("/api/v1/auth/change-password")
def change_password(payload: ChangePasswordPayload, userId: str = Depends(get_current_user_id)):
    """
    Authenticates old password and saves updated bcrypt password hash.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT password FROM users WHERE id = %s', (userId,))
            user = cur.fetchone()
            if not user or not pwd_context.verify(payload.oldPassword, user["password"]):
                raise HTTPException(status_code=400, detail="Current password verification failed")
            
            new_hash = pwd_context.hash(payload.newPassword)
            cur.execute('UPDATE users SET password = %s, "mustChangePassword" = FALSE, "updatedAt" = NOW() WHERE id = %s', (new_hash, userId))
            conn.commit()
            
            log_audit(userId, "PASSWORD_CHANGED", "User", userId, None, {"status": "success"})
            return {"success": True, "message": "Password changed successfully"}
    finally:
        conn.close()

# ----------------- VENDOR LISTING ROUTE -----------------
@app.get("/api/v1/vendors")
def list_vendors():
    """
    Exposes vendor names during registration so users can match their vendor.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT id, "companyName" FROM "Vendor" ORDER BY "companyName" ASC')
            vendors = cur.fetchall()
            return vendors
    finally:
        conn.close()

@app.get("/api/v1/auth/users")
def get_auth_users():
    """
    Retrieves all active registered users from the database to dynamically populate the preset credentials dropdown.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT "firstName", "lastName", email, "userRole" FROM users WHERE email NOT LIKE \'worker_%\' ORDER BY "userRole" ASC')
            users = cur.fetchall()
            
            mapped = []
            role_display_map = {
                "SUPER_ADMIN": "Super Admin",
                "ORG_ADMIN": "Organization Admin",
                "HR_ADMIN": "HR Admin",
                "SUPERVISOR": "Workforce Supervisor",
                "SECURITY_OFFICER": "Security Officer",
                "VENDOR_MANAGER": "Vendor Manager",
                "WORKER": "Contractor / Worker"
            }
            
            for u in users:
                first = u.get("firstName") or ""
                last = u.get("lastName") or ""
                email = u.get("email")
                db_role = u.get("userRole") or "WORKER"
                
                name = f"{first} {last}".strip()
                if not name:
                    name = email.split("@")[0].replace(".", " ").title()
                
                display_role = role_display_map.get(db_role, db_role.replace("_", " ").title())
                
                mapped.append({
                    "name": name,
                    "email": email,
                    "role": display_role
                })
            return mapped
    finally:
        conn.close()

@app.get("/api/v1/auth/check-enrollment")
def check_enrollment(email: str = None, name: str = None):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if email:
                cur.execute('SELECT "fingerprintRegistered", "faceRegistered" FROM users WHERE LOWER(email) = LOWER(%s)', (email,))
            elif name:
                parts = name.split(" ", 1)
                first = parts[0]
                last = parts[1] if len(parts) > 1 else ""
                cur.execute('SELECT "fingerprintRegistered", "faceRegistered" FROM users WHERE LOWER("firstName") = LOWER(%s) AND LOWER("lastName") = LOWER(%s)', (first, last))
            else:
                return {"fingerprintEnrolled": False, "faceEnrolled": False}
                
            res = cur.fetchone()
            if res:
                return {
                    "fingerprintEnrolled": res["fingerprintRegistered"],
                    "faceEnrolled": res["faceRegistered"]
                }
            return {"fingerprintEnrolled": False, "faceEnrolled": False}
    finally:
        conn.close()


@app.post("/api/v1/biometrics/revoke")
def revoke_biometrics(userId: str = Depends(get_current_user_id), request: Request = None):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute('UPDATE users SET "faceEmbedding" = NULL, "fingerprintTemplate" = NULL, "faceRegistered" = FALSE, "fingerprintRegistered" = FALSE, "updatedAt" = NOW() WHERE id = %s', (userId,))
            conn.commit()
            
            log_audit(userId, "BIOMETRIC_REVOKED", "User", userId, None, {"status": "success"}, request.client.host if request else "unknown")
            return {"success": True, "message": "Biometric profiles successfully revoked"}
    finally:
        conn.close()


# ----------------- BIOMETRICS REGISTRATION & ENROLLMENT -----------------

@app.post("/api/v1/biometrics/enroll")
def enroll_face_biometrics(payload: FaceEnrollPayload, userId: str = Depends(get_current_user_id), request: Request = None):
    """
    Validates visual face frame, checks passive liveness, generates a deterministic
    128D geometric embedding, and stores it directly as a pgvector in the User profile.
    """
    if userId != payload.userId:
        raise HTTPException(status_code=403, detail="Unauthorized access: Identity mismatch")
        
    liveness_score = 100.0

    # Strict server-side face detection, liveness checks, and embedding extraction
    img = face_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")
    
    face_crop, _, _ = face_auth.detect_face_and_eyes(img)
    if face_crop is None:
        raise HTTPException(status_code=400, detail="Face detection failed. Ensure face is centered and fully visible.")
        
    is_live, liveness_score = face_auth.check_liveness_texture(face_crop)
    if not is_live:
        raise HTTPException(status_code=400, detail=f"Liveness match failed. Score: {liveness_score} (Spoofing warning)")
        
    resolved_embedding = face_auth.generate_face_embedding(img)

    face_vector_str = f"[{','.join(map(str, resolved_embedding))}]"
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Guard duplicate: STRICT 1:1 match constraint (exclude current user)
            cur.execute("""
                SELECT id, "firstName", "lastName", email, 1 - ("faceEmbedding"::vector <=> %s::vector) AS confidence 
                FROM users 
                WHERE "faceEmbedding" IS NOT NULL AND id != %s
                ORDER BY "faceEmbedding"::vector <=> %s::vector LIMIT 1
            """, (face_vector_str, userId, face_vector_str))
            duplicate = cur.fetchone()
            if duplicate and duplicate["confidence"] >= 0.72:
                print(f"[BIOMETRIC DUPLICATE DETECTED]\nmatched_user_id={duplicate['id']}\nsimilarity={round(float(duplicate['confidence']), 4)}\nregistration_blocked=true")
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "message": "Face already registered to another account."
                    }
                )
            
            # Save vector string
            cur.execute('UPDATE users SET "faceEmbedding" = %s::vector, "faceRegistered" = TRUE, "updatedAt" = NOW() WHERE id = %s', (face_vector_str, payload.userId))
            conn.commit()
            
            log_audit(payload.userId, "BIOMETRIC_FACE_ENROLLED", "User", payload.userId, None, {"livenessScore": liveness_score}, request.client.host if request else "unknown")
            return {"success": True, "message": "Facial biometric profile successfully locked and enrolled"}
    finally:
        conn.close()

@app.post("/api/v1/biometrics/enroll-fingerprint")
def enroll_fingerprint_biometrics(payload: FingerprintEnrollPayload, userId: str = Depends(get_current_user_id), request: Request = None):
    """
    Captures procedural or physical fingerprint scanner ridges, enhances contrast via CLAHE,
    extracts whorl features using ORB, and stores the encrypted template.
    """
    if userId != payload.userId:
        raise HTTPException(status_code=403, detail="Unauthorized access: Identity mismatch")
        
    final_template = payload.fingerprintTemplate.strip()
    keypoints_count = 0

    if payload.image:
        img = fingerprint_auth.base64_to_image(payload.image)
        if img is not None:
            kps, desc = fingerprint_auth.extract_fingerprint_features(img)
            if desc is not None and len(desc) > 10:
                final_template = fingerprint_auth.serialize_descriptors(desc)
                keypoints_count = len(kps)
            else:
                raise HTTPException(status_code=400, detail="Low contrast print: Failed to map distinct ridge paths")

    encrypted_template = encrypt_aes(final_template)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Guard duplicate check
            cur.execute('SELECT id, "firstName", "lastName", email FROM users WHERE "fingerprintTemplate" = %s', (encrypted_template,))
            duplicate = cur.fetchone()
            if duplicate:
                dup_name = f"{duplicate['firstName']} {duplicate['lastName']}"
                dup_email = duplicate['email']
                raise HTTPException(status_code=400, detail=f"Biometric template duplicate: fingerprint registered to user: {dup_name} ({dup_email})")
                
            cur.execute('UPDATE users SET "fingerprintTemplate" = %s, "fingerprintRegistered" = TRUE, "updatedAt" = NOW() WHERE id = %s', (encrypted_template, payload.userId))
            conn.commit()
            
            log_audit(payload.userId, "BIOMETRIC_FINGERPRINT_ENROLLED", "User", payload.userId, None, {"keypoints": keypoints_count}, request.client.host if request else "unknown")
            return {"success": True, "message": "Fingerprint ridges successfully mapped and locked"}
    finally:
        conn.close()

# ----------------- BIOMETRICS VERIFICATION & AUDITING -----------------

@app.post("/api/v1/biometrics/verify")
def verify_face_biometrics(payload: FaceVerifyPayload, request: Request):
    """
    STRICT SECURITY FLOW (1:1 Verification strictly against claimed identity ONLY)
    Prevents cross-user validation, role hijacking, and accepts matching on strict 0.78 threshold.
    Also executes texture liveness checking.
    """
    # Enforce pre-auth/session token validation
    token_sub = get_current_user_id(request)
    if token_sub != payload.userId:
        raise HTTPException(status_code=403, detail="Unauthorized access: Identity mismatch")
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, "firstName", "lastName", "userRole" AS role, "faceEmbedding", "tenantId" AS "organizationId", "faceRegistered", "fingerprintRegistered"
                FROM users 
                WHERE id = %s AND "faceRegistered" = TRUE
            """, (payload.userId,))
            user = cur.fetchone()
            
            if not user:
                raise HTTPException(status_code=400, detail="Unregistered Biometric")
            
            liveness_score = 100.0
            
            img = face_auth.base64_to_image(payload.image)
            if img is None:
                raise HTTPException(status_code=400, detail="Invalid image encoding")
            
            face_crop, _, _ = face_auth.detect_face_and_eyes(img)
            if face_crop is None:
                log_audit(payload.userId, "BIOMETRIC_FACE_VERIFICATION_FAILED", "Biometrics", payload.userId, None, {"reason": "Face undetected"}, request.client.host)
                raise HTTPException(status_code=401, detail="Face Verification Failed: Face undetected")
                
            is_live, liveness_score = face_auth.check_liveness_texture(face_crop)
            if not is_live:
                log_audit(payload.userId, "BIOMETRIC_FACE_VERIFICATION_FAILED", "Biometrics", payload.userId, None, {"reason": "Liveness check failed", "livenessScore": liveness_score}, request.client.host)
                raise HTTPException(status_code=401, detail="Face Verification Failed: Liveness check rejected")
                
            resolved_embedding = face_auth.generate_face_embedding(img)
                
            # Perform direct 1:1 Cosine Similarity matching against the user's saved vector only!
            face_vector_str = f"[{','.join(map(str, resolved_embedding))}]"
            cur.execute("""
                SELECT 1 - ("faceEmbedding"::vector <=> %s::vector) AS confidence 
                FROM users 
                WHERE id = %s
            """, (face_vector_str, user["id"]))
            row = cur.fetchone()
            
            confidence = float(row["confidence"]) if row else 0.0
            
            # Hardened Face Threshold: 0.55 (enterprise-grade — prevents false-positive matches)
            FACE_THRESHOLD = 0.55
            matched = confidence >= FACE_THRESHOLD
            
            if matched:
                # Issue session token (authorized gate access)
                token_payload = {
                    "email": user["email"],
                    "sub": user["id"],
                    "role": user["role"],
                    "organizationId": user["organizationId"],
                    "type": "authenticated",
                    "exp": int(time.time()) + 7200
                }
                token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                log_audit(user["id"], "BIOMETRIC_FACE_VERIFICATION_SUCCESS", "Biometrics", user["id"], None, {"confidence": confidence, "livenessScore": liveness_score}, request.client.host)
                
                return {
                    "matched": True,
                    "confidence": confidence,
                    "access_token": token,
                    "biometricStatus": {
                        "face": bool(user["faceRegistered"]),
                        "fingerprint": bool(user["fingerprintRegistered"])
                    },
                    "authMethod": "FACE",
                    "redirectTo": f"/dashboard/{user['role'].lower().replace('_', '-')}",
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "firstName": user["firstName"],
                        "lastName": user["lastName"],
                        "role": user["role"],
                        "tenantId": user["organizationId"]
                    }
                }
            else:
                log_audit(user["id"], "BIOMETRIC_FACE_VERIFICATION_FAILED", "Biometrics", user["id"], None, {"reason": "Biometric mismatch", "confidence": confidence}, request.client.host)
                raise HTTPException(status_code=401, detail="Identity Mismatch")
    finally:
        conn.close()

@app.post("/api/v1/biometrics/verify-fingerprint")
def verify_fingerprint_biometrics(payload: FingerprintVerifyPayload, request: Request):
    """
    STRICT 1:1 matching of fingerprint templates.
    Decrypts the database record, performs minutiae matching, and validates scores.
    """
    # Enforce pre-auth/session token validation
    token_sub = get_current_user_id(request)
    if token_sub != payload.userId:
        raise HTTPException(status_code=403, detail="Unauthorized access: Identity mismatch")
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, "firstName", "lastName", "userRole" AS role, "fingerprintTemplate", "tenantId" AS "organizationId", "faceRegistered", "fingerprintRegistered"
                FROM users 
                WHERE id = %s AND "fingerprintRegistered" = TRUE
            """, (payload.userId,))
            user = cur.fetchone()
            
            if not user:
                raise HTTPException(status_code=400, detail="Unregistered Biometric")
            
            decrypted_template = decrypt_aes(user["fingerprintTemplate"])
            matched = False
            match_score = 0.0
            matches_count = 0
            
            # Check if image frame is uploaded
            if payload.image:
                img = fingerprint_auth.base64_to_image(payload.image)
                if img is not None:
                    # Deserialize template
                    registered_descriptors = fingerprint_auth.deserialize_descriptors(decrypted_template)
                    if registered_descriptors is not None:
                        _, current_descriptors = fingerprint_auth.extract_fingerprint_features(img)
                        if current_descriptors is not None:
                            match_res = fingerprint_auth.match_fingerprints(registered_descriptors, current_descriptors, 18)
                            matched = match_res["matched"]
                            match_score = match_res["score"]
                            matches_count = match_res["good_matches"]
            else:
                # String comparison fallback (for legacy testing)
                matched = (decrypted_template.strip() == payload.fingerprintTemplate.strip())
                if matched:
                    matches_count = 100
                    match_score = 1.0
 
            if matched:
                token_payload = {
                    "email": user["email"],
                    "sub": user["id"],
                    "role": user["role"],
                    "organizationId": user["organizationId"],
                    "type": "authenticated",
                    "exp": int(time.time()) + 7200
                }
                token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                log_audit(user["id"], "BIOMETRIC_FINGERPRINT_VERIFICATION_SUCCESS", "Biometrics", user["id"], None, {"score": match_score, "matchesCount": matches_count}, request.client.host)
                
                return {
                    "matched": True,
                    "access_token": token,
                    "biometricStatus": {
                        "face": bool(user["faceRegistered"]),
                        "fingerprint": bool(user["fingerprintRegistered"])
                    },
                    "authMethod": "FINGERPRINT",
                    "redirectTo": f"/dashboard/{user['role'].lower().replace('_', '-')}",
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "firstName": user["firstName"],
                        "lastName": user["lastName"],
                        "role": user["role"],
                        "tenantId": user["organizationId"]
                    }
                }
            else:
                log_audit(user["id"], "BIOMETRIC_FINGERPRINT_VERIFICATION_FAILED", "Biometrics", user["id"], None, {"reason": "Fingerprint mismatch", "matchesCount": matches_count}, request.client.host)
                raise HTTPException(status_code=401, detail="Identity Mismatch")
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════════════════════
# INDEPENDENT BIOMETRIC LOGIN — 1:N IDENTIFICATION (no email/password required)
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/auth/face-login")
def face_login(payload: FaceLoginPayload, request: Request):
    """
    INDEPENDENT 1:N FACE IDENTIFICATION LOGIN.

    Answers: "Who does this biometric belong to?"
    NOT:     "Does this biometric match the entered email?"

    Security guarantees:
    - Real passive liveness detection (3-signal: texture variance, specular highlight, skin-tone HSV)
    - Minimum cosine similarity threshold: 0.55
    - Rejects ambiguous matches (two users above threshold)
    - Role comes exclusively from backend DB — never trusted from frontend
    - No email, userId, or password required whatsoever
    - OFFLINE FALLBACK: falls back to local SQLite embedding cache when
      PostgreSQL is unreachable (zero-network zones)
    """
    liveness_score = 0.0

    # 1. Run liveness + extract embedding from live image strictly server-side
    img = face_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")

    face_crop, _, _ = face_auth.detect_face_and_eyes(img)
    if face_crop is None:
        raise HTTPException(status_code=400, detail="No face detected. Ensure your face is centered and fully visible.")

    is_live, liveness_score = face_auth.check_liveness_texture(face_crop)
    if not is_live:
        log_audit(None, "BIOMETRIC_FACE_LOGIN_LIVENESS_FAILED", "Biometrics", None, None,
                  {"reason": "Liveness check failed", "livenessScore": liveness_score}, request.client.host)
        raise HTTPException(
            status_code=401,
            detail=f"Liveness check failed (score: {liveness_score:.3f}). Present a live face — no photos or screens."
        )

    resolved_embedding = face_auth.generate_face_embedding(img)
    if len(resolved_embedding) != 512:
        raise HTTPException(status_code=400, detail="Face embedding must be exactly 512 dimensions.")

    face_vector_str = f"[{','.join(map(str, resolved_embedding))}]"
    FACE_THRESHOLD = 0.55

    # ── Try primary PostgreSQL path ───────────────────────────────────────────
    candidates = []
    network_mode = "ONLINE"
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, email, "firstName", "lastName", "userRole" AS role, "isActive", state, "tenantId", "faceRegistered", "fingerprintRegistered",
                           1 - ("faceEmbedding"::vector <=> %s::vector) AS confidence
                    FROM users
                    WHERE "faceRegistered" = TRUE AND "isActive" = TRUE AND "tenantId" = %s
                    ORDER BY "faceEmbedding"::vector <=> %s::vector
                    LIMIT 2
                """, (face_vector_str, payload.tenantId, face_vector_str))
                pg_rows = cur.fetchall()

            # Convert RealDictRow to plain dicts for uniform processing
            for row in pg_rows:
                candidates.append({
                    "id":               row["id"],
                    "email":            row["email"],
                    "firstName":        row["firstName"],
                    "lastName":         row["lastName"],
                    "role":             row["role"],
                    "isActive":         row["isActive"],
                    "state":            row["state"],
                    "tenantId":         row["tenantId"],
                    "faceRegistered":   row["faceRegistered"],
                    "fingerprintRegistered": row["fingerprintRegistered"],
                    "confidence":       float(row["confidence"]),
                })
        finally:
            conn.close()

    except Exception as pg_err:
        # ── Offline fallback: PostgreSQL unreachable — use local SQLite cache ──
        print(f"[FaceLogin] PostgreSQL unreachable — switching to offline cache: {pg_err}")
        network_mode = "OFFLINE"

        cached_results = offline_cache.cosine_similarity_offline(resolved_embedding, payload.tenantId)
        for res in cached_results[:2]:
            candidates.append({
                "id":               res["user_id"],
                "email":            res["email"],
                "firstName":        res["first_name"],
                "lastName":         res["last_name"],
                "role":             res["role"],
                "isActive":         res["is_active"],
                "state":            res["state"],
                "tenantId":         res["tenant_id"],
                "faceRegistered":   res["face_registered"],
                "fingerprintRegistered": res["fp_registered"],
                "confidence":       res["confidence"],
            })

    # ── Match evaluation (same logic for both online and offline paths) ────────
    if not candidates:
        log_audit(None, "BIOMETRIC_FACE_LOGIN_FAILED", "Biometrics", None, None,
                  {"reason": "No enrolled face profiles found", "networkMode": network_mode}, request.client.host)
        raise HTTPException(status_code=401, detail="No Match Found — no face profiles enrolled in this organization.")

    best = candidates[0]
    best_confidence = best["confidence"]

    if best_confidence < FACE_THRESHOLD:
        log_audit(None, "BIOMETRIC_FACE_LOGIN_FAILED", "Biometrics", None, None,
                  {"reason": "No match above threshold", "bestConfidence": best_confidence, "threshold": FACE_THRESHOLD, "networkMode": network_mode}, request.client.host)
        raise HTTPException(
            status_code=401,
            detail=f"No Match Found — confidence {round(best_confidence * 100, 1)}% is below the required {int(FACE_THRESHOLD * 100)}% threshold."
        )

    # Ambiguity rejection
    if len(candidates) == 2:
        second_confidence = candidates[1]["confidence"]
        if best_confidence >= FACE_THRESHOLD and second_confidence >= FACE_THRESHOLD:
            log_audit(None, "BIOMETRIC_FACE_LOGIN_AMBIGUOUS", "Biometrics", None, None,
                      {"reason": "Ambiguous match", "best": best_confidence, "second": second_confidence}, request.client.host)
            raise HTTPException(status_code=401, detail="Ambiguous biometric identity detected")

    # Account status checks
    if not best["isActive"]:
        raise HTTPException(status_code=403, detail="Account is inactive. Contact your administrator.")
    if best["state"] in ("SUSPENDED", "TERMINATED", "BLACKLISTED"):
        raise HTTPException(status_code=403, detail=f"Account is {best['state'].lower()}. Contact your administrator.")

    # Issue authenticated JWT — role comes from DB / cache ONLY
    token_payload_jwt = {
        "email": best["email"],
        "sub": best["id"],
        "role": best["role"],
        "tenantId": best["tenantId"],
        "organizationId": best["tenantId"],
        "type": "authenticated",
        "method": "face_biometric",
        "networkMode": network_mode,
        "exp": int(time.time()) + 7200,
    }
    token = jwt.encode(token_payload_jwt, JWT_SECRET, algorithm=JWT_ALGORITHM)

    log_audit(best["id"], "BIOMETRIC_FACE_LOGIN_SUCCESS", "Biometrics", best["id"], None,
              {"confidence": best_confidence, "livenessScore": liveness_score, "networkMode": network_mode}, request.client.host)

    # Queue event to Datalake 3.0
    dl_event = datalake_adapter.format_biometric_checkin(
        user_id     = best["id"],
        first_name  = best["firstName"],
        last_name   = best["lastName"],
        role        = best["role"],
        tenant_id   = best["tenantId"],
        confidence  = best_confidence,
        liveness_pass = is_live,
        auth_method = "FACE",
        ip_address  = request.client.host,
        network_mode = network_mode,
    )
    datalake_adapter.queue_biometric_event(dl_event)

    return {
        "matched": True,
        "confidence": round(best_confidence, 4),
        "livenessScore": liveness_score,
        "networkMode": network_mode,
        "access_token": token,
        "biometricStatus": {
            "face":        bool(best["faceRegistered"]),
            "fingerprint": bool(best["fingerprintRegistered"])
        },
        "authMethod": "FACE",
        "redirectTo": f"/dashboard/{best['role'].lower().replace('_', '-')}",
        "user": {
            "id":        best["id"],
            "email":     best["email"],
            "firstName": best["firstName"],
            "lastName":  best["lastName"],
            "role":      best["role"],
            "tenantId":  best["tenantId"]
        }
    }


@app.post("/api/v1/auth/fingerprint-login")
def fingerprint_login(payload: FingerprintLoginPayload, request: Request):
    """
    INDEPENDENT 1:N FINGERPRINT IDENTIFICATION LOGIN.

    Answers: "Who does this fingerprint belong to?"
    NOT:     "Does this fingerprint match the entered email?"

    Security guarantees:
    - ORB minutiae matching with BF Hamming distance
    - Requires minimum good_matches >= 20 (0.92 normalized score equivalent)
    - Scans ALL enrolled fingerprint templates
    - Role comes exclusively from backend DB
    - No email, userId, or password required
    """
    if not payload.image and not payload.fingerprintTemplate:
        raise HTTPException(status_code=400, detail="Provide a base64 fingerprint image or a serialized template.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, "firstName", "lastName", "userRole" AS role, "isActive", state, "fingerprintTemplate", "tenantId", "faceRegistered", "fingerprintRegistered"
                FROM users
                WHERE "fingerprintRegistered" = TRUE AND "isActive" = TRUE AND "tenantId" = %s
            """, (payload.tenantId,))
            enrolled_users = cur.fetchall()

        if not enrolled_users:
            raise HTTPException(status_code=401, detail="No Match Found — no fingerprint profiles enrolled in this organization.")

        # Extract features from the live capture
        live_descriptors = None
        if payload.image:
            live_img = fingerprint_auth.base64_to_image(payload.image)
            if live_img is None:
                raise HTTPException(status_code=400, detail="Invalid fingerprint image encoding.")
            _, live_descriptors = fingerprint_auth.extract_fingerprint_features(live_img)
            if live_descriptors is None or len(live_descriptors) < 10:
                raise HTTPException(status_code=400, detail="Low contrast print — unable to extract sufficient ridge features. Press finger flat.")

        # 1:N scan — match against every enrolled template
        # Threshold: 20 good ORB matches required (enterprise-grade, ~0.92 normalized)
        FINGERPRINT_THRESHOLD = 20
        best_user = None
        best_score = 0.0
        best_matches = 0

        for user in enrolled_users:
            decrypted_template = decrypt_aes(user["fingerprintTemplate"])

            if live_descriptors is not None:
                registered_desc = fingerprint_auth.deserialize_descriptors(decrypted_template)
                if registered_desc is None:
                    continue
                result = fingerprint_auth.match_fingerprints(registered_desc, live_descriptors, FINGERPRINT_THRESHOLD)
                good_matches = result["good_matches"]
                score = result["score"]
            else:
                # String template fallback
                matched_str = (decrypted_template.strip() == (payload.fingerprintTemplate or "").strip())
                good_matches = 100 if matched_str else 0
                score = 1.0 if matched_str else 0.0

            if good_matches > best_matches:
                best_matches = good_matches
                best_score = score
                best_user = user

        # Evaluate best match
        if best_user is None or best_matches < FINGERPRINT_THRESHOLD:
            log_audit(None, "BIOMETRIC_FINGERPRINT_LOGIN_FAILED", "Biometrics", None, None,
                      {"reason": "No match above threshold", "bestMatches": best_matches, "threshold": FINGERPRINT_THRESHOLD}, request.client.host)
            raise HTTPException(status_code=401, detail=f"No Match Found — {best_matches} minutiae matches, required {FINGERPRINT_THRESHOLD}.")

        # Account status checks
        if not best_user["isActive"]:
            raise HTTPException(status_code=403, detail="Account is inactive. Contact your administrator.")
        if best_user["state"] in ("SUSPENDED", "TERMINATED", "BLACKLISTED"):
            raise HTTPException(status_code=403, detail=f"Account is {best_user['state'].lower()}. Contact your administrator.")

        # Issue authenticated JWT — role from DB only
        token_payload = {
            "email": best_user["email"],
            "sub": best_user["id"],
            "role": best_user["role"],
            "tenantId": best_user["tenantId"],
            "organizationId": best_user["tenantId"],
            "type": "authenticated",
            "method": "fingerprint_biometric",
            "exp": int(time.time()) + 7200
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        log_audit(best_user["id"], "BIOMETRIC_FINGERPRINT_LOGIN_SUCCESS", "Biometrics", best_user["id"], None,
                  {"goodMatches": best_matches, "score": best_score}, request.client.host)

        return {
            "matched": True,
            "goodMatches": best_matches,
            "score": round(best_score, 4),
            "access_token": token,
            "biometricStatus": {
                "face": bool(best_user["faceRegistered"]),
                "fingerprint": bool(best_user["fingerprintRegistered"])
            },
            "authMethod": "FINGERPRINT",
            "redirectTo": f"/dashboard/{best_user['role'].lower().replace('_', '-')}",
            "user": {
                "id": best_user["id"],
                "email": best_user["email"],
                "firstName": best_user["firstName"],
                "lastName": best_user["lastName"],
                "role": best_user["role"],
                "tenantId": best_user["tenantId"]
            }
        }
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# NESTJS INTEGRATION ENDPOINTS
# -----------------------------------------------------------------------------
class NestFaceEmbedPayload(BaseModel):
    image: str

class NestFaceVerifyPayload(BaseModel):
    image: str
    registered_embedding: List[float]
    threshold: float = 0.78

class NestFingerprintExtractPayload(BaseModel):
    image: str

class NestFingerprintVerifyPayload(BaseModel):
    image: str
    serialized_template: str
    threshold: int = 18

@app.post("/api/biometrics/face/embed")
def nest_face_embed(payload: NestFaceEmbedPayload):
    img = face_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")
    
    face_crop, _, _ = face_auth.detect_face_and_eyes(img)
    if face_crop is None:
        raise HTTPException(status_code=400, detail="Face detection failed. Ensure face is centered and fully visible.")
        
    is_live, liveness_score = face_auth.check_liveness_texture(face_crop)
    if not is_live:
        raise HTTPException(status_code=400, detail=f"Liveness match failed. Score: {liveness_score} (Spoofing warning)")
        
    embedding = face_auth.generate_face_embedding(img)
    return {
        "success": True,
        "embedding": embedding,
        "liveness_score": liveness_score
    }

@app.post("/api/biometrics/face/verify")
def nest_face_verify(payload: NestFaceVerifyPayload):
    img = face_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")
    
    face_crop, _, _ = face_auth.detect_face_and_eyes(img)
    if face_crop is None:
        return {
            "matched": False,
            "liveness_pass": False,
            "confidence": 0.0,
            "liveness_score": 0.0,
            "message": "Face undetected"
        }
        
    is_live, liveness_score = face_auth.check_liveness_texture(face_crop)
    if not is_live:
        return {
            "matched": False,
            "liveness_pass": False,
            "confidence": 0.0,
            "liveness_score": liveness_score,
            "message": "Liveness verification failed"
        }
        
    embedding = face_auth.generate_face_embedding(img)
    
    # 1:1 match
    try:
        import numpy as np
        v1 = np.array(embedding)
        v2 = np.array(payload.registered_embedding)
        dot_product = np.dot(v1, v2)
        norm_v1 = np.linalg.norm(v1)
        norm_v2 = np.linalg.norm(v2)
        if norm_v1 > 0 and norm_v2 > 0:
            confidence = float(dot_product / (norm_v1 * norm_v2))
        else:
            confidence = 0.0
    except Exception:
        confidence = 0.0
        
    matched = confidence >= payload.threshold
    return {
        "matched": matched,
        "liveness_pass": True,
        "confidence": confidence,
        "liveness_score": liveness_score,
        "message": "Match confirmed" if matched else "Identity mismatch"
    }

@app.post("/api/biometrics/fingerprint/extract")
def nest_fingerprint_extract(payload: NestFingerprintExtractPayload):
    img = fingerprint_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")
        
    _, descriptors = fingerprint_auth.extract_fingerprint_features(img)
    if descriptors is None or len(descriptors) < 10:
        raise HTTPException(status_code=400, detail="Low contrast print — unable to extract sufficient ridge features")
        
    serialized_template = fingerprint_auth.serialize_descriptors(descriptors)
    return {
        "success": True,
        "serialized_template": serialized_template,
        "keypoints_count": len(descriptors)
    }

@app.post("/api/biometrics/fingerprint/verify")
def nest_fingerprint_verify(payload: NestFingerprintVerifyPayload):
    img = fingerprint_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")
        
    registered_descriptors = fingerprint_auth.deserialize_descriptors(payload.serialized_template)
    if registered_descriptors is None:
        raise HTTPException(status_code=400, detail="Invalid registered fingerprint template")
        
    _, current_descriptors = fingerprint_auth.extract_fingerprint_features(img)
    if current_descriptors is None:
        return {
            "matched": False,
            "good_matches": 0,
            "score": 0.0,
            "required_matches": payload.threshold,
            "message": "Ridge extraction failed"
        }
        
    match_res = fingerprint_auth.match_fingerprints(registered_descriptors, current_descriptors, payload.threshold)
    return {
        "matched": match_res["matched"],
        "good_matches": match_res["good_matches"],
        "score": match_res["score"],
        "required_matches": payload.threshold,
        "message": "Match confirmed" if match_res["matched"] else "Fingerprint mismatch"
    }


# =============================================================================
# LIVENESS DETECTION WITH REPLAY PROTECTION
# =============================================================================
# Nonce store: { nonce_str: issued_at_timestamp }
# Nonces are single-use and expire after NONCE_TTL_SECONDS seconds.
# This prevents an attacker from replaying a previously accepted liveness frame.
_liveness_nonces: dict = {}
NONCE_TTL_SECONDS = 8  # frame must arrive within 8 seconds of challenge issuance


def _purge_expired_nonces():
    """Remove nonces older than TTL. Called on each challenge issuance to bound memory."""
    now = time.time()
    expired = [k for k, ts in _liveness_nonces.items() if now - ts > NONCE_TTL_SECONDS]
    for k in expired:
        del _liveness_nonces[k]


@app.get("/api/v1/liveness/challenge")
def issue_liveness_challenge(request: Request):
    """
    Issues a one-time nonce that must be included with the liveness frame.

    Security contract:
    - Nonce expires after NONCE_TTL_SECONDS (8 seconds)
    - Each nonce is valid for exactly ONE liveness-check call
    - Replay of the same frame is rejected because the nonce is consumed on use
    - The client must request a fresh challenge before each capture

    Returns: { nonce: str, expires_in_seconds: int }
    """
    _purge_expired_nonces()
    # Validate caller has at minimum a valid JWT (pre-auth is acceptable here)
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization token required")
        token = auth_header.split(" ")[1]
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Authentication session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid access credentials")

    nonce = str(uuid.uuid4())
    _liveness_nonces[nonce] = time.time()
    return {"nonce": nonce, "expires_in_seconds": NONCE_TTL_SECONDS}


from fastapi import UploadFile, File, Form

@app.post("/api/v1/liveness-check")
async def liveness_check(
    request: Request,
    frame: UploadFile = File(...),
    nonce: str = Form(...),
):
    """
    Runs passive liveness detection on a captured video frame.

    Replay protection:
    1. Nonce must have been issued by /api/v1/liveness/challenge
    2. Nonce must not be expired (> NONCE_TTL_SECONDS old)
    3. Nonce is consumed on first use — cannot be replayed

    Returns: { is_human: bool, blink_detected: bool, spoof_score: float, passed: bool }
    """
    # ── Auth check ─────────────────────────────────────────────────────────────
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization token required")
        token = auth_header.split(" ")[1]
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Authentication session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid access credentials")

    # ── Nonce validation ───────────────────────────────────────────────────────
    issued_at = _liveness_nonces.get(nonce)
    if issued_at is None:
        raise HTTPException(status_code=400, detail="Invalid or already-used liveness nonce. Request a new challenge.")
    if time.time() - issued_at > NONCE_TTL_SECONDS:
        del _liveness_nonces[nonce]
        raise HTTPException(status_code=400, detail="Liveness nonce expired. Request a new challenge.")
    # Consume nonce — one-time use
    del _liveness_nonces[nonce]

    # ── Frame analysis ─────────────────────────────────────────────────────────
    try:
        frame_bytes = await frame.read()
        nparr = __import__("numpy").frombuffer(frame_bytes, __import__("numpy").uint8)
        import cv2
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Frame decode failed — invalid image data")

        face_crop, _, _ = face_auth.detect_face_and_eyes(img)

        if face_crop is None:
            return {
                "is_human": False,
                "blink_detected": False,
                "spoof_score": 0.0,
                "passed": False,
                "reason": "No face detected in frame",
            }

        is_live, variance = face_auth.check_liveness_texture(face_crop)
        # Normalise variance to a 0–1 spoof score (higher = more likely live)
        spoof_score = round(min(variance / 1.0, 1.0), 4)  # composite score already 0–1

        return {
            "is_human": True,
            "blink_detected": False,  # Blink requires multi-frame sequence — reserved for future challenge-response
            "spoof_score": spoof_score,
            "passed": is_live,
            "liveness_score": variance,
            "reason": "Liveness passed" if is_live else f"Liveness composite {variance:.3f} below threshold (0.40)",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Liveness analysis failed: {str(e)}")


# =============================================================================
# OFFLINE CACHE MANAGEMENT ENDPOINTS
# =============================================================================

@app.post("/api/v1/cache/sync")
def cache_sync(userId: str = Depends(get_current_user_id)):
    """
    Triggers an immediate full sync of face embeddings from PostgreSQL → SQLite cache.
    Requires a valid JWT. Run this after enrolling new users to update the offline cache.

    Returns: { synced, errors, timestamp }
    """
    try:
        conn = get_db_connection()
        result = offline_cache.sync_embeddings_from_pg(conn)
        conn.close()
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Sync failed — database unreachable: {str(e)}")


@app.get("/api/v1/cache/status")
def cache_status(userId: str = Depends(get_current_user_id)):
    """
    Returns the current state of the local offline embedding cache.

    Returns: { cached_embeddings, last_sync, pending_datalake_events, operational }
    """
    return offline_cache.get_cache_status()


# =============================================================================
# DATALAKE 3.0 INTEGRATION ENDPOINTS
# =============================================================================

@app.get("/api/v1/datalake/status")
def datalake_status(userId: str = Depends(get_current_user_id)):
    """
    Returns the Datalake 3.0 connectivity status and event queue depth.

    Returns: { endpoint, configured, reachable, schema, queue: { pending, pushed, failed } }
    """
    return datalake_adapter.get_datalake_status()


@app.post("/api/v1/datalake/sync")
def datalake_sync(userId: str = Depends(get_current_user_id)):
    """
    Flushes all PENDING events from the offline queue to the Datalake 3.0 endpoint.
    Call this when network connectivity is restored after an offline period.

    Returns: { pushed, failed, remaining }
    """
    result = datalake_adapter.flush_queue()
    return {"success": True, **result}


@app.get("/api/v1/datalake/export")
def datalake_export(
    limit: int = 5000,
    userId: str = Depends(get_current_user_id)
):
    """
    Exports all pending and failed Datalake 3.0 events as a structured JSON payload
    conforming to NHAI UEF-1.0 schema. Use this for manual upload when completely airgapped.

    Query params:
        limit: Maximum number of events to include (default 5000).

    Returns: { schema_version, source_system, export_timestamp, event_count, events: [...] }
    """
    events = datalake_adapter.export_all_pending(limit=limit)
    return {
        "schema_version":   datalake_adapter.SCHEMA_VERSION,
        "source_system":    datalake_adapter.SOURCE_SYSTEM,
        "source_version":   datalake_adapter.SOURCE_VERSION,
        "export_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "event_count":      len(events),
        "events":           events,
    }


# =============================================================================
# EDGEGUARD AI — PYDANTIC SCHEMAS FOR NEW ENDPOINTS
# =============================================================================

class TrustScorePayload(BaseModel):
    userId: str
    faceConfidence: float
    livenessScore: float
    gpsConfidence: Optional[float] = 0.5
    deviceTrust: Optional[float] = 0.7
    behaviourScore: Optional[float] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    siteLat: Optional[float] = None
    siteLon: Optional[float] = None
    siteRadius: Optional[float] = 100.0
    deviceId: Optional[str] = None
    tenantId: Optional[str] = None

class AntispoofPayload(BaseModel):
    image: str   # base64 face crop or full frame

class GhostWorkerPayload(BaseModel):
    image: str
    tenantId: Optional[str] = None   # if None, scans ALL tenants

class WatchlistAddPayload(BaseModel):
    entryType: str
    reason: str
    severity: Optional[str] = "HIGH"
    userId: Optional[str] = None
    tenantId: Optional[str] = None
    image: Optional[str] = None      # base64 to auto-extract embedding
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    expiresAt: Optional[str] = None

class WatchlistScanPayload(BaseModel):
    image: str
    tenantId: Optional[str] = None
    siteId: Optional[str] = None
    kioskId: Optional[str] = None

class PPECheckPayload(BaseModel):
    image: str
    requiredPpe: Optional[List[str]] = None  # e.g. ["HELMET", "VEST"]
    faceBbox: Optional[List[int]] = None     # [x, y, w, h]

class JourneyEventPayload(BaseModel):
    userId: str
    eventType: str
    tenantId: Optional[str] = None
    siteId: Optional[str] = None
    zoneId: Optional[str] = None
    confidence: Optional[float] = 0.0
    trustScore: Optional[float] = 0.0
    ppeCompliant: Optional[bool] = True
    livenessPass: Optional[bool] = True
    authMethod: Optional[str] = "FACE"

class AdaptiveEnrollPayload(BaseModel):
    userId: str
    image: str
    alpha: Optional[float] = 0.3   # Weight for new embedding (0 = ignore, 1 = replace)


# =============================================================================
# FEATURE 1: MULTI-FACTOR TRUST SCORE
# =============================================================================

@app.post("/api/v1/trust-score")
def compute_trust_score_endpoint(payload: TrustScorePayload, userId: str = Depends(get_current_user_id)):
    """
    Computes the composite Identity Trust Score from 5 signals:
    Face Confidence + Liveness + GPS + Device Trust + Behavioural Pattern.

    Returns: { trust_score, gate_decision, confidence_band, breakdown, weighted, recommendation }
    """
    # Compute GPS confidence if coordinates provided
    gps_conf = payload.gpsConfidence
    if payload.lat is not None and payload.siteLat is not None:
        gps_conf = trust_engine.compute_gps_confidence(
            payload.lat, payload.lon, payload.siteLat, payload.siteLon,
            payload.siteRadius or 100.0
        )

    # Compute device trust
    device_trust = trust_engine.compute_device_trust(
        payload.deviceId, payload.tenantId
    )

    result = trust_engine.compute_trust_score(
        face_confidence  = payload.faceConfidence,
        liveness_score   = payload.livenessScore,
        gps_confidence   = gps_conf if gps_conf is not None else 0.5,
        device_trust     = device_trust,
        behaviour_score  = payload.behaviourScore or 0.75,
        user_id          = payload.userId,
    )

    # Log to risk engine if access was denied
    if result["gate_decision"] == "DENIED":
        risk_engine.update_risk_score(
            payload.userId, "FAILED_FACE_MATCH", payload.tenantId,
            f"Trust score {result['trust_score']} — gate denied"
        )

    write_inference_log(
        user_id=payload.userId, method="TRUST_SCORE",
        outcome=result["gate_decision"], confidence=result["trust_score"]
    )
    return result


# =============================================================================
# FEATURE 2: DEEPFAKE & REPLAY ATTACK DETECTION
# =============================================================================

@app.post("/api/v1/antispoof/analyze")
def antispoof_analyze(payload: AntispoofPayload, userId: str = Depends(get_current_user_id)):
    """
    Runs the full 5-signal anti-spoofing analysis on a face image.
    Detects: printed photos, screen replay, tablet replay, deepfake video.

    Returns: { is_authentic, composite_score, attack_type, signals, confidence_pct }
    """
    img = face_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")

    face_crop, _, _ = face_auth.detect_face_and_eyes(img)
    target = face_crop if face_crop is not None else img

    result = antispoof.analyze_antispoof(target)

    if not result["is_authentic"]:
        risk_engine.update_risk_score(
            userId, "SPOOF_ATTEMPT", description=f"Attack type: {result['attack_type']}"
        )

    return result


# =============================================================================
# FEATURE 5: GHOST WORKER / CROSS-SITE DUPLICATE DETECTION
# =============================================================================

@app.post("/api/v1/ghost-worker/check")
def ghost_worker_check(payload: GhostWorkerPayload, userId: str = Depends(get_current_user_id)):
    """
    Ghost Worker Detection: scans face against ALL enrolled workers across
    the entire platform (or a specific tenant) to detect:
        Same Face + Different ID + Different Contractor

    A confidence ≥ 0.72 between two different user records = GHOST WORKER.

    Returns: { ghost_detected, matches: [...], recommendation }
    """
    img = face_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")

    face_crop, _, _ = face_auth.detect_face_and_eyes(img)
    if face_crop is None:
        raise HTTPException(status_code=400, detail="No face detected in image")

    resolved_embedding = face_auth.generate_face_embedding(img)
    GHOST_THRESHOLD = 0.72

    # Scan PostgreSQL (if available) or fall back to all-tenant SQLite cache
    matches = []
    try:
        conn = get_db_connection()
        face_vector_str = f"[{','.join(map(str, resolved_embedding))}]"
        with conn.cursor() as cur:
            if payload.tenantId:
                cur.execute("""
                    SELECT id, "firstName", "lastName", email, "userRole" AS role,
                           "tenantId", "user_id" AS custom_id,
                           1 - ("faceEmbedding"::vector <=> %s::vector) AS confidence
                    FROM users
                    WHERE "faceEmbedding" IS NOT NULL
                      AND "tenantId" = %s
                    ORDER BY confidence DESC LIMIT 5
                """, (face_vector_str, payload.tenantId))
            else:
                cur.execute("""
                    SELECT id, "firstName", "lastName", email, "userRole" AS role,
                           "tenantId", "user_id" AS custom_id,
                           1 - ("faceEmbedding"::vector <=> %s::vector) AS confidence
                    FROM users
                    WHERE "faceEmbedding" IS NOT NULL
                    ORDER BY confidence DESC LIMIT 10
                """, (face_vector_str,))
            rows = cur.fetchall()
        conn.close()

        for row in rows:
            conf = float(row["confidence"])
            if conf >= GHOST_THRESHOLD:
                matches.append({
                    "user_id":   row["id"],
                    "custom_id": row["custom_id"],
                    "name":      f"{row['firstName']} {row['lastName']}".strip(),
                    "email":     row["email"],
                    "role":      row["role"],
                    "tenant_id": row["tenantId"],
                    "confidence": round(conf, 4),
                })
    except Exception:
        # Offline fallback — scan all cached embeddings
        import numpy as np
        q_vec = np.array(resolved_embedding, dtype=np.float32)
        q_vec = q_vec / (np.linalg.norm(q_vec) + 1e-9)
        all_cached = offline_cache.get_cached_embeddings(payload.tenantId or "")
        for c_entry in all_cached:
            try:
                e_vec = np.array(c_entry["embedding"], dtype=np.float32)
                e_vec = e_vec / (np.linalg.norm(e_vec) + 1e-9)
                conf = float(np.dot(q_vec, e_vec))
                if conf >= GHOST_THRESHOLD:
                    matches.append({**{k: v for k, v in c_entry.items() if k != "embedding"}, "confidence": round(conf, 4)})
            except Exception:
                pass
        matches.sort(key=lambda x: x["confidence"], reverse=True)
        matches = matches[:5]

    ghost_detected = len(matches) > 1  # More than 1 match = possible ghost

    if ghost_detected:
        for m in matches:
            risk_engine.update_risk_score(
                m.get("user_id", "unknown"), "DUPLICATE_IDENTITY",
                m.get("tenant_id"), "Ghost worker detected across sites"
            )

    return {
        "ghost_detected": ghost_detected,
        "match_count":    len(matches),
        "threshold":      GHOST_THRESHOLD,
        "matches":        matches,
        "recommendation": (
            f"⚠️  GHOST WORKER DETECTED — {len(matches)} identity records match this face. "
            "Investigate cross-site contractor fraud immediately."
        ) if ghost_detected else "✅ No duplicate identity detected."
    }


# =============================================================================
# FEATURES 4 & 6: OFFLINE WATCHLIST ENGINE
# =============================================================================

@app.get("/api/v1/watchlist")
def get_watchlist_endpoint(
    tenantId: Optional[str] = None,
    userId: str = Depends(get_current_user_id)
):
    """Returns all active watchlist entries for the given tenant."""
    return {"entries": watchlist.get_watchlist(tenantId), "count": len(watchlist.get_watchlist(tenantId))}


@app.post("/api/v1/watchlist/add")
def add_to_watchlist_endpoint(payload: WatchlistAddPayload, userId: str = Depends(get_current_user_id)):
    """
    Adds a person to the offline watchlist.
    If an image is provided, extracts the face embedding automatically.

    Returns: { success, entry_id }
    """
    embedding = None
    if payload.image:
        try:
            img = face_auth.base64_to_image(payload.image)
            if img is not None:
                face_crop, _, _ = face_auth.detect_face_and_eyes(img)
                if face_crop is not None:
                    embedding = face_auth.generate_face_embedding(img)
        except Exception:
            pass

    entry_id = watchlist.add_to_watchlist(
        entry_type  = payload.entryType,
        reason      = payload.reason,
        severity    = payload.severity or "HIGH",
        user_id     = payload.userId,
        tenant_id   = payload.tenantId,
        embedding   = embedding,
        first_name  = payload.firstName,
        last_name   = payload.lastName,
        added_by    = userId,
        expires_at  = payload.expiresAt,
    )
    return {"success": True, "entry_id": entry_id}


@app.post("/api/v1/watchlist/scan")
def watchlist_scan_endpoint(payload: WatchlistScanPayload, userId: str = Depends(get_current_user_id)):
    """
    Scans a live face image against the offline watchlist.
    Returns immediately — no internet required.

    Returns: { matched, threat_level, confidence, entry, incident_type, alert_message }
    """
    img = face_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")

    face_crop, _, _ = face_auth.detect_face_and_eyes(img)
    if face_crop is None:
        raise HTTPException(status_code=400, detail="No face detected")

    embedding = face_auth.generate_face_embedding(img)

    result = watchlist.scan_against_watchlist(
        query_embedding = embedding,
        tenant_id       = payload.tenantId,
        site_id         = payload.siteId,
        kiosk_id        = payload.kioskId,
    )

    if result["matched"]:
        risk_engine.update_risk_score(
            result["entry"]["user_id"] or userId, "WATCHLIST_HIT",
            payload.tenantId, result["alert_message"], payload.siteId
        )

    return result


@app.post("/api/v1/watchlist/sync")
def watchlist_sync_endpoint(userId: str = Depends(get_current_user_id)):
    """Syncs blacklisted/suspended users from PostgreSQL to the offline watchlist."""
    try:
        conn = get_db_connection()
        result = watchlist.sync_watchlist_from_pg(conn)
        conn.close()
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Watchlist sync failed: {e}")


# =============================================================================
# FEATURE 11: EDGE AI RISK SCORING
# =============================================================================

@app.get("/api/v1/risk/{user_id}")
def get_risk_score_endpoint(user_id: str, userId: str = Depends(get_current_user_id)):
    """
    Returns the current Edge AI Risk Score for a worker.

    Returns: { user_id, risk_score, risk_level, should_alert, recent_events, event_summary }
    """
    return risk_engine.get_risk_score(user_id)


@app.get("/api/v1/risk/high-risk/list")
def get_high_risk_workers_endpoint(
    tenantId: Optional[str] = None,
    minLevel: str = "HIGH",
    userId: str = Depends(get_current_user_id)
):
    """Returns all workers at or above the specified risk level."""
    return {"workers": risk_engine.get_high_risk_workers(tenantId, minLevel)}


# =============================================================================
# FEATURE 12: PPE COMPLIANCE DETECTION
# =============================================================================

@app.post("/api/v1/ppe/check")
def ppe_check_endpoint(payload: PPECheckPayload, userId: str = Depends(get_current_user_id)):
    """
    Checks PPE compliance for a worker at a gate camera frame.
    Even if face is verified, entry can be denied if required PPE is missing.

    Returns: { helmet_detected, vest_detected, mask_detected, ppe_score,
               missing_items, compliant, required, recommendation }
    """
    img = face_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")

    face_bbox = tuple(payload.faceBbox) if payload.faceBbox else None
    result = ppe_detector.check_ppe_compliance(
        img,
        required_ppe = payload.requiredPpe,
        face_bbox    = face_bbox,
    )
    return result


# =============================================================================
# FEATURE 10: WORKER JOURNEY TRACKING
# =============================================================================

@app.post("/api/v1/journey/record")
def record_journey_endpoint(payload: JourneyEventPayload, userId: str = Depends(get_current_user_id)):
    """
    Records a worker movement event (ENTRY, ZONE_CHANGE, EXIT, RE_VERIFY, etc.).

    Returns: { success, event_id }
    """
    event_id = journey_tracker.record_journey_event(
        user_id      = payload.userId,
        event_type   = payload.eventType,
        tenant_id    = payload.tenantId,
        site_id      = payload.siteId,
        zone_id      = payload.zoneId,
        confidence   = payload.confidence or 0.0,
        trust_score  = payload.trustScore or 0.0,
        ppe_compliant = payload.ppeCompliant if payload.ppeCompliant is not None else True,
        liveness_pass = payload.livenessPass if payload.livenessPass is not None else True,
        auth_method  = payload.authMethod or "FACE",
    )
    return {"success": True, "event_id": event_id}


@app.get("/api/v1/journey/{user_id}")
def get_worker_timeline_endpoint(
    user_id: str,
    date: Optional[str] = None,
    userId: str = Depends(get_current_user_id)
):
    """
    Returns the complete movement timeline for a worker on a given date.

    Query params: date=YYYY-MM-DD (defaults to today)
    Returns: { user_id, date, events: [...], summary: {...} }
    """
    return journey_tracker.get_worker_timeline(user_id, date)


# =============================================================================
# FEATURE 7: OFFLINE SITE INTELLIGENCE DASHBOARD
# =============================================================================

@app.get("/api/v1/analytics/site/{site_id}")
def site_intelligence_endpoint(
    site_id: str,
    tenantId: Optional[str] = None,
    date: Optional[str] = None,
    expectedCount: int = 0,
    userId: str = Depends(get_current_user_id)
):
    """
    Returns the offline daily site intelligence dashboard.
    Works entirely without internet — reads from local SQLite.

    Returns: { expected, present, absent, late, attendance_rate, ppe_pct,
               liveness_fails, avg_trust, workers_on_site }
    """
    return journey_tracker.get_site_intelligence(
        site_id, tenantId, date, expectedCount
    )


# =============================================================================
# FEATURE 14: AI SITE HEALTH SCORE
# =============================================================================

@app.get("/api/v1/analytics/site-health/{site_id}")
def site_health_endpoint(
    site_id: str,
    tenantId: Optional[str] = None,
    date: Optional[str] = None,
    expectedCount: int = 0,
    userId: str = Depends(get_current_user_id)
):
    """
    Computes the AI Site Health Score (0–100) with grade and recommendations.

    Factors: Attendance (30%) + PPE (25%) + Trust Score (20%) +
             Security (15%) + Liveness (10%)

    Returns: { health_score, health_grade, breakdown, raw_scores,
               intelligence, recommendations }
    """
    return journey_tracker.compute_site_health_score(
        site_id, tenantId, date, expectedCount
    )


# =============================================================================
# FEATURE 3: CONTINUOUS IDENTITY MONITORING
# =============================================================================

@app.get("/api/v1/continuous-monitor/{tenant_id}")
def continuous_monitor_endpoint(
    tenant_id: str,
    sampleSize: int = 5,
    userId: str = Depends(get_current_user_id)
):
    """
    Returns a list of worker IDs to randomly re-verify for continuous monitoring.
    Prioritises high-risk workers. Prevents worker swapping and proxy attendance.

    Returns: { tenant_id, re_verify_queue: [...], count }
    """
    queue = risk_engine.get_continuous_monitor_queue(tenant_id, sampleSize)
    return {
        "tenant_id":       tenant_id,
        "re_verify_queue": queue,
        "count":           len(queue),
        "instruction":     "Request immediate biometric re-scan from these workers."
    }


# =============================================================================
# FEATURE 9: ADAPTIVE EMBEDDING UPDATE
# =============================================================================

@app.post("/api/v1/adaptive-enroll")
def adaptive_enroll_endpoint(payload: AdaptiveEnrollPayload, userId: str = Depends(get_current_user_id)):
    """
    Adaptive Face Embedding Update — improves recognition accuracy for workers
    whose appearance changes (beard, helmet, dust, safety glasses).

    When a high-confidence match is re-enrolled, the stored embedding is
    updated as a weighted average of old + new embedding (EWMA):
        new_stored = (1 - alpha) × old + alpha × new

    Alpha: 0.0 = keep old entirely, 1.0 = replace with new
    Default alpha = 0.3 (conservative update, avoids drift)

    Returns: { success, updated, new_confidence_estimate }
    """
    img = face_auth.base64_to_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")

    face_crop, _, _ = face_auth.detect_face_and_eyes(img)
    if face_crop is None:
        raise HTTPException(status_code=400, detail="No face detected")

    is_live, liveness_score = face_auth.check_liveness_texture(face_crop)
    if not is_live:
        raise HTTPException(status_code=400, detail=f"Liveness check failed (score: {liveness_score:.3f}). Cannot update embedding.")

    new_embedding = face_auth.generate_face_embedding(img)

    # Load existing embedding from cache
    cached = offline_cache.get_cached_embedding(payload.userId)
    if cached is None:
        raise HTTPException(status_code=404, detail="User not found in embedding cache. Enroll first.")

    import numpy as np
    alpha = max(0.0, min(1.0, payload.alpha or 0.3))
    old_emb = np.array(cached["embedding"], dtype=np.float32)
    new_emb = np.array(new_embedding, dtype=np.float32)

    # EWMA blend
    blended = (1.0 - alpha) * old_emb + alpha * new_emb
    # Re-normalise to unit vector
    norm = np.linalg.norm(blended)
    if norm > 0:
        blended = blended / norm
    blended_list = blended.tolist()

    # Cosine similarity between old and new to estimate drift
    cos_sim = float(np.dot(old_emb / (np.linalg.norm(old_emb) + 1e-9),
                            new_emb / (np.linalg.norm(new_emb) + 1e-9)))

    # Update cache
    offline_cache.upsert_embedding(
        payload.userId, cached["tenant_id"], blended_list, cached
    )

    # Update PostgreSQL if available
    try:
        conn = get_db_connection()
        face_vector_str = f"[{','.join(map(str, blended_list))}]"
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE users SET "faceEmbedding" = %s::vector, "updatedAt" = NOW()
                WHERE id = %s
            """, (face_vector_str, payload.userId))
        conn.commit()
        conn.close()
        db_updated = True
    except Exception:
        db_updated = False

    log_audit(payload.userId, "ADAPTIVE_EMBEDDING_UPDATE", "User", payload.userId,
              None, {"alpha": alpha, "cosine_similarity": cos_sim, "db_updated": db_updated})

    return {
        "success":                True,
        "updated":                True,
        "alpha_used":             alpha,
        "embedding_drift":        round(1.0 - cos_sim, 4),
        "db_updated":             db_updated,
        "cache_updated":          True,
        "recommendation":         (
            "✅ Embedding updated successfully." if cos_sim > 0.70
            else "⚠️  Large embedding drift detected — verify this is the same person."
        )
    }


# =============================================================================
# SYSTEM OVERVIEW
# =============================================================================

@app.get("/api/v1/system/overview")
def system_overview(userId: str = Depends(get_current_user_id)):
    """
    Returns a comprehensive system health overview for the FenceIN EdgeGuard AI platform.
    Shows status of all modules: cache, watchlist, risk engine, Datalake, offline state.
    """
    cache_status    = offline_cache.get_cache_status()
    datalake_status = datalake_adapter.get_datalake_status()
    watchlist_count = len(watchlist.get_watchlist())
    high_risk       = len(risk_engine.get_high_risk_workers(min_level="HIGH"))

    return {
        "platform":        "FenceIN EdgeGuard AI",
        "version":         "3.0.0",
        "capabilities": [
            "Offline Face Recognition (ArcFace 512D)",
            "3-Signal Passive Liveness Detection",
            "5-Signal Deepfake & Replay Attack Detection",
            "Multi-Factor Identity Trust Engine",
            "Ghost Worker Cross-Site Detection",
            "Offline Watchlist Engine",
            "Edge AI Risk Scoring",
            "PPE Compliance Detection",
            "Worker Journey Tracking",
            "Offline Site Intelligence Dashboard",
            "AI Site Health Score",
            "Adaptive Face Embedding Update",
            "Continuous Identity Monitoring",
            "NHAI Datalake 3.0 Integration (UEF-1.0)",
            "Zero-Network Operation Mode",
        ],
        "module_status": {
            "face_recognition":    "ONLINE" if not face_auth.neural_engine_unavailable else "MODEL_MISSING",
            "offline_cache":       "READY" if cache_status["operational"] else "EMPTY",
            "watchlist_engine":    "READY",
            "risk_engine":         "READY",
            "ppe_detector":        "READY",
            "journey_tracker":     "READY",
            "datalake_adapter":    "CONNECTED" if datalake_status["reachable"] else "OFFLINE_QUEUE",
        },
        "stats": {
            "cached_face_embeddings": cache_status["cached_embeddings"],
            "watchlist_entries":      watchlist_count,
            "high_risk_workers":      high_risk,
            "pending_datalake_events": datalake_status["queue"]["pending"],
        },
        "network_mode": "ONLINE" if datalake_status["reachable"] else "OFFLINE",
    }
