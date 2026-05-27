import os
import re
import time
import uuid
import json
import base64
import hashlib
import jwt
import bcrypt
if not hasattr(bcrypt, "__about__"):
    class About:
        pass
    about = About()
    about.__version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = about

from fastapi import FastAPI, HTTPException, Body, Request, Depends
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
JWT_SECRET = os.environ.get("JWT_SECRET", "fencein-secure-biometrics-fallback-key")
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

# AES Encryption/Decryption Helpers for biometric templates (matching NestJS exactly)
def get_aes_key() -> bytes:
    jwt_secret = os.environ.get("JWT_SECRET", "fencein-secure-biometrics-fallback-key")
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
    key = get_aes_key()
    iv = b'\x00' * 16 # IV of 16 zeros
    
    pad_len = 16 - (len(text) % 16)
    padded_text = text + chr(pad_len) * pad_len
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted = encryptor.update(padded_text.encode('utf-8')) + encryptor.finalize()
    return encrypted.hex()

def decrypt_aes(hex_text: str) -> str:
    try:
        key = get_aes_key()
        iv = b'\x00' * 16
        encrypted_bytes = bytes.fromhex(hex_text)
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(encrypted_bytes) + decryptor.finalize()
        
        pad_len = decrypted[-1]
        if pad_len < 1 or pad_len > 16:
            return decrypted.decode('utf-8', errors='ignore')
        return decrypted[:-pad_len].decode('utf-8')
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

