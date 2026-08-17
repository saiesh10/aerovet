/* =========================================================
   AEROVET - COMPLETE FRONTEND JAVASCRIPT
   ========================================================= */

const API_URL = "http://127.0.0.1:8000/predict";

const HISTORY_KEY = "aerovet_analysis_history";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const fileInput =
    document.getElementById("audio-file");

const fileName =
    document.getElementById("file-name");

const analyzeButton =
    document.getElementById("analyze-button");

const dropZone =
    document.getElementById("drop-zone");

const loading =
    document.getElementById("loading");

const result =
    document.getElementById("result");

const prediction =
    document.getElementById("prediction");

const predictionBadge =
    document.getElementById("prediction-badge");

const confidence =
    document.getElementById("confidence");

const confidenceFill =
    document.getElementById("confidence-fill");

const audioInfo =
    document.getElementById("audio-info");

const audioFileName =
    document.getElementById("audio-file-name");

const audioFileSize =
    document.getElementById("audio-file-size");

const audioDuration =
    document.getElementById("audio-duration");

const audioPlayer =
    document.getElementById("audio-player");


let selectedFile = null;
let analysisStartTime = null;
let currentAnalysis = null;


/* =========================================================
   FILE SELECTION
   ========================================================= */

if (fileInput) {

    fileInput.addEventListener(
        "change",
        function () {

            if (!fileInput.files.length) {
                return;
            }

            selectedFile =
                fileInput.files[0];

            handleFile(selectedFile);
        }
    );
}


/* =========================================================
   HANDLE FILE
   ========================================================= */

function handleFile(file) {

    if (
        !file ||
        !file.name.toLowerCase().endsWith(".wav")
    ) {

        alert(
            "Please select a WAV audio file."
        );

        selectedFile = null;

        if (analyzeButton) {
            analyzeButton.disabled = true;
        }

        if (fileName) {
            fileName.textContent =
                "No file selected";
        }

        return;
    }


    selectedFile = file;


    if (audioFileName) {
        audioFileName.textContent =
            file.name;
    }


    if (audioFileSize) {
        audioFileSize.textContent =
            formatFileSize(file.size);
    }


    if (audioDuration) {
        audioDuration.textContent =
            "Loading...";
    }


    if (audioPlayer) {

        audioPlayer.src =
            URL.createObjectURL(file);

        if (audioInfo) {
            audioInfo.classList.remove("hidden");
        }

        audioPlayer.addEventListener(
            "loadedmetadata",
            function () {

                if (audioDuration) {

                    audioDuration.textContent =
                        formatDuration(
                            audioPlayer.duration
                        );
                }

            },
            { once: true }
        );
    }


    if (fileName) {

        fileName.textContent =
            `${file.name} (${formatFileSize(file.size)})`;
    }


    if (analyzeButton) {
        analyzeButton.disabled = false;
    }


    if (result) {
        result.classList.add("hidden");
    }
}


/* =========================================================
   DRAG AND DROP
   ========================================================= */

if (dropZone) {

    dropZone.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            dropZone.classList.add(
                "dragover"
            );
        }
    );


    dropZone.addEventListener(
        "dragleave",
        function () {

            dropZone.classList.remove(
                "dragover"
            );
        }
    );


    dropZone.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            dropZone.classList.remove(
                "dragover"
            );

            const files =
                event.dataTransfer.files;

            if (!files.length) {
                return;
            }

            handleFile(files[0]);
        }
    );
}


/* =========================================================
   ANALYZE BUTTON
   ========================================================= */

if (analyzeButton) {

    analyzeButton.addEventListener(
        "click",
        analyzeAudio
    );
}


/* =========================================================
   ANALYZE AUDIO
   ========================================================= */

