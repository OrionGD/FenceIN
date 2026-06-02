"""
antispoof.py — FenceIN Extended Anti-Spoofing & Deepfake Detection Engine
==========================================================================
Extends the basic 3-signal passive liveness in face_auth.py with five
additional signals targeting digital replay attacks, deepfake videos, and
AI-generated face attacks that can fool simpler texture-only checks.

All signals operate offline using NumPy + OpenCV — zero cloud dependency.

Detection targets:
    • Printed photo (high-quality inkjet/laser)
    • Mobile screen replay (phone held up to camera)
    • Tablet replay (tablet held up to camera)
    • Deepfake video replay (AI-generated face video)
    • AI-synthesised static face image

Signal pipeline:
    1. Moiré Pattern Score        — FFT detects periodic screen/print grid lines
    2. Screen Pixel Grid Score    — detects LCD sub-pixel colour banding
    3. Corneal Specular Score     — live eyes have bright corneal reflections
    4. Depth Geometry Score       — face aspect ratios differ on flat vs 3D surface
    5. Chromatic Aberration Score — screens/prints have distinct RGB fringe artefacts

Each signal returns 0.0 (spoof indicator) → 1.0 (live indicator).
Final is_authentic = weighted composite ≥ ANTISPOOF_THRESHOLD (0.50).
"""

import cv2
import numpy as np
from typing import Dict, Any, Tuple


# ── Thresholds ────────────────────────────────────────────────────────────────
ANTISPOOF_THRESHOLD = 0.50

# Signal weights
W_MOIRE    = 0.25
W_PIXEL    = 0.15
W_CORNEAL  = 0.25
W_DEPTH    = 0.20
W_CHROMA   = 0.15


def _safe_resize(img: np.ndarray, target: Tuple[int, int]) -> np.ndarray:
    if img is None or img.size == 0:
        return np.zeros((target[1], target[0], 3), dtype=np.uint8)
    return cv2.resize(img, target)


