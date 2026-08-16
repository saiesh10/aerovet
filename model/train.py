from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
MODEL_DIR = BASE_DIR / "model" / "saved"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------
# Configuration
# --------------------------------------------------

IMAGE_SIZE = 128
BATCH_SIZE = 16
EPOCHS = 20
VALIDATION_SPLIT = 0.20
SEED = 42

torch.manual_seed(SEED)
np.random.seed(SEED)


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
# Train / validation split
# --------------------------------------------------

validation_size = int(len(dataset) * VALIDATION_SPLIT)
train_size = len(dataset) - validation_size

train_dataset, validation_dataset = random_split(
    dataset,
    [train_size, validation_size],
    generator=torch.Generator().manual_seed(SEED),
)

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
)

validation_loader = DataLoader(
    validation_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
)


print(f"Training images: {len(train_dataset)}")
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


model = AeroVetCNN(num_classes=len(dataset.classes)).to(device)


# --------------------------------------------------
# Loss and optimizer
# --------------------------------------------------

criterion = nn.CrossEntropyLoss()

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=0.001,
)


# --------------------------------------------------
# Training
# --------------------------------------------------

for epoch in range(EPOCHS):

    model.train()

    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in train_loader:

        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(outputs, labels)

        loss.backward()

        optimizer.step()

        running_loss += loss.item() * images.size(0)

        predictions = outputs.argmax(dim=1)

        correct += (predictions == labels).sum().item()
        total += labels.size(0)

    train_loss = running_loss / total
    train_accuracy = correct / total


    # ----------------------------------------------
    # Validation
    # ----------------------------------------------

    model.eval()

    validation_correct = 0
    validation_total = 0

    with torch.no_grad():

        for images, labels in validation_loader:

            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)

            predictions = outputs.argmax(dim=1)

            validation_correct += (
                predictions == labels
            ).sum().item()

            validation_total += labels.size(0)

    validation_accuracy = (
        validation_correct / validation_total
    )


    print(
        f"Epoch {epoch + 1:02d}/{EPOCHS} | "
        f"Loss: {train_loss:.4f} | "
        f"Train Acc: {train_accuracy:.3f} | "
        f"Val Acc: {validation_accuracy:.3f}"
    )


# --------------------------------------------------
# Save model
# --------------------------------------------------

model_path = MODEL_DIR / "aerovet_cnn.pth"

torch.save(
    {
        "model_state_dict": model.state_dict(),
        "classes": dataset.classes,
        "image_size": IMAGE_SIZE,
    },
    model_path,
)

print()
print(f"Model saved to: {model_path}")