async function analyzeAudio() {

    if (!selectedFile) {

        alert(
            "Please select a WAV recording first."
        );

        return;
    }


    if (analyzeButton) {
        analyzeButton.disabled = true;
    }


    if (loading) {
        loading.classList.remove("hidden");
    }


    if (result) {
        result.classList.add("hidden");
    }


    analysisStartTime =
        performance.now();


    const formData =
        new FormData();

    formData.append(
        "file",
        selectedFile
    );


    try {

        const response =
            await fetch(
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


        const data =
            await response.json();


        const analysisTime =
            (
                performance.now() -
                analysisStartTime
            ) / 1000;


        const predictedClass =
            data.prediction;


        const confidenceValue =
            Number(data.confidence);


        showResult(
            predictedClass,
            confidenceValue,
            analysisTime
        );


        addToHistory(
            selectedFile,
            predictedClass,
            confidenceValue,
            analysisTime
        );


        currentAnalysis = {

            fileName:
                selectedFile.name,

            fileSize:
                formatFileSize(
                    selectedFile.size
                ),

            duration:
                audioPlayer &&
                Number.isFinite(
                    audioPlayer.duration
                )
                    ? formatDuration(
                        audioPlayer.duration
                    )
                    : "-",

            prediction:
                predictedClass,

            confidence:
                confidenceValue,

            analysisTime:
                analysisTime,

            timestamp:
                new Date().toISOString()
        };


        /*
         * Show warning for unhealthy prediction.
         */

        if (
            predictedClass ===
            "Unhealthy"
        ) {

            showUnhealthyAlert(
                confidenceValue
            );
        }


        updateDashboard();
        renderHistory();


    } catch (error) {

        console.error(
            "AeroVet analysis error:",
            error
        );


        alert(
            "Could not connect to the AeroVet API.\n\n" +
            "Make sure the FastAPI server is running."
        );


    } finally {

        if (loading) {
            loading.classList.add(
                "hidden"
            );
        }

        if (analyzeButton) {
            analyzeButton.disabled = false;
        }
    }
}


/* =========================================================
   SHOW RESULT
   ========================================================= */

function showResult(
    predictedClass,
    confidenceValue,
    analysisTime
) {

    if (prediction) {
        prediction.textContent =
            predictedClass;
    }


    if (predictionBadge) {

        predictionBadge.textContent =
            predictedClass;

        predictionBadge.style.background =
            "";

        predictionBadge.style.color =
            "";
    }


    if (confidence) {

        confidence.textContent =
            `${confidenceValue.toFixed(2)}%`;
    }


    if (confidenceFill) {

        confidenceFill.style.width =
            `${Math.min(
                Math.max(confidenceValue, 0),
                100
            )}%`;
    }


    /*
     * Prediction badge colors
     */

    if (predictionBadge) {

        if (
            predictedClass ===
            "Healthy"
        ) {

            predictionBadge.style.background =
                "#dcfce7";

            predictionBadge.style.color =
                "#166534";


        } else if (
            predictedClass ===
            "Unhealthy"
        ) {

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
    }


    /*
     * Update additional result information.
     */

    setElementText(
        "result-file-name",
        selectedFile
            ? selectedFile.name
            : "-"
    );


    setElementText(
        "result-file-size",
        selectedFile
            ? formatFileSize(
                selectedFile.size
            )
            : "-"
    );


    setElementText(
        "result-duration",
        getAudioDuration()
    );


    setElementText(
        "analysis-time",
        `${analysisTime.toFixed(2)} seconds`
    );


    /*
     * Interpretation
     */

    setElementText(
        "interpretation",
        getInterpretation(
            predictedClass,
            confidenceValue
        )
    );


    /*
     * Result note
     */

    setElementText(
        "result-note-text",
        getResultNote(
            predictedClass,
            confidenceValue
        )
    );


    if (result) {
        result.classList.remove(
            "hidden"
        );
    }
}


/* =========================================================
   INTERPRETATION
   ========================================================= */

function getInterpretation(
    predictedClass,
    confidenceValue
) {

    if (
        predictedClass ===
        "Healthy"
    ) {

        return (
            "The vocalization pattern is classified " +
            "as healthy by the AeroVet model. " +
            `The model confidence is ${confidenceValue.toFixed(2)}%.`
        );
    }


    if (
        predictedClass ===
        "Unhealthy"
    ) {

        return (
            "The vocalization pattern may indicate " +
            "possible poultry health stress or illness. " +
            "Further observation and veterinary assessment " +
            "are recommended."
        );
    }


    return (
        "The recording was classified as noise or " +
        "non-target audio. Consider recording clearer " +
        "poultry vocalizations."
    );
}


/* =========================================================
   RESULT NOTE
   ========================================================= */

function getResultNote(
    predictedClass,
    confidenceValue
) {

    if (
        predictedClass ===
        "Unhealthy"
    ) {

        return (
            "Warning: AeroVet detected a potentially " +
            "unhealthy vocalization. This is an AI-assisted " +
            "screening result and should not replace " +
            "professional veterinary diagnosis."
        );
    }


    if (
        predictedClass ===
        "Healthy"
    ) {

        return (
            "The recording appears healthy according to " +
            "the current AI model prediction."
        );
    }


    return (
        "The recording was identified as noise. " +
        "Try uploading a clearer poultry vocalization."
    );
}


/* =========================================================
   UNHEALTHY ALERT
   ========================================================= */

function showUnhealthyAlert(
    confidenceValue
) {

    /*
     * Browser alert keeps the prototype simple
     * and requires no additional HTML.
     */

    setTimeout(
        function () {

            alert(
                "⚠ AeroVet Health Alert\n\n" +
                "Potentially unhealthy vocalization detected.\n\n" +
                `Confidence: ${confidenceValue.toFixed(2)}%\n\n` +
                "Consider checking the flock and, if necessary, " +
                "consulting a veterinarian."
            );

        },
        150
    );
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function getHistory() {

    try {

        const stored =
            localStorage.getItem(
                HISTORY_KEY
            );


        if (!stored) {
            return [];
        }


        const parsed =
            JSON.parse(stored);


        return Array.isArray(parsed)
            ? parsed
            : [];


    } catch (error) {

        console.error(
            "Could not read AeroVet history:",
            error
        );

        return [];
    }
}


/* =========================================================
   SAVE HISTORY
   ========================================================= */

function saveHistory(history) {

    try {

        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(history)
        );

    } catch (error) {

        console.error(
            "Could not save AeroVet history:",
            error
        );
    }
}


/* =========================================================
   ADD HISTORY
   ========================================================= */

function addToHistory(
    file,
    predictedClass,
    confidenceValue,
    analysisTime
) {

    if (!file) {
        return;
    }


    const history =
        getHistory();


    const item = {

        id:
            Date.now(),

        fileName:
            file.name,

        fileSize:
            file.size,

        prediction:
            predictedClass,

        confidence:
            Number(confidenceValue),

        analysisTime:
            Number(analysisTime),

        timestamp:
            new Date().toISOString()
    };


    history.unshift(item);


    /*
     * Keep latest 20 analyses.
     */

    saveHistory(
        history.slice(0, 20)
    );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

    const history =
        getHistory();


    const total =
        history.length;


    const healthy =
        history.filter(
            item =>
                item.prediction ===
                "Healthy"
        ).length;


    const unhealthy =
        history.filter(
            item =>
                item.prediction ===
                "Unhealthy"
        ).length;


    const noise =
        history.filter(
            item =>
                item.prediction ===
                "Noise"
        ).length;


    /*
     * Average confidence
     */

    const confidenceValues =
        history
            .map(
                item =>
                    Number(item.confidence)
            )
            .filter(
                value =>
                    Number.isFinite(value)
            );


    const averageConfidence =
        confidenceValues.length
            ? confidenceValues.reduce(
                (sum, value) =>
                    sum + value,
                0
            ) /
            confidenceValues.length
            : 0;


    /*
     * Counts
     */

    setElementText(
        "total-analyses",
        total
    );


    setElementText(
        "healthy-count",
        healthy
    );


    setElementText(
        "unhealthy-count",
        unhealthy
    );


    setElementText(
        "noise-count",
        noise
    );


    setElementText(
        "average-confidence",
        `${averageConfidence.toFixed(2)}%`
    );


    /*
     * Total label
     */

    setElementText(
        "distribution-total",
        `${total} ${
            total === 1
                ? "analysis"
                : "analyses"
        }`
    );


    /*
     * Percentages
     */

    const healthyPercentage =
        total === 0
            ? 0
            : (
                healthy /
                total
            ) * 100;


    const unhealthyPercentage =
        total === 0
            ? 0
            : (
                unhealthy /
                total
            ) * 100;


    const noisePercentage =
        total === 0
            ? 0
            : (
                noise /
                total
            ) * 100;


    setElementText(
        "healthy-percentage",
        `${healthyPercentage.toFixed(0)}%`
    );


    setElementText(
        "unhealthy-percentage",
        `${unhealthyPercentage.toFixed(0)}%`
    );


    setElementText(
        "noise-percentage",
        `${noisePercentage.toFixed(0)}%`
    );


    /*
     * Progress bars
     */

    setElementWidth(
        "healthy-bar",
        healthyPercentage
    );


    setElementWidth(
        "unhealthy-bar",
        unhealthyPercentage
    );


    setElementWidth(
        "noise-bar",
        noisePercentage
    );
}


/* =========================================================
   ADVANCED HISTORY
   ========================================================= */

function renderHistory() {

    const analysisHistory =
        document.getElementById(
            "analysis-history"
        );


    if (!analysisHistory) {
        return;
    }


    const history =
        getHistory();


    if (!history.length) {

        analysisHistory.innerHTML = `
            <div class="empty-history">
                No analyses yet.
            </div>
        `;

        return;
    }


    analysisHistory.innerHTML =
        history.map(
            item => {

                const predictionClass =
                    String(
                        item.prediction || ""
                    ).toLowerCase();


                const confidenceValue =
                    Number(
                        item.confidence
                    );


                return `
                    <div class="history-item">

                        <div class="history-file">

                            <strong>
                                ${escapeHtml(
                                    item.fileName
                                )}
                            </strong>

                            <div class="history-time">
                                ${formatHistoryTime(
                                    item.timestamp
                                )}
                            </div>

                        </div>


                        <span
                            class="history-prediction ${predictionClass}"
                        >
                            ${escapeHtml(
                                item.prediction
                            )}
                        </span>


                        <div class="history-confidence">
                            ${
                                Number.isFinite(
                                    confidenceValue
                                )
                                    ? confidenceValue.toFixed(2)
                                    : "0.00"
                            }%
                        </div>


                        <div class="history-analysis-time">
                            ${
                                Number.isFinite(
                                    Number(
                                        item.analysisTime
                                    )
                                )
                                    ? Number(
                                        item.analysisTime
                                    ).toFixed(2)
                                    : "-"
                            }s
                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   CLEAR HISTORY
   ========================================================= */

function clearHistory() {

    const history =
        getHistory();


    if (!history.length) {
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


    renderHistory();

    updateDashboard();
}


/* =========================================================
   CLEAR HISTORY BUTTON
   ========================================================= */

document.addEventListener(
    "click",
    function (event) {

        if (
            event.target &&
            event.target.id ===
            "clear-history"
        ) {

            clearHistory();
        }
    }
);


/* =========================================================
   HISTORY SEARCH
   ========================================================= */

document.addEventListener(
    "input",
    function (event) {

        if (
            event.target &&
            event.target.id ===
            "history-search"
        ) {

            filterHistory(
                event.target.value
            );
        }
    }
);


function filterHistory(
    searchTerm
) {

    const analysisHistory =
        document.getElementById(
            "analysis-history"
        );


    if (!analysisHistory) {
        return;
    }


    const history =
        getHistory();


    const term =
        String(searchTerm)
            .toLowerCase()
            .trim();


    const filtered =
        history.filter(
            item =>
                String(
                    item.fileName
                )
                    .toLowerCase()
                    .includes(term)
                ||
                String(
                    item.prediction
                )
                    .toLowerCase()
                    .includes(term)
        );


    if (!filtered.length) {

        analysisHistory.innerHTML = `
            <div class="empty-history">
                No matching analyses found.
            </div>
        `;

        return;
    }


    analysisHistory.innerHTML =
        filtered.map(
            item => {

                const predictionClass =
                    String(
                        item.prediction
                    ).toLowerCase();


                return `
                    <div class="history-item">

                        <div class="history-file">

                            <strong>
                                ${escapeHtml(
                                    item.fileName
                                )}
                            </strong>

                            <div class="history-time">
                                ${formatHistoryTime(
                                    item.timestamp
                                )}
                            </div>

                        </div>

                        <span
                            class="history-prediction ${predictionClass}"
                        >
                            ${escapeHtml(
                                item.prediction
                            )}
                        </span>

                        <div class="history-confidence">
                            ${Number(
                                item.confidence
                            ).toFixed(2)}%
                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   EXPORT REPORT
   ========================================================= */

function exportReport() {

    const history =
        getHistory();


    if (!history.length) {

        alert(
            "There are no analyses available to export."
        );

        return;
    }


    const total =
        history.length;


    const healthy =
        history.filter(
            item =>
                item.prediction ===
                "Healthy"
        ).length;


    const unhealthy =
        history.filter(
            item =>
                item.prediction ===
                "Unhealthy"
        ).length;


    const noise =
        history.filter(
            item =>
                item.prediction ===
                "Noise"
        ).length;


    const averageConfidence =
        history.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.confidence || 0
                ),
            0
        ) / total;


    let report = "";


    report +=
        "AEROVET ANALYSIS REPORT\n";

    report +=
        "====================================\n\n";


    report +=
        `Generated: ${new Date().toLocaleString()}\n\n`;


    report +=
        "SUMMARY\n";

    report +=
        "------------------------------------\n";

    report +=
        `Total Analyses: ${total}\n`;

    report +=
        `Healthy: ${healthy}\n`;

    report +=
        `Unhealthy: ${unhealthy}\n`;

    report +=
        `Noise: ${noise}\n`;

    report +=
        `Average Confidence: ${averageConfidence.toFixed(2)}%\n\n`;


    report +=
        "ANALYSIS HISTORY\n";

    report +=
        "------------------------------------\n\n";


    history.forEach(
        (item, index) => {

            report +=
                `Analysis ${index + 1}\n`;

            report +=
                `File: ${item.fileName}\n`;

            report +=
                `Prediction: ${item.prediction}\n`;

            report +=
                `Confidence: ${Number(
                    item.confidence
                ).toFixed(2)}%\n`;

            report +=
                `Analysis Time: ${
                    Number.isFinite(
                        Number(
                            item.analysisTime
                        )
                    )
                        ? Number(
                            item.analysisTime
                        ).toFixed(2)
                        : "-"
                } seconds\n`;

            report +=
                `Date: ${formatHistoryTime(
                    item.timestamp
                )}\n\n`;
        }
    );


    report +=
        "IMPORTANT\n";

    report +=
        "------------------------------------\n";

    report +=
        "AeroVet provides AI-assisted screening " +
        "and does not replace professional veterinary diagnosis.\n";


    const blob =
        new Blob(
            [report],
            {
                type:
                    "text/plain;charset=utf-8"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;


    link.download =
        `aerovet-report-${getDateStamp()}.txt`;


    document.body.appendChild(link);


    link.click();


    document.body.removeChild(link);


    URL.revokeObjectURL(url);
}


/* =========================================================
   EXPORT BUTTON
   ========================================================= */

document.addEventListener(
    "click",
    function (event) {

        if (
            event.target &&
            (
                event.target.id ===
                "export-report"
                ||
                event.target.closest(
                    "#export-report"
                )
            )
        ) {

            exportReport();
        }
    }
);


/* =========================================================
   UTILITIES
   ========================================================= */

function formatFileSize(bytes) {

    if (!Number.isFinite(bytes)) {
        return "-";
    }


    if (bytes < 1024) {
        return `${bytes} B`;
    }


    if (
        bytes <
        1024 * 1024
    ) {

        return (
            `${(
                bytes / 1024
            ).toFixed(1)} KB`
        );
    }


    return (
        `${(
            bytes /
            (1024 * 1024)
        ).toFixed(1)} MB`
    );
}


function formatDuration(seconds) {

    if (
        !Number.isFinite(seconds)
    ) {

        return "-";
    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remainingSeconds =
        Math.floor(
            seconds % 60
        );


    return (
        `${minutes}:` +
        `${String(
            remainingSeconds
        ).padStart(2, "0")}`
    );
}


function getAudioDuration() {

    if (
        audioPlayer &&
        Number.isFinite(
            audioPlayer.duration
        )
    ) {

        return formatDuration(
            audioPlayer.duration
        );
    }


    return "-";
}


function formatHistoryTime(
    timestamp
) {

    const date =
        new Date(timestamp);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";
    }


    return date.toLocaleString();
}


function getDateStamp() {

    const date =
        new Date();


    return (
        `${date.getFullYear()}-` +
        `${String(
            date.getMonth() + 1
        ).padStart(2, "0")}-` +
        `${String(
            date.getDate()
        ).padStart(2, "0")}`
    );
}


function escapeHtml(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


function setElementText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent =
            value;
    }
}


function setElementWidth(
    id,
    percentage
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.style.width =
        `${Math.max(
            0,
            Math.min(
                100,
                percentage
            )
        )}%`;
}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        renderHistory();

        updateDashboard();

    }
);