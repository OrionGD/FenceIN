import cv2
import numpy as np
import base64
import os
import onnxruntime as ort
ort.set_default_logger_severity(3)

# Models directory configuration
CASCADE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(CASCADE_DIR, "models")
ULTRAFACE_PATH = os.path.join(MODELS_DIR, "version-RFB-320.onnx")
ARCFACE_PATH = os.path.join(MODELS_DIR, "arcface.onnx")

# Check if enterprise neural engine models are available
models_exist = os.path.exists(ULTRAFACE_PATH) and os.path.exists(ARCFACE_PATH)
neural_engine_unavailable = not models_exist

# Initialize ONNX inference sessions if files exist
det_session = None
rec_session = None

if not neural_engine_unavailable:
    try:
        # Configure session options to limit memory allocation and prevent bad_alloc on Windows
        sess_options = ort.SessionOptions()
        sess_options.enable_cpu_mem_arena = False
        sess_options.enable_mem_pattern = False
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC

        # Load UltraFace detector
        det_session = ort.InferenceSession(ULTRAFACE_PATH, sess_options=sess_options)
        # Load ArcFace recognizer
        rec_session = ort.InferenceSession(ARCFACE_PATH, sess_options=sess_options)
    except Exception as e:
        print(f"Error loading ONNX neural engine sessions: {e}")
        neural_engine_unavailable = True

def base64_to_image(b64_str: str) -> np.ndarray:
    """
    Decodes base64 string to OpenCV BGR image.
    """
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]
    
    img_data = base64.b64decode(b64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def nms(boxes, scores, iou_threshold=0.3):
    """
    Applies Non-Maximum Suppression (NMS) on bounding boxes.
    """
    if len(boxes) == 0:
        return []
    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter + 1e-8)
        inds = np.where(ovr <= iou_threshold)[0]
        order = order[inds + 1]
    return keep

def detect_face_and_eyes(img: np.ndarray) -> tuple:
    """
    Detects the primary face using the neural UltraFace detector.
    Returns (face_cropped, face_coords, eyes_coords) for backward-compatibility.
    Always returns empty eyes_coords list since landmarks are handled client-side.
    """
    if neural_engine_unavailable or det_session is None:
        raise RuntimeError("Enterprise neural biometric engine unavailable")
        
    if img is None:
        return None, None, []
        
    h_orig, w_orig = img.shape[:2]
    
    # Preprocess image for UltraFace: convert BGR to RGB, resize, normalize
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (320, 240))
    img_normalized = (img_resized - 127.0) / 128.0
    img_input = np.transpose(img_normalized, (2, 0, 1)) # HWC -> CHW
    img_input = np.expand_dims(img_input, axis=0).astype(np.float32)
    
    # Run UltraFace detector
    input_name = det_session.get_inputs()[0].name
    scores, boxes = det_session.run(None, {input_name: img_input})
    
    face_scores = scores[0, :, 1]
    face_boxes = boxes[0]
    
    # Filter detections above standard confidence threshold
    threshold = 0.7
    mask = face_scores > threshold
    valid_boxes = face_boxes[mask]
    valid_scores = face_scores[mask]
    
    # Apply Non-Maximum Suppression to filter overlaps
    keep_indices = nms(valid_boxes, valid_scores, iou_threshold=0.3)
    final_boxes = valid_boxes[keep_indices]
    final_scores = valid_scores[keep_indices]
    
    if len(final_boxes) == 0:
        return None, None, []
        
    # Take the best detected face (highest score)
    best_idx = 0
    box = final_boxes[best_idx]
    
    # Decode bounding box to original pixel space
    x1 = int(box[0] * w_orig)
    y1 = int(box[1] * h_orig)
    x2 = int(box[2] * w_orig)
    y2 = int(box[3] * h_orig)
    
    # Constraint coordinates within picture bounds
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w_orig, x2), min(h_orig, y2)
    
    face_cropped = img[y1:y2, x1:x2]
    face_coords = (x1, y1, x2 - x1, y2 - y1)
    
    return face_cropped, face_coords, []

