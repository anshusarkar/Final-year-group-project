from flask import Flask, render_template, request
import torch
from PIL import Image
import numpy as np
import os
import json
from werkzeug.utils import secure_filename
from torchvision import transforms
import os
import gdown  # pip install gdown

model_path = "modelVgg16.pth"
    
if not os.path.exists(model_path):
        print("[INFO] Model not found. Attempting to download...")

        # Your Google Drive file ID or direct download URL
        url = "https://drive.google.com/uc?id=1jmZiuBqoxw61T2CUENoIM4DX4PcomdRo"
        
        try:
            os.makedirs("models", exist_ok=True)
            gdown.download(url, model_path, quiet=False)
            
            # Re-check after download
            if not os.path.exists(model_path):
                raise ModelDownloadError("Model file was not downloaded successfully.")
            
            print("[INFO] Model downloaded successfully.")

        except Exception as e:
            raise ModelDownloadError(f"Failed to download model: {e}")


app = Flask(__name__)
UPLOAD_FOLDER = 'static/uploads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load class labels from JSON mapping
try:
    with open("class_indices.json") as f:
        idx_to_class = {int(v): k for k, v in json.load(f).items()}
except Exception as e:
    print("⚠️ Failed to load class_indices.json, using fallback labels.")
    idx_to_class = {0: 'Glioma', 1: 'Meningioma', 2: 'No Tumor', 3: 'Pituitary'}

# Device config
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load the full model object (assumes model was saved using torch.save(model))
try:
    model = torch.load("modelVgg16.pth", map_location=device, weights_only=False)
    model.to(device)
    model.eval()
    print("✅ Full PyTorch model loaded!")
except Exception as e:
    print(f"❌ Failed to load PyTorch model: {e}")
    model = None

# Image preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def preprocess_image(img_path):
    try:
        img = Image.open(img_path).convert('RGB')
        img_tensor = transform(img).unsqueeze(0).to(device)  # Add batch dimension
        return img_tensor
    except Exception as e:
        print(f"❌ Error during image preprocessing: {e}")
        return None
    


@app.route("/", methods=["GET", "POST"])
def index():
    prediction = None
    image_path = None

    if request.method == "POST":
        file = request.files['file']
        if file:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            image_path = filepath

            # Preprocess and predict
            img_tensor = preprocess_image(filepath)
            if img_tensor is not None and model:
                try:
                    with torch.no_grad():
                        outputs = model(img_tensor)[0]
                        probs = torch.nn.functional.softmax(outputs, dim=0).cpu().numpy()

                    prediction = {
                        idx_to_class[i]: round(float(probs[i]) * 100, 2)
                        for i in range(len(probs))
                    }

                except Exception as e:
                    print(f"❌ Error during model prediction: {e}")
                    prediction = {"Error": "Prediction failed. See server logs."}

    return render_template("index.html", prediction=prediction, image_path=image_path)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=10000)
