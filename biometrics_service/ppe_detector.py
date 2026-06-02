"""
ppe_detector.py — FenceIN PPE Compliance Detection Engine
==========================================================
Detects Personal Protective Equipment (PPE) in a full-frame camera image
using purely OpenCV colour and region analysis — no extra ML models, zero
cloud dependency, runs on Raspberry Pi / edge hardware.

Detects:
    • Hard Hat / Helmet    — HSV colour analysis of the head region
    • Safety Vest          — Bright reflective orange/yellow/green in torso area
    • Face Mask            — Lower-face region coverage (dark region below nose)

NHAI use case:
    Before allowing entry to a highway construction site, verify that the
    worker is wearing required PPE. Even if face is successfully recognised,
    deny entry if PPE is missing.

    Face Verified ✓
    Helmet Missing ✗
    → Entry Denied

Returns:
    {
        helmet_detected:  bool,
        vest_detected:    bool,
        mask_detected:    bool,
        ppe_score:        float,   # 0.0 – 1.0
        missing_items:    list,    # ['HELMET', 'VEST']
        compliant:        bool,    # True if all required items present
        required:         list,    # Items configured as required
    }
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Tuple


# ── Required PPE configuration (can be overridden per site) ──────────────────
DEFAULT_REQUIRED_PPE = ["HELMET", "VEST"]


# ── HSV colour ranges for PPE items ──────────────────────────────────────────
# Hard hat colours: yellow, orange, white, red, blue (NHAI common)
_HELMET_HSV_RANGES = [
    # Yellow hard hat
    ((20, 100, 100), (35, 255, 255)),
    # Orange hard hat
    ((5, 150, 150), (20, 255, 255)),
    # White hard hat (high value, low saturation)
    ((0, 0, 180), (180, 40, 255)),
    # Red hard hat (two ranges in HSV)
    ((0, 150, 100), (8, 255, 255)),
    ((170, 150, 100), (180, 255, 255)),
    # Blue hard hat
    ((100, 120, 80), (130, 255, 255)),
]

# Safety vest: bright orange, yellow, lime green with high saturation
_VEST_HSV_RANGES = [
    ((15, 150, 150), (35, 255, 255)),    # Yellow-orange vest
    ((5, 180, 150), (18, 255, 255)),     # Orange vest
    ((35, 120, 120), (75, 255, 255)),    # Lime/green vest
]


def _apply_hsv_ranges(hsv_img: np.ndarray, ranges: list) -> np.ndarray:
    """Creates a combined mask for all given HSV colour ranges."""
    mask = np.zeros(hsv_img.shape[:2], dtype=np.uint8)
    for (lo, hi) in ranges:
        lo_arr = np.array(lo, dtype=np.uint8)
        hi_arr = np.array(hi, dtype=np.uint8)
        mask = cv2.bitwise_or(mask, cv2.inRange(hsv_img, lo_arr, hi_arr))
    return mask


def detect_helmet(img: np.ndarray) -> Tuple[bool, float]:
    """
    Detects a hard hat in the upper head region of the frame.

    Strategy: Crop the top 35% of the image height, run HSV colour
    matching for common hard hat colours. Threshold: ≥3% of the
    crop area must match a helmet colour.

    Returns: (detected: bool, confidence: float 0–1)
    """
    if img is None or img.size == 0:
        return False, 0.0

    h, w = img.shape[:2]
    # Top 35% = head + helmet region
    head_crop = img[0: int(h * 0.35), :]
    if head_crop.size == 0:
        return False, 0.0

    hsv = cv2.cvtColor(head_crop, cv2.COLOR_BGR2HSV)
    mask = _apply_hsv_ranges(hsv, _HELMET_HSV_RANGES)

    # Morphological cleanup to remove noise
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    area_ratio = float(np.count_nonzero(mask)) / (head_crop.shape[0] * head_crop.shape[1])

    # Need at least 3% of head region to be helmet colour
    if area_ratio >= 0.03:
        confidence = min(1.0, area_ratio / 0.15)
        return True, round(confidence, 4)
    return False, round(area_ratio / 0.03 * 0.5, 4)


def detect_vest(img: np.ndarray) -> Tuple[bool, float]:
    """
    Detects a high-visibility safety vest in the torso region.

    Strategy: Crop the middle 40–80% of the image (torso area), run
    HSV colour matching for bright safety vest colours. Threshold: ≥5%.

    Returns: (detected: bool, confidence: float 0–1)
    """
    if img is None or img.size == 0:
        return False, 0.0

    h, w = img.shape[:2]
    # Middle body region: 40%–80% of image height
    torso_crop = img[int(h * 0.35): int(h * 0.80), :]
    if torso_crop.size == 0:
        return False, 0.0

    hsv = cv2.cvtColor(torso_crop, cv2.COLOR_BGR2HSV)
    mask = _apply_hsv_ranges(hsv, _VEST_HSV_RANGES)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    area_ratio = float(np.count_nonzero(mask)) / (torso_crop.shape[0] * torso_crop.shape[1])

    if area_ratio >= 0.05:
        confidence = min(1.0, area_ratio / 0.25)
        return True, round(confidence, 4)
    return False, round(area_ratio / 0.05 * 0.5, 4)


def detect_face_mask(img: np.ndarray, face_bbox: Optional[Tuple] = None) -> Tuple[bool, float]:
    """
    Detects a face mask covering the nose and mouth region.

    Strategy: Within the face bounding box (or a central face estimate),
    examine the lower 40% of the face region. A mask creates a region with
    low skin-tone pixel density and reduced texture variance.

    Returns: (detected: bool, confidence: float 0–1)
    """
    if img is None or img.size == 0:
        return False, 0.0

    h, w = img.shape[:2]

    if face_bbox:
        x, y, fw, fh = face_bbox
        face_region = img[y: y + fh, x: x + fw]
    else:
        # Default: assume face is central 50% of image
        face_region = img[int(h * 0.10): int(h * 0.90),
                         int(w * 0.20): int(w * 0.80)]

    if face_region.size == 0:
        return False, 0.0

    fh, fw = face_region.shape[:2]
    # Lower 40% of face = nose + mouth area
    lower_face = face_region[int(fh * 0.55):, :]

    if lower_face.size == 0:
        return False, 0.0

    hsv = cv2.cvtColor(lower_face, cv2.COLOR_BGR2HSV)
    # Skin hue range
    skin_mask = cv2.inRange(hsv,
                             np.array([0, 25, 80]), np.array([25, 180, 255]))
    skin_ratio = float(np.count_nonzero(skin_mask)) / (lower_face.shape[0] * lower_face.shape[1])

    # If very little skin visible in lower face → mask likely present
    if skin_ratio < 0.12:
        confidence = round(1.0 - skin_ratio / 0.12, 4)
        return True, confidence
    else:
        return False, round(max(0.0, (0.12 - skin_ratio) / 0.12 + 0.1), 4)


def check_ppe_compliance(
    img: np.ndarray,
    required_ppe: Optional[List[str]] = None,
    face_bbox: Optional[Tuple] = None,
) -> Dict[str, Any]:
    """
    Runs the full PPE compliance check on a camera frame.

    Args:
        img:          Full OpenCV BGR image from the gate camera
        required_ppe: List of required items e.g. ['HELMET', 'VEST']
                      Defaults to DEFAULT_REQUIRED_PPE
        face_bbox:    Optional face bounding box (x, y, w, h) for mask detection

    Returns:
        {
            helmet_detected:  bool,
            helmet_confidence: float,
            vest_detected:    bool,
            vest_confidence:  float,
            mask_detected:    bool,
            mask_confidence:  float,
            ppe_score:        float,    # 0.0 – 1.0 overall PPE compliance
            missing_items:    list,
            compliant:        bool,
            required:         list,
            recommendation:   str,
        }
    """
    if required_ppe is None:
        required_ppe = DEFAULT_REQUIRED_PPE

    helmet_ok, helmet_conf = detect_helmet(img)
    vest_ok,   vest_conf   = detect_vest(img)
    mask_ok,   mask_conf   = detect_face_mask(img, face_bbox)

    detection = {
        "HELMET": (helmet_ok, helmet_conf),
        "VEST":   (vest_ok,   vest_conf),
        "MASK":   (mask_ok,   mask_conf),
    }

    missing = [item for item in required_ppe if not detection.get(item, (False, 0))[0]]
    compliant = len(missing) == 0

    # PPE score: average confidence of required items
    required_confs = [detection[item][1] for item in required_ppe if item in detection]
    ppe_score = round(sum(required_confs) / len(required_confs), 4) if required_confs else 0.0

    # Recommendation
    if compliant:
        recommendation = "✅ PPE compliant — all required equipment detected."
    else:
        missing_str = ", ".join(missing)
        recommendation = f"❌ PPE VIOLATION — Missing: {missing_str}. Entry denied until compliant."

    return {
        "helmet_detected":   helmet_ok,
        "helmet_confidence": helmet_conf,
        "vest_detected":     vest_ok,
        "vest_confidence":   vest_conf,
        "mask_detected":     mask_ok,
        "mask_confidence":   mask_conf,
        "ppe_score":         ppe_score,
        "missing_items":     missing,
        "compliant":         compliant,
        "required":          required_ppe,
        "recommendation":    recommendation,
    }
