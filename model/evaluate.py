from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
import matplotlib.pyplot as plt


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data" / "processed"
MODEL_PATH = BASE_DIR / "model" / "saved" / "aerovet_cnn.pth"


# --------------------------------------------------
# Configuration
# --------------------------------------------------

IMAGE_SIZE = 128
BATCH_SIZE = 16
VALIDATION_SPLIT = 0.20
SEED = 42


# --------------------------------------------------
# Device
# --------------------------------------------------

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(f"Using device: {device}")


# --------------------------------------------------
# Image preprocessing
# --------------------------------------------------

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.Grayscale(num_output_channels=3),
    transforms.ToTensor(),
])


# --------------------------------------------------
# Load dataset
# --------------------------------------------------

dataset = datasets.ImageFolder(
    root=DATA_DIR,
    transform=transform,
)

print(f"Classes: {dataset.classes}")
print(f"Total images: {len(dataset)}")


# --------------------------------------------------
# Recreate the same validation split
# --------------------------------------------------

validation_size = int(len(dataset) * VALIDATION_SPLIT)
train_size = len(dataset) - validation_size

_, validation_dataset = random_split(
    dataset,
    [train_size, validation_size],
    generator=torch.Generator().manual_seed(SEED),
)

validation_loader = DataLoader(
    validation_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
)

print(f"Validation images: {len(validation_dataset)}")


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
# Load saved model
# --------------------------------------------------

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device,
)

model = AeroVetCNN(
    num_classes=len(dataset.classes)
).to(device)

model.load_state_dict(
    checkpoint["model_state_dict"]
)

model.eval()


# --------------------------------------------------
# Evaluation
# --------------------------------------------------

all_labels = []
all_predictions = []

with torch.no_grad():

    for images, labels in validation_loader:

        images = images.to(device)

        outputs = model(images)

        predictions = outputs.argmax(dim=1)

        all_labels.extend(labels.numpy())
        all_predictions.extend(
            predictions.cpu().numpy()
        )


# --------------------------------------------------
# Metrics
# --------------------------------------------------

accuracy = accuracy_score(
    all_labels,
    all_predictions,
)

print()
print("=" * 50)
print(f"Validation Accuracy: {accuracy * 100:.2f}%")
print("=" * 50)

print()
print("Classification Report:")

print(
    classification_report(
        all_labels,
        all_predictions,
        target_names=dataset.classes,
        zero_division=0,
    )
)


# --------------------------------------------------
# Confusion matrix
# --------------------------------------------------

cm = confusion_matrix(
    all_labels,
    all_predictions,
)

print("Confusion Matrix:")
print(cm)


# --------------------------------------------------
# Save confusion matrix image
# --------------------------------------------------

fig, ax = plt.subplots(figsize=(7, 6))

ax.imshow(cm)

ax.set_xticks(range(len(dataset.classes)))
ax.set_yticks(range(len(dataset.classes)))

ax.set_xticklabels(dataset.classes)
ax.set_yticklabels(dataset.classes)

ax.set_xlabel("Predicted")
ax.set_ylabel("Actual")
ax.set_title("AeroVet Validation Confusion Matrix")

for i in range(len(dataset.classes)):
    for j in range(len(dataset.classes)):
        ax.text(
            j,
            i,
            cm[i, j],
            ha="center",
            va="center",
        )

fig.tight_layout()

output_path = (
    BASE_DIR
    / "model"
    / "saved"
    / "confusion_matrix.png"
)

fig.savefig(output_path, dpi=150)

plt.close(fig)

print()
print(f"Confusion matrix saved to: {output_path}")