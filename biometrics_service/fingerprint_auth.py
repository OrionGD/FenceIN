import cv2
import numpy as np
import base64
import json

def base64_to_image(b64_str: str) -> np.ndarray:
    """
    Decodes a base64 encoded image string into an OpenCV BGR image.
    Handles headers like 'data:image/png;base64,...' if present.
    """
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]
    
    img_data = base64.b64decode(b64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def preprocess_fingerprint(img: np.ndarray) -> np.ndarray:
    """
    Enhances fingerprint ridge visibility using Contrast Limited Adaptive 
    Histogram Equalization (CLAHE) and bilateral filtering to clean noise.
    """
    # 1. Convert to grayscale
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()
        
    # 2. Enhance contrast using CLAHE
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # 3. Apply bilateral filter to smooth noise while preserving ridge edges
    smoothed = cv2.bilateralFilter(enhanced, d=9, sigmaColor=75, sigmaSpace=75)
    
    # 4. Apply adaptive thresholding to binarize ridges
    binarized = cv2.adaptiveThreshold(
        smoothed, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    return binarized

def extract_fingerprint_features(img: np.ndarray):
    """
    Detects keypoint minutiae and extracts local binary ORB descriptors.
    Returns the keypoints count and the numpy array of descriptors.
    """
    processed = preprocess_fingerprint(img)
    
    # Initialize ORB detector
    orb = cv2.ORB_create(nfeatures=500, scaleFactor=1.2, nlevels=8, edgeThreshold=15)
    
    # Find keypoints and compute descriptors
    keypoints, descriptors = orb.detectAndCompute(processed, None)
    
    return keypoints, descriptors

def serialize_descriptors(descriptors: np.ndarray) -> str:
    """
    Serializes fingerprint descriptors numpy array into a base64 string for database storage.
    """
    if descriptors is None or len(descriptors) == 0:
        return ""
    
    # Save dtype and shape for deserialization
    data_dict = {
        "shape": list(descriptors.shape),
        "dtype": str(descriptors.dtype),
        "data": base64.b64encode(descriptors.tobytes()).decode("utf-8")
    }
    return json.dumps(data_dict)

def deserialize_descriptors(serialized_str: str) -> np.ndarray:
    """
    Deserializes a database string back into a fingerprint descriptors numpy array.
    """
    if not serialized_str or serialized_str.strip() == "":
        return None
        
    try:
        # Check if it is a JSON serialized descriptor dict
        if serialized_str.startswith("{"):
            data_dict = json.loads(serialized_str)
            raw_data = base64.b64decode(data_dict["data"])
            arr = np.frombuffer(raw_data, dtype=np.dtype(data_dict["dtype"]))
            return arr.reshape(data_dict["shape"])
        else:
            # Fallback/mock check: if it is just a string, it's a legacy text template
            return None
    except Exception as e:
        print(f"Error deserializing fingerprint descriptors: {e}")
        return None

def match_fingerprints(desc1: np.ndarray, desc2: np.ndarray, threshold: int = 18) -> dict:
    """
    Compares two sets of fingerprint descriptors using BFMatcher with Hamming distance.
    Returns matching metrics and authentication decision.
    """
    if desc1 is None or len(desc1) == 0 or desc2 is None or len(desc2) == 0:
        return {"matched": False, "score": 0.0, "good_matches": 0, "reason": "Empty descriptors"}
        
    # Use Hamming distance for binary ORB descriptors
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    
    try:
        matches = bf.match(desc1, desc2)
        
        # Sort matches by distance (lower distance is a closer match)
        matches = sorted(matches, key=lambda x: x.distance)
        
        # Filter for "good" matches below a rigid distance threshold
        good_matches = [m for m in matches if m.distance < 45]
        good_count = len(good_matches)
        
        # Calculate a similarity score relative to the smaller descriptor set
        min_features = min(len(desc1), len(desc2))
        score = float(good_count / min_features) if min_features > 0 else 0.0
        
        # Determine authentication decision
        matched = good_count >= threshold
        
        return {
            "matched": matched,
            "score": round(score, 4),
            "good_matches": good_count,
            "required_matches": threshold,
            "reason": "Success" if matched else "Ridge minutiae matching score below secure threshold"
        }
    except Exception as e:
        return {"matched": False, "score": 0.0, "good_matches": 0, "reason": f"Matcher error: {str(e)}"}
