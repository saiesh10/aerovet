from pathlib import Path
import shutil
import tempfile

import librosa
import numpy as np
import torch
from torch import nn
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    BASE_DIR
    / "model"
    / "saved"
    / "aerovet_cnn.pth"
)


# --------------------------------------------------
# Configuration
# --------------------------------------------------

SAMPLE_RATE = 22050
DURATION = 5
N_SAMPLES = SAMPLE_RATE * DURATION

IMAGE_SIZE = 128
N_MELS = 128
N_FFT = 1024
HOP_LENGTH = 512


# --------------------------------------------------
# Device
# --------------------------------------------------

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# --------------------------------------------------
# CNN model
# --------------------------------------------------

class AeroVetCNN(nn.Module):

    def __init__(self, num_classes):
        super().__init__()

        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),

            nn.Linear(128 * 16 * 16, 128),
            nn.ReLU(),

            nn.Dropout(0.5),

            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        return self.classifier(x)


# --------------------------------------------------
# Load model
# --------------------------------------------------

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device,
)

CLASSES = checkpoint["classes"]

model = AeroVetCNN(
    num_classes=len(CLASSES)
).to(device)

model.load_state_dict(
    checkpoint["model_state_dict"]
)

model.eval()


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="AeroVet API",
    description="Poultry vocalization disease detection API",
    version="1.0.0",
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "AeroVet API is running",
        "classes": CLASSES,
        "device": str(device),
    }


# --------------------------------------------------
# Audio preprocessing
# --------------------------------------------------

def audio_to_tensor(audio_path: Path):
    """
    Create model input using the same preprocessing
    pipeline used to create the training spectrograms.
    """

    from model.preprocess import process_audio

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir = Path(temp_dir)

        png_path = temp_dir / "input.png"

        # Use the exact same preprocessing function
        # used during dataset creation.
        process_audio(
            audio_path,
            png_path,
        )

        # Load the generated PNG exactly as ImageFolder does.
        from PIL import Image
        from torchvision import transforms

        image_transform = transforms.Compose([
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.Grayscale(num_output_channels=3),
            transforms.ToTensor(),
        ])

        image = Image.open(png_path).convert("RGB")

        tensor = image_transform(image)

        return tensor.unsqueeze(0)

# --------------------------------------------------
# Prediction endpoint
# --------------------------------------------------

@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):

    suffix = Path(file.filename or ".wav").suffix

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix,
    ) as temp_file:

        temp_path = Path(temp_file.name)

        shutil.copyfileobj(
            file.file,
            temp_file,
        )


    try:

        # Convert audio to model input.
        tensor = audio_to_tensor(
            temp_path
        ).to(device)


        # Run model.
        with torch.no_grad():

            outputs = model(tensor)

            probabilities = torch.softmax(
                outputs,
                dim=1,
            )

            confidence, predicted_index = (
                probabilities.max(dim=1)
            )


        predicted_class = CLASSES[
            predicted_index.item()
        ]

        confidence_value = (
            confidence.item() * 100
        )


        return {
            "prediction": predicted_class,
            "confidence": round(
                confidence_value,
                2,
            ),
        }


    finally:

        if temp_path.exists():
            temp_path.unlink()