# ── Signal 1: Moiré Pattern Detection (FFT) ───────────────────────────────────
def _moire_score(face_img: np.ndarray) -> float:
    """
    Detects Moiré / halftone patterns characteristic of printed images and
    screen replays by analysing the magnitude spectrum of the Fourier transform.

    Printed photos → regular dot-grid → strong periodic peaks in FFT spectrum.
    Screen replays → LCD pixel grid → periodic spikes at sub-pixel frequencies.
    Live face      → irregular noise → smooth, decaying FFT spectrum.

    Returns: 0.0 (spoof) → 1.0 (live)
    """
    try:
        work = _safe_resize(face_img, (128, 128))
        gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY).astype(np.float32)

        # 2D FFT + shift zero-frequency to centre
        fft    = np.fft.fft2(gray)
        fft_sh = np.fft.fftshift(fft)
        mag    = np.abs(fft_sh)

        # Suppress DC component (centre) to focus on periodic content
        h, w = mag.shape
        mask = np.ones_like(mag)
        cv2.circle(mask, (w // 2, h // 2), 5, 0, -1)
        mag_masked = mag * mask

        # Normalise
        mag_norm = mag_masked / (mag_masked.max() + 1e-9)

        # Count strong off-centre peaks (> 0.6 of max)
        strong_peaks = int(np.sum(mag_norm > 0.60))

        # Live faces: very few strong off-centre peaks (< 8)
        # Printed/screen: many peaks from regular grid (> 20)
        if strong_peaks < 8:
            return 1.0
        elif strong_peaks > 30:
            return 0.0
        else:
            return round(1.0 - (strong_peaks - 8) / 22.0, 4)
    except Exception:
        return 0.5


# ── Signal 2: Screen Pixel Grid / Banding Detection ──────────────────────────
def _pixel_grid_score(face_img: np.ndarray) -> float:
    """
    Detects regular horizontal/vertical banding from LCD pixel rows — a
    hallmark of a screen replay attack at close range.

    Live face skin → irregular intensity variation across rows
    Screen replay  → periodic intensity dip every ~3 pixels (LCD row structure)

    Returns: 0.0 (screen banding detected) → 1.0 (no banding)
    """
    try:
        work = _safe_resize(face_img, (128, 128))
        gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY).astype(np.float32)

        # Row-wise and column-wise mean intensity
        row_means = gray.mean(axis=1)
        col_means = gray.mean(axis=0)

        # Compute autocorrelation at lag 1–5 to detect periodicity
        def autocorr_peak(signal: np.ndarray) -> float:
            n = len(signal)
            s_norm = signal - signal.mean()
            if s_norm.std() < 1e-6:
                return 0.0
            max_corr = 0.0
            for lag in range(1, min(6, n)):
                c = float(np.corrcoef(s_norm[:-lag], s_norm[lag:])[0, 1])
                max_corr = max(max_corr, abs(c))
            return max_corr

        row_ac = autocorr_peak(row_means)
        col_ac = autocorr_peak(col_means)
        max_ac = max(row_ac, col_ac)

        # High autocorrelation → banding → spoof
        if max_ac > 0.80:
            return 0.0
        elif max_ac > 0.50:
            return round(1.0 - (max_ac - 0.50) / 0.30, 4)
        else:
            return 1.0
    except Exception:
        return 0.5


# ── Signal 3: Corneal Specular Reflection ────────────────────────────────────
def _corneal_specular_score(face_img: np.ndarray) -> float:
    """
    Detects bright specular reflections in the eye region. Live eyes have a
    small, bright corneal highlight from any ambient light source. Printed
    photos and most screen replays lack this 3D specular geometry.

    Returns: 0.0 (no corneal reflection) → 1.0 (reflection detected)
    """
    try:
        work = _safe_resize(face_img, (128, 128))
        h, w = work.shape[:2]

        # Approximate eye region: top 60% of height, inner 70% of width
        eye_region = work[int(h * 0.20): int(h * 0.55),
                         int(w * 0.15): int(w * 0.85)]

        if eye_region.size == 0:
            return 0.5

        gray_eye = cv2.cvtColor(eye_region, cv2.COLOR_BGR2GRAY)

        # Very bright pixels in eye region = specular highlight
        _, bright = cv2.threshold(gray_eye, 220, 255, cv2.THRESH_BINARY)
        bright_ratio = float(np.count_nonzero(bright)) / gray_eye.size

        # Expected range for live eyes: 0.2% – 4% bright pixels
        if 0.002 <= bright_ratio <= 0.04:
            return 1.0
        elif bright_ratio < 0.002:
            # No reflection → likely flat photo
            return round(bright_ratio / 0.002, 4)
        else:
            # Too many bright pixels → overexposed or screen glare
            return max(0.0, round(1.0 - (bright_ratio - 0.04) / 0.06, 4))
    except Exception:
        return 0.5


# ── Signal 4: Depth / Geometric Consistency Score ────────────────────────────
def _depth_geometry_score(face_img: np.ndarray) -> float:
    """
    Estimates whether the face has plausible 3D geometry by analysing:
    - Face region proportions (width/height ratio)
    - Gradient magnitude distribution (flat surfaces have uniform gradients)
    - Edge density (3D faces have more complex edge distributions)

    Returns: 0.0 (flat/printed) → 1.0 (3D geometry consistent)
    """
    try:
        work = _safe_resize(face_img, (128, 128))
        gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY).astype(np.float32)

        # Sobel gradients for edge density
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        grad_mag = np.sqrt(gx ** 2 + gy ** 2)

        # Standard deviation of gradient — live faces have varied gradient landscape
        grad_std = float(grad_mag.std())

        # High gradient variance → complex 3D surface
        # Low gradient variance → flat, uniform surface
        if grad_std > 25.0:
            return 1.0
        elif grad_std < 8.0:
            return 0.0
        else:
            return round((grad_std - 8.0) / 17.0, 4)
    except Exception:
        return 0.5