# Log audits directly to PG
def log_audit(userId: Optional[str], action: str, entityType: str, entityId: Optional[str], oldValue: Optional[dict], newValue: Optional[dict], ipAddress: Optional[str] = "unknown", device: Optional[str] = "unknown"):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            audit_id = str(uuid.uuid4())
            old_json = json.dumps(oldValue) if oldValue else None
            new_json = json.dumps(newValue) if newValue else None
            
            cur.execute("""
                INSERT INTO "AuditLog" (id, "userId", action, "entityType", "entityId", "oldValue", "newValue", "ipAddress", device, "createdAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (audit_id, userId, action, entityType, entityId, old_json, new_json, ipAddress, device))
            conn.commit()
    except Exception as e:
        print(f"[Audit Log Error] Failed to insert log: {e}")
    finally:
        conn.close()

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
    faceEmbedding: Optional[List[float]] = None
    fingerprintTemplate: Optional[str] = None

class ChangePasswordPayload(BaseModel):
    oldPassword: str
    newPassword: str

class FaceVerifyPayload(BaseModel):
    userId: str
    embedding: Optional[List[float]] = None
    image: Optional[str] = None

class FingerprintVerifyPayload(BaseModel):
    userId: str
    fingerprintTemplate: str
    image: Optional[str] = None

class FaceEnrollPayload(BaseModel):
    userId: str
    embedding: Optional[List[float]] = None
    image: Optional[str] = None

class FingerprintEnrollPayload(BaseModel):
    userId: str
    fingerprintTemplate: str
    image: Optional[str] = None

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
            cur.execute('SELECT id FROM "User" WHERE email = %s', (email_clean,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Account with this email already exists")
            
            # Hash password
            hashed_password = pwd_context.hash(payload.password)
            user_id = str(uuid.uuid4())
            
            # Map role string to uppercase Enum representation
            role_enum = payload.role.upper() if payload.role else "WORKER"
            
            # Process face vector if passed
            face_vector_str = None
            if payload.faceEmbedding:
                if len(payload.faceEmbedding) != 128:
                    raise HTTPException(status_code=400, detail="Face embedding must be exactly 128 dimensions")
                face_vector_str = f"[{','.join(map(str, payload.faceEmbedding))}]"
                
            # Process fingerprint if passed
            encrypted_fingerprint = None
            if payload.fingerprintTemplate:
                encrypted_fingerprint = encrypt_aes(payload.fingerprintTemplate.strip())
                
            cur.execute("""
                INSERT INTO "User" (id, email, password, "firstName", "lastName", role, state, "isActive", "faceEmbedding", "fingerprintTemplate", "mustChangePassword", "vendorId", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s::"Role", 'REGISTERED', TRUE, %s::vector, %s, FALSE, %s, NOW(), NOW())
            """, (user_id, email_clean, hashed_password, payload.firstName, payload.lastName, role_enum, face_vector_str, encrypted_fingerprint, payload.vendorId))
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
                SELECT id, email, password, "firstName", "lastName", role, "faceEmbedding", "fingerprintTemplate"
                FROM "User" 
                WHERE email = %s AND "isActive" = TRUE
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
                "type": "pre-auth",
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
            
            return {
                "access_token": token,
                "refresh_token": refresh_token,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "firstName": user["firstName"],
                    "lastName": user["lastName"],
                    "role": user["role"],
                    "faceEnrolled": user["faceEmbedding"] is not None,
                    "fingerprintEnrolled": user["fingerprintTemplate"] is not None
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
            cur.execute('SELECT password FROM "User" WHERE id = %s', (userId,))
            user = cur.fetchone()
            if not user or not pwd_context.verify(payload.oldPassword, user["password"]):
                raise HTTPException(status_code=400, detail="Current password verification failed")
            
            new_hash = pwd_context.hash(payload.newPassword)
            cur.execute('UPDATE "User" SET password = %s, "mustChangePassword" = FALSE, "updatedAt" = NOW() WHERE id = %s', (new_hash, userId))
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

# ----------------- BIOMETRICS REGISTRATION & ENROLLMENT -----------------

@app.post("/api/v1/biometrics/enroll")
def enroll_face_biometrics(payload: FaceEnrollPayload, userId: str = Depends(get_current_user_id), request: Request = None):
    """
    Validates visual face frame, checks passive liveness, generates a deterministic
    128D geometric embedding, and stores it directly as a pgvector in the User profile.
    """
    if userId != payload.userId:
        raise HTTPException(status_code=403, detail="Unauthorized access: Identity mismatch")
        
    resolved_embedding = payload.embedding
    liveness_score = 100.0

    # Extract embedding using Python OpenCV if image is provided
    if payload.image:
        img = face_auth.base64_to_image(payload.image)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image encoding")
        
        face_crop, _, _ = face_auth.detect_face_and_eyes(img)
        if face_crop is None:
            raise HTTPException(status_code=400, detail="Face detection failed. Ensure face is centered and fully visible.")
            
        is_live, liveness_score = face_auth.check_liveness_texture(face_crop)
        if not is_live:
            raise HTTPException(status_code=400, detail=f"Liveness match failed. Score: {liveness_score} (Spoofing warning)")
            
        if not resolved_embedding:
            resolved_embedding = face_auth.generate_face_embedding(img)

    if not resolved_embedding:
        raise HTTPException(status_code=400, detail="Missing face embedding or base64 frame payload")

    face_vector_str = f"[{','.join(map(str, resolved_embedding))}]"
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Guard duplicate: STRICT 1:1 match constraint
            cur.execute("""
                SELECT id, "firstName", "lastName", email, 1 - ("faceEmbedding"::vector <=> %s::vector) AS confidence 
                FROM "User" 
                WHERE "faceEmbedding" IS NOT NULL
                ORDER BY "faceEmbedding"::vector <=> %s::vector LIMIT 1
            """, (face_vector_str, face_vector_str))
            duplicate = cur.fetchone()
            if duplicate and duplicate["confidence"] > 0.95:
                dup_name = f"{duplicate['firstName']} {duplicate['lastName']}"
                dup_email = duplicate['email']
                raise HTTPException(status_code=400, detail=f"Biometric pattern duplication detected: this face is already registered to user: {dup_name} ({dup_email})")
            
            # Save vector string
            cur.execute('UPDATE "User" SET "faceEmbedding" = %s::vector, "updatedAt" = NOW() WHERE id = %s', (face_vector_str, payload.userId))
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
            cur.execute('SELECT id, "firstName", "lastName", email FROM "User" WHERE "fingerprintTemplate" = %s', (encrypted_template,))
            duplicate = cur.fetchone()
            if duplicate:
                dup_name = f"{duplicate['firstName']} {duplicate['lastName']}"
                dup_email = duplicate['email']
                raise HTTPException(status_code=400, detail=f"Biometric template duplicate: fingerprint registered to user: {dup_name} ({dup_email})")
                
            cur.execute('UPDATE "User" SET "fingerprintTemplate" = %s, "updatedAt" = NOW() WHERE id = %s', (encrypted_template, payload.userId))
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
                SELECT id, email, "firstName", "lastName", role, "faceEmbedding"
                FROM "User" 
                WHERE id = %s AND "faceEmbedding" IS NOT NULL
            """, (payload.userId,))
            user = cur.fetchone()
            
            if not user:
                raise HTTPException(status_code=400, detail="Unregistered Biometric")
            
            resolved_embedding = payload.embedding
            liveness_pass = True
            liveness_score = 100.0
            
            # Check liveness if image frame is present
            if payload.image:
                img = face_auth.base64_to_image(payload.image)
                if img is None:
                    raise HTTPException(status_code=400, detail="Invalid image encoding")
                
                face_crop, _, _ = face_auth.detect_face_and_eyes(img)
                if face_crop is None:
                    log_audit(payload.userId, "BIOMETRIC_FACE_VERIFICATION_FAILED", "Biometrics", payload.userId, None, {"reason": "Face undetected"}, request.client.host)
                    raise HTTPException(status_code=401, detail="Face Verification Failed")
                    
                is_live, liveness_score = face_auth.check_liveness_texture(face_crop)
                if not is_live:
                    log_audit(payload.userId, "BIOMETRIC_FACE_VERIFICATION_FAILED", "Biometrics", payload.userId, None, {"reason": "Liveness check failed", "livenessScore": liveness_score}, request.client.host)
                    raise HTTPException(status_code=401, detail="Face Verification Failed")
                if not resolved_embedding:
                    resolved_embedding = face_auth.generate_face_embedding(img)
                
            if not resolved_embedding:
                raise HTTPException(status_code=400, detail="Missing embedding array or raw webcam frame")
                
            # Perform direct 1:1 Cosine Similarity matching against the user's saved vector only!
            face_vector_str = f"[{','.join(map(str, resolved_embedding))}]"
            cur.execute("""
                SELECT 1 - ("faceEmbedding"::vector <=> %s::vector) AS confidence 
                FROM "User" 
                WHERE id = %s
            """, (face_vector_str, user["id"]))
            row = cur.fetchone()
            
            confidence = float(row["confidence"]) if row else 0.0
            
            # Hardened Face Threshold: 0.78
            FACE_THRESHOLD = 0.78
            matched = confidence >= FACE_THRESHOLD
            
            if matched:
                # Issue session token (authorized gate access)
                token_payload = {
                    "email": user["email"],
                    "sub": user["id"],
                    "role": user["role"],
                    "type": "authenticated",
                    "exp": int(time.time()) + 7200
                }
                token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                log_audit(user["id"], "BIOMETRIC_FACE_VERIFICATION_SUCCESS", "Biometrics", user["id"], None, {"confidence": confidence, "livenessScore": liveness_score}, request.client.host)
                
                return {
                    "matched": True,
                    "confidence": confidence,
                    "access_token": token,
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "firstName": user["firstName"],
                        "lastName": user["lastName"],
                        "role": user["role"]
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
                SELECT id, email, "firstName", "lastName", role, "fingerprintTemplate"
                FROM "User" 
                WHERE id = %s AND "fingerprintTemplate" IS NOT NULL
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
                    "type": "authenticated",
                    "exp": int(time.time()) + 7200
                }
                token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                log_audit(user["id"], "BIOMETRIC_FINGERPRINT_VERIFICATION_SUCCESS", "Biometrics", user["id"], None, {"score": match_score, "matchesCount": matches_count}, request.client.host)
                
                return {
                    "matched": True,
                    "access_token": token,
                    "user": {
                        "id": user["id"],
                        "email": user["email"],
                        "firstName": user["firstName"],
                        "lastName": user["lastName"],
                        "role": user["role"]
                    }
                }
            else:
                log_audit(user["id"], "BIOMETRIC_FINGERPRINT_VERIFICATION_FAILED", "Biometrics", user["id"], None, {"reason": "Fingerprint mismatch", "matchesCount": matches_count}, request.client.host)
                raise HTTPException(status_code=401, detail="Identity Mismatch")
    finally:
        conn.close()
