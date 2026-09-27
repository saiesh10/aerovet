# AeroVet

**AI-assisted poultry vocalization screening**

AeroVet is a prototype that analyzes poultry audio as an additional health-monitoring signal. It classifies a WAV recording as **Healthy**, **Unhealthy**, or **Noise**, and returns a model confidence score. The project combines a browser-based interface, a local Python API, and a trained convolutional neural network (CNN).

> AeroVet is a decision-support prototype, not a veterinary diagnostic tool. A model prediction should not replace flock inspection or advice from a qualified veterinarian.

## Problem and Context

Poultry health problems may not be noticed until visible symptoms appear. On large farms, continuous manual observation is difficult to scale, and delayed intervention can contribute to higher mortality and economic loss. Vocalizations offer a non-invasive signal that could help flag recordings for closer attention.

## Proposed Solution

The prototype processes an uploaded recording through this pipeline:

```text
WAV recording -> audio preprocessing -> mel-spectrogram -> CNN -> class and confidence
```

Audio is converted to mono at 22,050 Hz, then trimmed or padded to five seconds. AeroVet generates a mel-spectrogram and passes it to the trained CNN. The result is shown in the frontend with a confidence score. An **Unhealthy** prediction triggers an on-screen alert.

The dashboard summarizes analyses in the current browser. The frontend stores up to 20 analysis records in that browser's local storage; recordings themselves are not saved by the API, which removes its temporary upload file after inference.

## Features

- Upload or drag and drop WAV recordings and preview the selected audio.
- Classify recordings as Healthy, Unhealthy, or Noise, with confidence.
- View analysis statistics and the latest 20 results in the dashboard and history.
- Receive an alert when a recording is classified as Unhealthy.
- Use the included trained model for inference without downloading the training dataset.
- Optionally download the dataset to regenerate spectrograms, train a model, and evaluate it.

## Technology

- **Frontend:** HTML, CSS, JavaScript
- **API:** Python, FastAPI, Uvicorn
- **Audio processing:** librosa, NumPy, Matplotlib
- **Model:** PyTorch CNN
- **Evaluation:** scikit-learn

## Project Structure

```text
aerovet/
|-- backend/
|   `-- app.py                    # FastAPI app and prediction endpoint
|-- frontend/
|   |-- index.html                # Browser interface
|   |-- script.js
|   `-- style.css
|-- model/
|   |-- preprocess.py             # WAV-to-mel-spectrogram preprocessing
|   |-- train.py                  # CNN training
|   |-- evaluate.py               # Validation metrics and confusion matrix
|   `-- saved/
|       `-- aerovet_cnn.pth       # Included trained checkpoint
|-- data/
|   |-- raw/                      # Downloaded WAVs (not committed)
|   `-- processed/                # Generated spectrograms (not committed)
`-- requirements.txt
```

## Run the Demo

### Requirements

- Python 3.10 to 3.12 recommended.
- Internet access for the initial Python package installation.
- No GPU or dataset download is required for the demo. The API uses a CUDA GPU if available and otherwise runs on CPU.

### 1. Clone the repository

```bash
git clone https://github.com/saiesh10/aerovet.git
cd aerovet
```

### 2. Create an environment and install dependencies

**Windows PowerShell:**

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks activation, allow it for the current terminal only, then activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 3. Start the API

From the repository root, with the virtual environment active:

```bash
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Keep this terminal open. Check that the API is running at [http://127.0.0.1:8000/](http://127.0.0.1:8000/). Interactive API documentation is at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 4. Serve the frontend

Open a **second terminal**, change to the repository root, activate the same virtual environment, and run:

```bash
python -m http.server 5500 --directory frontend
```

Open [http://127.0.0.1:5500](http://127.0.0.1:5500) in a browser. Choose a poultry vocalization WAV recording and select **Analyze Recording**. Keep both terminals running while using the app.

## Training Data

The model was trained using the **Poultry Vocalization Signal Dataset for Early Disease Detection** from Mendeley Data. The dataset contains 346 labeled WAV clips: 139 Healthy, 121 Unhealthy, and 86 Noise.

- **Dataset page:** [Mendeley Data: Poultry Vocalization Signal Dataset](https://data.mendeley.com/datasets/zp4nf2dxbh/1)
- **DOI:** [10.17632/zp4nf2dxbh.1](https://doi.org/10.17632/zp4nf2dxbh.1)

Download the dataset archive from the Mendeley Data page and extract or copy the WAV clips into these folders. The preprocessing script expects WAV files directly inside each class directory:

```text
data/raw/
|-- Healthy/*.wav
|-- Unhealthy/*.wav
`-- Noise/*.wav
```

The raw WAVs and generated spectrogram images are excluded from this Git repository, so a fresh clone will not contain the dataset. **Dataset download is only needed to preprocess, retrain, or evaluate; it is not needed to run the included model.**

## Optional: Preprocess, Train, and Evaluate

Run these commands from the repository root with the project virtual environment active and the dataset in `data/raw/`:

```bash
python -m model.preprocess
python -m model.train
python -m model.evaluate
```

Preprocessing writes spectrogram PNGs to `data/processed/`. Training reads those images, uses an 80/20 train/validation split, and saves a checkpoint to `model/saved/aerovet_cnn.pth`. **Training replaces the included checkpoint.** Evaluation reports validation metrics and writes a confusion matrix to `model/saved/confusion_matrix.png`.

## API

- `GET /` returns API status, the model classes, and the selected compute device.
- `POST /predict` accepts a multipart form upload with a `file` field containing a WAV file. The response contains `prediction` and `confidence`.

## Limitations

- Predictions are based on a small labeled dataset and should be treated as screening signals, not confirmed diagnoses.
- Confidence is the model's output score; it is not a guarantee of correctness or calibrated medical certainty.
- The current prototype analyzes one uploaded clip at a time. Continuous microphone monitoring and farm-scale deployment are future work.
- Analysis history is stored locally in the browser and is not shared between devices or browsers.

## Future Work

Potential extensions include continuous microphone input, broader farm-environment testing, improved validation across recording conditions, and workflows for reviewing flagged cases with poultry health professionals.