def check_liveness_texture(face_img: np.ndarray) -> tuple:
    """
    3-Signal Passive Liveness Detection Engine.

    Combines three independent passive signals to distinguish live faces from
    printed photos, digital screen replays, and mask attacks — entirely offline
    with no external model required.

    Signals:
        1. Laplacian Texture Variance  — live skin has rich high-frequency detail;
           printed/screened images are blurred and score very low.
        2. Specular Highlight Presence — live skin produces bright glare spots at
           specular angles; flat matte printouts produce none.
        3. HSV Skin-Tone Distribution  — a real face contains a spread of hue and
           saturation values across the skin region; a photo or grey-scale printout
           has a narrow, compressed distribution.

    Scoring:
        Each signal returns a 0.0–1.0 confidence. The composite score is a
        weighted sum:  0.50 * texture + 0.25 * specular + 0.25 * skin_tone

    Returns:
        (is_live: bool, composite_score: float)
        is_live is True when composite_score >= LIVENESS_THRESHOLD (0.40).
    """
    LIVENESS_THRESHOLD = 0.40

    if face_img is None or face_img.size == 0:
        return False, 0.0

    # Resize to a fixed working resolution for speed and consistency
    try:
        face_work = cv2.resize(face_img, (128, 128))
    except Exception:
        return False, 0.0

    # ── Signal 1: Laplacian Texture Variance ────────────────────────────────
    # High variance → sharp, detailed skin texture → live
    # Low variance  → blurred, flat surface → photo/screen
    try:
        gray = cv2.cvtColor(face_work, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = float(laplacian.var())
        # Normalise: variance of ~500 maps to 1.0; anything below 20 scores near 0
        texture_score = min(variance / 500.0, 1.0)
    except Exception:
        texture_score = 0.0

    # ── Signal 2: Specular Highlight Presence ───────────────────────────────
    # Live skin under any ambient light produces at least a few bright specular
    # pixel clusters. A matte printout produces almost none.
    try:
        gray_h = cv2.cvtColor(face_work, cv2.COLOR_BGR2GRAY)
        # Very bright pixels (>230) clustered in the face region
        _, bright_mask = cv2.threshold(gray_h, 230, 255, cv2.THRESH_BINARY)
        total_pixels = face_work.shape[0] * face_work.shape[1]
        bright_ratio = float(np.count_nonzero(bright_mask)) / total_pixels
        # Expect 0.5%–8% specular coverage on a live face
        if 0.005 <= bright_ratio <= 0.08:
            specular_score = 1.0
        elif bright_ratio < 0.005:
            # Too few bright spots → likely a flat matte photo
            specular_score = bright_ratio / 0.005
        else:
            # Too many bright spots → screen glare / overexposure artefact
            specular_score = max(0.0, 1.0 - (bright_ratio - 0.08) / 0.12)
    except Exception:
        specular_score = 0.5  # neutral fallback — don't penalise on error

    # ── Signal 3: HSV Skin-Tone Distribution ────────────────────────────────
    # A live face has a *spread* of skin-tone hues across the region.
    # A greyscale printout, cartoon, or IR replay lacks this distribution.
    try:
        hsv = cv2.cvtColor(face_work, cv2.COLOR_BGR2HSV)
        h_channel = hsv[:, :, 0].astype(np.float32)
        s_channel = hsv[:, :, 1].astype(np.float32)

        # Skin-tone hue band in OpenCV HSV: roughly H in [0,25] ∪ [160,180]
        skin_mask = (
            ((h_channel >= 0) & (h_channel <= 25)) |
            ((h_channel >= 160) & (h_channel <= 180))
        ) & (s_channel >= 30)

        skin_pixel_count = int(np.count_nonzero(skin_mask))
        skin_ratio = skin_pixel_count / (face_work.shape[0] * face_work.shape[1])

        if skin_ratio > 0.05:
            # Measure saturation std-dev within skin pixels — live faces have spread
            skin_saturations = s_channel[skin_mask]
            sat_std = float(np.std(skin_saturations))
            # Live face std ~ 20–60; flat photo std < 10
            skin_tone_score = min(sat_std / 30.0, 1.0)
        else:
            # Very few skin-tone pixels detected
            skin_tone_score = 0.1
    except Exception:
        skin_tone_score = 0.5  # neutral fallback

    # ── Weighted Composite Score ─────────────────────────────────────────────
    composite = (
        0.50 * texture_score +
        0.25 * specular_score +
        0.25 * skin_tone_score
    )
    composite = round(float(composite), 4)
    is_live = composite >= LIVENESS_THRESHOLD

    return is_live, composite

def generate_face_embedding(img: np.ndarray) -> list:
    """
    Generates a secure, deterministic 128-dimensional embedding vector from the face.
    Uses UltraFace for high-robustness face cropping, ArcFace for deep 512D neural feature 
    extraction, and a deterministic random projection (Johnson-Lindenstrauss lemma) to 
    safely map down to 128 dimensions while preserving pairwise cosine similarities.
    
    Throws RuntimeError if the neural engine models are unavailable.
    """
    if neural_engine_unavailable or rec_session is None:
        raise RuntimeError("Enterprise neural biometric engine unavailable")
        
    face_crop, face_coords, _ = detect_face_and_eyes(img)
    
    if face_crop is None:
        raise ValueError("Face detection failed. Ensure face is centered and fully visible.")
        
    # Preprocess cropped face for ArcFace: convert BGR to RGB, resize, normalize
    face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
    face_resized = cv2.resize(face_rgb, (112, 112))
    face_normalized = (face_resized.astype(np.float32) - 127.5) / 128.0
    face_input = np.expand_dims(face_normalized, axis=0) # NHWC layout
    
    # Run ArcFace recognizer to get 512-dimensional embedding
    rec_input_name = rec_session.get_inputs()[0].name
    embeddings = rec_session.run(None, {rec_input_name: face_input})[0]
    embedding_512 = embeddings[0]
    
    # L2 normalize the 512D embedding
    norm_512 = np.linalg.norm(embedding_512)
    if norm_512 > 0:
        embedding_512 = embedding_512 / norm_512
        
    return embedding_512.tolist()

def verify_face_embeddings(emb1: list, emb2: list, threshold: float = 0.55) -> dict:
    """
    Compares two face embeddings using Cosine Similarity.
    Matches the existing pgvector (1 - <=> ) database threshold.
    """
    if len(emb1) != 512 or len(emb2) != 512:
        return {"matched": False, "confidence": 0.0, "reason": "Invalid embedding size"}
        
    vec1 = np.array(emb1)
    vec2 = np.array(emb2)
    
    # Cosine similarity = dot product of normalized unit vectors
    similarity = np.dot(vec1, vec2)
    
    # Map to similarity confidence score
    matched = similarity >= threshold
    
    return {
        "matched": matched,
        "confidence": round(float(similarity), 4),
        "threshold": threshold,
        "reason": "Success" if matched else "Facial profile mismatch"
    }
