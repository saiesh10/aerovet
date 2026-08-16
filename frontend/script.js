const API_URL = "http://127.0.0.1:8000/predict";

const fileInput = document.getElementById("audio-file");
const fileName = document.getElementById("file-name");
const analyzeButton = document.getElementById("analyze-button");

const dropZone = document.getElementById("drop-zone");

const loading = document.getElementById("loading");
const result = document.getElementById("result");

const prediction = document.getElementById("prediction");
const predictionBadge = document.getElementById("prediction-badge");

const confidence = document.getElementById("confidence");
const confidenceFill = document.getElementById("confidence-fill");

const audioInfo = document.getElementById("audio-info");
const audioFileName = document.getElementById("audio-file-name");
const audioFileSize = document.getElementById("audio-file-size");
const audioDuration = document.getElementById("audio-duration");
const audioPlayer = document.getElementById("audio-player");

let selectedFile = null;


/* --------------------------------------------------
   File selection
-------------------------------------------------- */

fileInput.addEventListener("change", function () {

    if (!fileInput.files.length) {
        return;
    }

    selectedFile = fileInput.files[0];

    handleFile(selectedFile);
});


/* --------------------------------------------------
   Handle selected file
-------------------------------------------------- */

function handleFile(file) {

    if (!file.name.toLowerCase().endsWith(".wav")) {

        alert("Please select a WAV audio file.");

        selectedFile = null;
        analyzeButton.disabled = true;

        fileName.textContent = "No file selected";

        return;
    }

    selectedFile = file;
    audioFileName.textContent = file.name;

audioFileSize.textContent =
    formatFileSize(file.size);

audioDuration.textContent = "Loading...";

audioPlayer.src = URL.createObjectURL(file);

audioInfo.classList.remove("hidden");

audioPlayer.addEventListener(
    "loadedmetadata",
    function () {

        audioDuration.textContent =
            formatDuration(audioPlayer.duration);

    },
    { once: true }
);

    fileName.textContent =
        `${file.name} (${formatFileSize(file.size)})`;

    analyzeButton.disabled = false;

    result.classList.add("hidden");
}


/* --------------------------------------------------
   Drag and drop
-------------------------------------------------- */

dropZone.addEventListener("dragover", function (event) {

    event.preventDefault();

    dropZone.classList.add("dragover");
});


dropZone.addEventListener("dragleave", function () {

    dropZone.classList.remove("dragover");
});


dropZone.addEventListener("drop", function (event) {

    event.preventDefault();

    dropZone.classList.remove("dragover");

    const files = event.dataTransfer.files;

    if (!files.length) {
        return;
    }

    handleFile(files[0]);
});


/* --------------------------------------------------
   Analyze button
-------------------------------------------------- */

analyzeButton.addEventListener("click", analyzeAudio);


async function analyzeAudio() {

    if (!selectedFile) {
        return;
    }


    /* Show loading */

    analyzeButton.disabled = true;

    loading.classList.remove("hidden");

    result.classList.add("hidden");


    /* Prepare file */

    const formData = new FormData();

    formData.append(
        "file",
        selectedFile
    );


    try {

        const response = await fetch(
            API_URL,
            {
                method: "POST",
                body: formData
            }
        );


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );
        }


        const data = await response.json();


        /* Display result */

        showResult(
            data.prediction,
            data.confidence
        );


    } catch (error) {

        console.error(error);

        alert(
            "Could not connect to the AeroVet API.\n\n" +
            "Make sure the FastAPI server is running."
        );

    } finally {

        loading.classList.add("hidden");

        analyzeButton.disabled = false;
    }
}


/* --------------------------------------------------
   Display prediction
-------------------------------------------------- */

function showResult(
    predictedClass,
    confidenceValue
) {

    prediction.textContent =
        predictedClass;

    predictionBadge.textContent =
        predictedClass;

    confidence.textContent =
        `${Number(confidenceValue).toFixed(2)}%`;

    confidenceFill.style.width =
        `${confidenceValue}%`;


    /* Change badge based on prediction */

    predictionBadge.style.background = "";
    predictionBadge.style.color = "";


    if (predictedClass === "Healthy") {

        predictionBadge.style.background =
            "#dcfce7";

        predictionBadge.style.color =
            "#166534";

    } else if (predictedClass === "Unhealthy") {

        predictionBadge.style.background =
            "#fee2e2";

        predictionBadge.style.color =
            "#991b1b";

    } else {

        predictionBadge.style.background =
            "#fef3c7";

        predictionBadge.style.color =
            "#92400e";
    }


    result.classList.remove("hidden");
}


/* --------------------------------------------------
   File size
-------------------------------------------------- */

function formatFileSize(bytes) {

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDuration(seconds) {

    if (!Number.isFinite(seconds)) {
        return "-";
    }

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}