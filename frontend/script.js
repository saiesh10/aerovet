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


        /* Save analysis */

        addToHistory(
            selectedFile,
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


/* =========================
   Analysis History
   ========================= */

const HISTORY_KEY = "aerovet_analysis_history";


function getHistory() {

    try {

        return JSON.parse(
            localStorage.getItem(HISTORY_KEY)
        ) || [];

    } catch (error) {

        console.error(
            "Could not read analysis history:",
            error
        );

        return [];
    }
}


function saveHistory(history) {

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history)
    );
}


function escapeHtml(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}


function formatHistoryTime(timestamp) {

    return new Date(timestamp).toLocaleString();
}


/* --------------------------------------------------
   Render History
-------------------------------------------------- */

function renderHistory() {

    const analysisHistory =
        document.getElementById("analysis-history");


    if (!analysisHistory) {

        console.error(
            "AeroVet: analysis-history element not found."
        );

        return;
    }


    const history = getHistory();


    if (history.length === 0) {

        analysisHistory.innerHTML = `
            <div class="empty-history">
                No analyses yet.
            </div>
        `;

        return;
    }


    analysisHistory.innerHTML =
        history.map(item => {

            const predictionClass =
                item.prediction.toLowerCase();


            return `
                <div class="history-item">

                    <div class="history-file">

                        <strong>
                            ${escapeHtml(item.fileName)}
                        </strong>

                        <div class="history-time">
                            ${formatHistoryTime(item.timestamp)}
                        </div>

                    </div>


                    <span
                        class="history-prediction ${predictionClass}"
                    >
                        ${escapeHtml(item.prediction)}
                    </span>


                    <div class="history-confidence">

                        ${Number(item.confidence).toFixed(2)}%

                    </div>

                </div>
            `;

        }).join("");
}


/* --------------------------------------------------
   Add Analysis To History
-------------------------------------------------- */

function addToHistory(
    file,
    predictedClass,
    confidenceValue
) {

    if (!file) {

        console.error(
            "AeroVet: no file supplied to history."
        );

        return;
    }


    const history = getHistory();


    history.unshift({

        fileName: file.name,

        prediction: predictedClass,

        confidence: Number(confidenceValue),

        timestamp: new Date().toISOString()

    });


    /*
     * Keep only the latest 10 analyses.
     */

    const limitedHistory =
        history.slice(0, 10);


    saveHistory(limitedHistory);


    /* Update history */

    renderHistory();


    /* Update dashboard */

    updateDashboard();
}


/* =========================
   Dashboard
   ========================= */

function updateDashboard() {

    const history = getHistory();


    /* Total */

    const total =
        history.length;


    /* Category counts */

    const healthy =
        history.filter(
            item => item.prediction === "Healthy"
        ).length;


    const unhealthy =
        history.filter(
            item => item.prediction === "Unhealthy"
        ).length;


    const noise =
        history.filter(
            item => item.prediction === "Noise"
        ).length;


    /* --------------------------------------------------
       Update count cards
    -------------------------------------------------- */

    const totalElement =
        document.getElementById("total-analyses");

    const healthyElement =
        document.getElementById("healthy-count");

    const unhealthyElement =
        document.getElementById("unhealthy-count");

    const noiseElement =
        document.getElementById("noise-count");


    if (totalElement) {

        totalElement.textContent =
            total;
    }


    if (healthyElement) {

        healthyElement.textContent =
            healthy;
    }


    if (unhealthyElement) {

        unhealthyElement.textContent =
            unhealthy;
    }


    if (noiseElement) {

        noiseElement.textContent =
            noise;
    }


    /* --------------------------------------------------
       Update total label
    -------------------------------------------------- */

    const distributionTotal =
        document.getElementById(
            "distribution-total"
        );


    if (distributionTotal) {

        distributionTotal.textContent =
            `${total} ${total === 1 ? "analysis" : "analyses"}`;
    }


    /* --------------------------------------------------
       Calculate percentages
    -------------------------------------------------- */

    const healthyPercentage =
        total === 0
            ? 0
            : (healthy / total) * 100;


    const unhealthyPercentage =
        total === 0
            ? 0
            : (unhealthy / total) * 100;


    const noisePercentage =
        total === 0
            ? 0
            : (noise / total) * 100;


    /* --------------------------------------------------
       Update percentage text
    -------------------------------------------------- */

    const healthyPercentageElement =
        document.getElementById(
            "healthy-percentage"
        );


    const unhealthyPercentageElement =
        document.getElementById(
            "unhealthy-percentage"
        );


    const noisePercentageElement =
        document.getElementById(
            "noise-percentage"
        );


    if (healthyPercentageElement) {

        healthyPercentageElement.textContent =
            `${healthyPercentage.toFixed(0)}%`;
    }


    if (unhealthyPercentageElement) {

        unhealthyPercentageElement.textContent =
            `${unhealthyPercentage.toFixed(0)}%`;
    }


    if (noisePercentageElement) {

        noisePercentageElement.textContent =
            `${noisePercentage.toFixed(0)}%`;
    }


    /* --------------------------------------------------
       Update progress bars
    -------------------------------------------------- */

    const healthyBar =
        document.getElementById(
            "healthy-bar"
        );


    const unhealthyBar =
        document.getElementById(
            "unhealthy-bar"
        );


    const noiseBar =
        document.getElementById(
            "noise-bar"
        );


    if (healthyBar) {

        healthyBar.style.width =
            `${healthyPercentage}%`;
    }


    if (unhealthyBar) {

        unhealthyBar.style.width =
            `${unhealthyPercentage}%`;
    }


    if (noiseBar) {

        noiseBar.style.width =
            `${noisePercentage}%`;
    }
}


/* --------------------------------------------------
   Clear history
-------------------------------------------------- */

document.addEventListener(
    "click",
    function (event) {

        if (
            event.target &&
            event.target.id === "clear-history"
        ) {

            const history =
                getHistory();


            if (history.length === 0) {
                return;
            }


            const confirmed =
                confirm(
                    "Clear all AeroVet analysis history?"
                );


            if (!confirmed) {
                return;
            }


            localStorage.removeItem(
                HISTORY_KEY
            );


            /* Update history */

            renderHistory();


            /* Reset dashboard */

            updateDashboard();
        }
    }
);


/* --------------------------------------------------
   Initial render
-------------------------------------------------- */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        renderHistory();

        updateDashboard();

    }
);