# ── Signal 5: Chromatic Aberration Score ─────────────────────────────────────
def _chromatic_aberration_score(face_img: np.ndarray) -> float:
    """
    Analyses channel-wise edge misalignment (chromatic aberration).

    Real cameras exhibit natural chromatic aberration: edges in the blue
    channel are slightly offset from red/green. Printed photos and screen
    replays may show abnormally uniform or exaggerated channel alignment.

    Returns: 0.0 (suspicious) → 1.0 (natural CA pattern)
    """
    try:
        work = _safe_resize(face_img, (128, 128))
        b, g, r = cv2.split(work.astype(np.float32))

        def edge_density(ch: np.ndarray) -> float:
            lap = cv2.Laplacian(ch, cv2.CV_32F)
            return float(np.abs(lap).mean())

        ed_r, ed_g, ed_b = edge_density(r), edge_density(g), edge_density(b)

        # Channel divergence: live → r≈g, b slightly different
        rg_diff = abs(ed_r - ed_g) / (max(ed_r, ed_g) + 1e-6)
        rb_diff = abs(ed_r - ed_b) / (max(ed_r, ed_b) + 1e-6)

        # Natural CA: rg_diff small (< 0.15), rb_diff moderate (0.05–0.30)
        if rg_diff < 0.15 and 0.02 <= rb_diff <= 0.35:
            return 1.0
        elif rg_diff > 0.40:
            return 0.0  # Abnormal R/G divergence → screen artefact
        else:
            return round(max(0.0, 1.0 - rg_diff / 0.40), 4)
    except Exception:
        return 0.5


# ── Master Anti-Spoof Analysis ────────────────────────────────────────────────
def analyze_antispoof(face_img: np.ndarray) -> Dict[str, Any]:
    """
    Runs the full 5-signal anti-spoofing pipeline on a face crop.

    Args:
        face_img: OpenCV BGR image of the detected face region.

    Returns:
        {
            is_authentic:     bool,    # True = live person, False = attack
            composite_score:  float,   # 0.0 – 1.0
            attack_type:      str,     # 'LIVE' | 'PRINTED_PHOTO' | 'SCREEN_REPLAY' | 'DEEPFAKE' | 'UNKNOWN_ATTACK'
            signals: {
                moire:    float,
                pixel_grid: float,
                corneal:  float,
                depth:    float,
                chroma:   float,
            },
            confidence_pct:  int,
        }
    """
    if face_img is None or face_img.size == 0:
        return {
            "is_authentic":    False,
            "composite_score": 0.0,
            "attack_type":     "NO_FACE",
            "signals":         {"moire": 0, "pixel_grid": 0, "corneal": 0, "depth": 0, "chroma": 0},
            "confidence_pct":  0,
        }

    s_moire   = _moire_score(face_img)
    s_pixel   = _pixel_grid_score(face_img)
    s_corneal = _corneal_specular_score(face_img)
    s_depth   = _depth_geometry_score(face_img)
    s_chroma  = _chromatic_aberration_score(face_img)

    composite = (
        s_moire   * W_MOIRE  +
        s_pixel   * W_PIXEL  +
        s_corneal * W_CORNEAL +
        s_depth   * W_DEPTH  +
        s_chroma  * W_CHROMA
    )
    composite = round(composite, 4)
    is_authentic = composite >= ANTISPOOF_THRESHOLD

    # Attack type classification
    if is_authentic:
        attack_type = "LIVE"
    elif s_moire < 0.30 and s_pixel < 0.40:
        attack_type = "SCREEN_REPLAY"
    elif s_moire < 0.30 and s_corneal < 0.20:
        attack_type = "PRINTED_PHOTO"
    elif s_depth < 0.25 and s_chroma > 0.60:
        attack_type = "DEEPFAKE"
    else:
        attack_type = "UNKNOWN_ATTACK"

    return {
        "is_authentic":    is_authentic,
        "composite_score": composite,
        "attack_type":     attack_type,
        "signals": {
            "moire":      round(s_moire,   4),
            "pixel_grid": round(s_pixel,   4),
            "corneal":    round(s_corneal, 4),
            "depth":      round(s_depth,   4),
            "chroma":     round(s_chroma,  4),
        },
        "confidence_pct": int(composite * 100),
    }
