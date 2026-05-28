import os
import urllib.request
import onnxruntime as ort
ort.set_default_logger_severity(3)

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

ULTRAFACE_URL = "https://huggingface.co/onnxmodelzoo/version-RFB-320/resolve/main/version-RFB-320.onnx"
ARCFACE_URL = "https://huggingface.co/garavv/arcface-onnx/resolve/main/arc.onnx"

def download_file(url, dest_path):
    print(f"Downloading {url} to {dest_path}...")
    try:
        urllib.request.urlretrieve(url, dest_path)
        print(f"Successfully downloaded to {dest_path}")
        # Verify with ONNX Runtime
        session = ort.InferenceSession(dest_path)
        print(f"Valid ONNX model. Inputs: {[i.name for i in session.get_inputs()]}, Outputs: {[o.name for o in session.get_outputs()]}")
    except Exception as e:
        print(f"Error downloading or verifying {url}: {e}")

if __name__ == "__main__":
    download_file(ULTRAFACE_URL, os.path.join(MODELS_DIR, "version-RFB-320.onnx"))
    download_file(ARCFACE_URL, os.path.join(MODELS_DIR, "arcface.onnx"))
