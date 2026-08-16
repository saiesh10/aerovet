from pathlib import Path

import librosa
import numpy as np
import matplotlib.pyplot as plt


# Project paths
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

# Audio settings
SAMPLE_RATE = 22050
DURATION = 5
N_SAMPLES = SAMPLE_RATE * DURATION

# Mel-spectrogram settings
N_MELS = 128
N_FFT = 1024
HOP_LENGTH = 512


def process_audio(audio_path: Path, output_path: Path) -> None:
    """Convert one WAV file into a 128x128 mel-spectrogram PNG."""

    audio, _ = librosa.load(
        audio_path,
        sr=SAMPLE_RATE,
        mono=True,
    )

    # Make every recording exactly 5 seconds.
    if len(audio) < N_SAMPLES:
        audio = np.pad(
            audio,
            (0, N_SAMPLES - len(audio)),
            mode="constant",
        )
    else:
        audio = audio[:N_SAMPLES]

    mel = librosa.feature.melspectrogram(
        y=audio,
        sr=SAMPLE_RATE,
        n_mels=N_MELS,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )

    mel_db = librosa.power_to_db(mel, ref=np.max)

    # Save as a square image.
    fig = plt.figure(figsize=(1.28, 1.28), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])

    ax.imshow(
        mel_db,
        aspect="auto",
        origin="lower",
    )
    ax.axis("off")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    fig.savefig(
        output_path,
        dpi=100,
        bbox_inches="tight",
        pad_inches=0,
    )

    plt.close(fig)


def main() -> None:
    """Process all WAV files in Healthy, Unhealthy and Noise."""

    if not RAW_DIR.exists():
        raise FileNotFoundError(f"Raw dataset not found: {RAW_DIR}")

    categories = ["Healthy", "Unhealthy", "Noise"]

    total = 0

    for category in categories:
        input_dir = RAW_DIR / category
        output_dir = PROCESSED_DIR / category

        if not input_dir.exists():
            print(f"Warning: {input_dir} does not exist.")
            continue

        wav_files = sorted(input_dir.glob("*.wav"))

        print(f"\n{category}: {len(wav_files)} files")

        for index, wav_path in enumerate(wav_files, start=1):
            output_path = output_dir / f"{wav_path.stem}.png"

            process_audio(wav_path, output_path)

            total += 1

            if index % 10 == 0 or index == len(wav_files):
                print(f"  Processed {index}/{len(wav_files)}")

    print(f"\nFinished. Total files processed: {total}")


if __name__ == "__main__":
    main()