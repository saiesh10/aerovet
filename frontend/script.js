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
        "result-interpretation",
        getInterpretation(
            predictedClass,
            confidenceValue
        )
    );


    /*
     * Unhealthy alert display in UI
     */

    const unhealthyAlert =
        document.getElementById("unhealthy-alert");

    if (unhealthyAlert) {
        if (predictedClass === "Unhealthy") {
            unhealthyAlert.classList.remove("hidden");
        } else {
            unhealthyAlert.classList.add("hidden");
        }
    }


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

    if (predictedClass === "Healthy") {
        if (confidenceValue >= 85) {
            return (
                `The vocalization pattern is classified as Healthy with high confidence (${confidenceValue.toFixed(2)}%). ` +
                "Acoustic frequency harmonics and call cadences fall well within expected normal flock baselines. " +
                "No acoustic symptoms of respiratory distress, rales, or coughing were detected."
            );
        } else {
            return (
                `The vocalization pattern is classified as Healthy with moderate confidence (${confidenceValue.toFixed(2)}%). ` +
                "Flock sounds appear normal. Routine periodic flock monitoring is recommended."
            );
        }
    }


    if (predictedClass === "Unhealthy") {
        if (confidenceValue >= 85) {
            return (
                `AeroVet detected acoustic anomalies consistent with poultry distress or respiratory illness (${confidenceValue.toFixed(2)}% confidence). ` +
                "Immediate flock physical inspection, coop ventilation/temperature verification, and veterinary consultation are strongly advised."
            );
        } else {
            return (
                `AeroVet detected potential abnormal vocalization signatures (${confidenceValue.toFixed(2)}% confidence). ` +
                "Further flock observation, environmental checks, and testing additional audio samples are recommended."
            );
        }
    }


    return (
        `The audio sample was identified as ambient noise or non-target sound (${confidenceValue.toFixed(2)}% confidence). ` +
        "Ensure the microphone is positioned close to the birds and record in a low-noise environment for the best diagnostic accuracy."
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

        duration:
            getAudioDuration(),

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
     * Keep latest 50 analyses.
     */

    saveHistory(
        history.slice(0, 50)
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
   EXPORT REPORT (PDF)
   ========================================================= */

async function exportReport() {

    let history =
        getHistory();


    if (!history.length && currentAnalysis) {
        history = [currentAnalysis];
    }


    if (!history.length) {

        alert(
            "There are no analyses available to export. Please analyze at least one audio file first."
        );

        return;
    }


    const exportBtn =
        document.getElementById("export-report");

    const originalHtml =
        exportBtn
            ? exportBtn.innerHTML
            : "";


    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = "⏳ Generating PDF...";
    }


    try {

        const total =
            history.length;

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

        const healthyPct =
            ((healthy / total) * 100).toFixed(1);

        const unhealthyPct =
            ((unhealthy / total) * 100).toFixed(1);

        const noisePct =
            ((noise / total) * 100).toFixed(1);

        const averageConfidence =
            (
                history.reduce(
                    (sum, item) =>
                        sum + Number(item.confidence || 0),
                    0
                ) / total
            ).toFixed(2);

        const generatedTime =
            new Date().toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short"
            });

        const reportId =
            `AVR-${Date.now().toString().slice(-6)}`;


        /*
         * Check for jsPDF library
         */

        const jsPdfConstructor =
            (window.jspdf && window.jspdf.jsPDF) ||
            window.jsPDF;


        if (typeof jsPdfConstructor === "function") {

            const doc = new jsPdfConstructor({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });


            /*
             * 1. TOP HEADER BANNER
             */

            doc.setFillColor(15, 23, 42); // #0f172a
            doc.rect(0, 0, 210, 26, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13.5);
            doc.text(
                "AEROPHONIC VETERINARY SURVEILLANCE REPORT",
                14,
                11
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(203, 213, 225);
            doc.text(
                "AeroVet AI-Assisted Bioacoustic Poultry Vocalization Screening System",
                14,
                17.5
            );

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text(
                `REPORT ID: ${reportId}`,
                196,
                11,
                { align: "right" }
            );

            doc.setFont("helvetica", "normal");
            doc.setTextColor(203, 213, 225);
            doc.text(
                `Date: ${generatedTime}`,
                196,
                17.5,
                { align: "right" }
            );


            /*
             * 2. HEALTH STATUS ASSESSMENT BANNER
             */

            const startY = 32;

            if (unhealthy > 0) {

                doc.setFillColor(254, 242, 242);
                doc.setDrawColor(254, 202, 202);
                doc.roundedRect(14, startY, 182, 16, 2, 2, "FD");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(153, 27, 27);
                doc.text(
                    "ATTENTION REQUIRED: Potential Abnormal Vocalizations Detected",
                    18,
                    startY + 6
                );

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.6);
                doc.setTextColor(127, 29, 29);
                doc.text(
                    `${unhealthy} of ${total} recorded audio sample(s) (${unhealthyPct}%) exhibited acoustic distress patterns consistent with respiratory illness or flock stress. Immediate inspection advised.`,
                    18,
                    startY + 11.5
                );

            } else {

                doc.setFillColor(236, 253, 245);
                doc.setDrawColor(167, 243, 208);
                doc.roundedRect(14, startY, 182, 16, 2, 2, "FD");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(6, 95, 70);
                doc.text(
                    "NORMAL FLOCK STATUS: Standard Healthy Acoustic Soundscape",
                    18,
                    startY + 6
                );

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.6);
                doc.setTextColor(4, 120, 87);
                doc.text(
                    "All analyzed vocalizations match standard healthy baseline poultry acoustics. No respiratory rales or distress calls detected. Continue routine surveillance.",
                    18,
                    startY + 11.5
                );
            }


            /*
             * 3. EXECUTIVE SUMMARY METRICS CARDS
             */

            const cardsY = 52;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(
                "EXECUTIVE SURVEILLANCE SUMMARY",
                14,
                cardsY
            );

            const cardW = 42.5;
            const cardH = 17;
            const cardTop = cardsY + 3;

            // Card 1: Total
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, cardTop, cardW, cardH, 2, 2, "FD");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text("TOTAL SAMPLES", 18, cardTop + 5);
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(String(total), 18, cardTop + 11);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.text("Audio files analyzed", 18, cardTop + 14.5);

            // Card 2: Healthy
            doc.setFillColor(236, 253, 245);
            doc.setDrawColor(167, 243, 208);
            doc.roundedRect(60.5, cardTop, cardW, cardH, 2, 2, "FD");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(4, 120, 87);
            doc.text("HEALTHY FLOCK", 64.5, cardTop + 5);
            doc.setFontSize(11);
            doc.setTextColor(6, 95, 70);
            doc.text(`${healthy} (${healthyPct}%)`, 64.5, cardTop + 11);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(4, 120, 87);
            doc.text("Normal soundscape", 64.5, cardTop + 14.5);

            // Card 3: Unhealthy
            doc.setFillColor(254, 242, 242);
            doc.setDrawColor(254, 202, 202);
            doc.roundedRect(107, cardTop, cardW, cardH, 2, 2, "FD");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(185, 28, 28);
            doc.text("AT-RISK / UNHEALTHY", 111, cardTop + 5);
            doc.setFontSize(11);
            doc.setTextColor(153, 27, 27);
            doc.text(`${unhealthy} (${unhealthyPct}%)`, 111, cardTop + 11);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(185, 28, 28);
            doc.text("Anomalies flagged", 111, cardTop + 14.5);

            // Card 4: Confidence
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(153.5, cardTop, cardW, cardH, 2, 2, "FD");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text("MEAN CONFIDENCE", 157.5, cardTop + 5);
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(`${averageConfidence}%`, 157.5, cardTop + 11);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.text(`${noise} Noise sample(s)`, 157.5, cardTop + 14.5);


            /*
             * 4. COMPLETE HISTORY AUDIT TABLE (DIRECT VECTOR DRAWING)
             */

            let tableY = 78;

            // Table Header Bar
            doc.setFillColor(15, 23, 42); // #0f172a
            doc.rect(14, tableY, 182, 8, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.2);

            doc.text("#", 19, tableY + 5.2, { align: "center" });
            doc.text("AUDIO FILE", 26, tableY + 5.2);
            doc.text("CLASSIFICATION", 98, tableY + 5.2, { align: "center" });
            doc.text("CONFIDENCE", 126, tableY + 5.2, { align: "right" });
            doc.text("DURATION", 144, tableY + 5.2, { align: "center" });
            doc.text("LATENCY", 162, tableY + 5.2, { align: "center" });
            doc.text("TIMESTAMP", 192, tableY + 5.2, { align: "right" });

            tableY += 8;

            // Render each row
            history.forEach((item, idx) => {

                if (tableY + 9 > 275) {
                    doc.addPage();
                    tableY = 20;

                    // Redraw header on new page
                    doc.setFillColor(15, 23, 42);
                    doc.rect(14, tableY, 182, 8, "F");
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(7.2);
                    doc.text("#", 19, tableY + 5.2, { align: "center" });
                    doc.text("AUDIO FILE", 26, tableY + 5.2);
                    doc.text("CLASSIFICATION", 98, tableY + 5.2, { align: "center" });
                    doc.text("CONFIDENCE", 126, tableY + 5.2, { align: "right" });
                    doc.text("DURATION", 144, tableY + 5.2, { align: "center" });
                    doc.text("LATENCY", 162, tableY + 5.2, { align: "center" });
                    doc.text("TIMESTAMP", 192, tableY + 5.2, { align: "right" });
                    tableY += 8;
                }

                // Row background (alternating)
                if (idx % 2 === 1) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(14, tableY, 182, 8, "F");
                }

                // Row border bottom
                doc.setDrawColor(241, 245, 249);
                doc.line(14, tableY + 8, 196, tableY + 8);

                // Index
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(100, 116, 139);
                doc.text(String(idx + 1), 19, tableY + 5.2, { align: "center" });

                // File Name (truncated if long)
                let name = String(item.fileName || "-");
                if (name.length > 28) {
                    name = name.substring(0, 25) + "...";
                }
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42);
                doc.text(name, 26, tableY + 5.2);

                // Prediction badge
                const pred = String(item.prediction || "-");
                if (pred === "Healthy") {
                    doc.setFillColor(236, 253, 245);
                    doc.setDrawColor(167, 243, 208);
                    doc.roundedRect(87, tableY + 1.6, 22, 4.8, 1.5, 1.5, "FD");
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(6.8);
                    doc.setTextColor(4, 120, 87);
                    doc.text("Healthy", 98, tableY + 5, { align: "center" });
                } else if (pred === "Unhealthy") {
                    doc.setFillColor(254, 242, 242);
                    doc.setDrawColor(254, 202, 202);
                    doc.roundedRect(86, tableY + 1.6, 24, 4.8, 1.5, 1.5, "FD");
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(6.8);
                    doc.setTextColor(185, 28, 28);
                    doc.text("Unhealthy", 98, tableY + 5, { align: "center" });
                } else {
                    doc.setFillColor(254, 243, 199);
                    doc.setDrawColor(253, 230, 138);
                    doc.roundedRect(88, tableY + 1.6, 20, 4.8, 1.5, 1.5, "FD");
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(6.8);
                    doc.setTextColor(180, 83, 9);
                    doc.text("Noise", 98, tableY + 5, { align: "center" });
                }

                // Confidence
                const conf = Number(item.confidence || 0).toFixed(2);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(15, 23, 42);
                doc.text(`${conf}%`, 126, tableY + 5.2, { align: "right" });

                // Duration
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.text(String(item.duration || "-"), 144, tableY + 5.2, { align: "center" });

                // Latency
                const lat = Number.isFinite(Number(item.analysisTime))
                    ? `${Number(item.analysisTime).toFixed(2)}s`
                    : "-";
                doc.text(lat, 162, tableY + 5.2, { align: "center" });

                // Date
                const dateText = formatHistoryTime(item.timestamp);
                doc.setFontSize(6.8);
                doc.text(dateText, 192, tableY + 5.2, { align: "right" });

                tableY += 8;
            });


            /*
             * 5. CLINICAL OBSERVATIONS & BIOSECURITY ADVISORY
             */

            let finalY = tableY + 6;

            if (finalY + 30 > 275) {
                doc.addPage();
                finalY = 20;
            }


            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, finalY, 182, 25, 2, 2, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text(
                "CLINICAL OBSERVATIONS & BIOSECURITY ADVISORY",
                18,
                finalY + 5.5
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.2);
            doc.setTextColor(51, 65, 85);
            doc.text(
                "• Environmental Surveillance: Verify ambient coop ventilation, relative humidity (optimal 50-70%), and ammonia levels (<20 ppm).",
                18,
                finalY + 11
            );
            doc.text(
                "• Targeted Bioacoustic Monitoring: Record audio during dawn or quiet roosting intervals to detect early respiratory rales or coughing.",
                18,
                finalY + 15.5
            );
            doc.text(
                "• Veterinary Consultation: If abnormal vocalization rate increases, isolate affected pens and consult an avian veterinary specialist.",
                18,
                finalY + 20
            );


            /*
             * 6. PAGE FOOTERS ACROSS ALL PAGES
             */

            const totalPages =
                doc.getNumberOfPages();

            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.setDrawColor(226, 232, 240);
                doc.line(14, 284, 196, 284);
                doc.text(
                    "AeroVet Bioacoustics Prototype • Confidential Veterinary Screening Record",
                    14,
                    289
                );
                doc.text(
                    `Page ${i} of ${totalPages}`,
                    196,
                    289,
                    { align: "right" }
                );
            }


            /*
             * 7. SAVE VECTOR PDF
             */

            doc.save(
                `AeroVet_Flock_Report_${getDateStamp()}.pdf`
            );

        } else {

            /*
             * Native browser print dialog fallback
             */

            window.print();
        }

    } catch (error) {

        console.error(
            "AeroVet PDF Export error:",
            error
        );

        alert(
            "Failed to export PDF report. Please check the console for details."
        );

    } finally {

        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML =
                originalHtml || "📑 Export PDF Report";
        }
    }
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