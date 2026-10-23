// ========================================
// JALRASTA SCRIPT
// ========================================


// ========================================
// INTRO VIDEO
// ========================================

const introVideo = document.getElementById("introVideo");


const intro = document.getElementById("intro");
const app = document.getElementById("app");
const enterButton = document.getElementById("enterButton");


// Video complete hone par
introVideo.addEventListener(
    "ended",
    function () {

        console.log(
            "JalRasta intro completed"
        );

    }
);


// ========================================
// ENTER JALRASTA
// ========================================

enterButton.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        event.stopPropagation();


        intro.style.display = "none";

        app.style.display = "block";


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }
);


// ========================================
// MODAL
// ========================================

const modal =
    document.getElementById("modal");

const modalContent =
    document.getElementById("modalContent");


function openModal(content) {

    modalContent.innerHTML = content;

    modal.style.display = "flex";

}


function closeModal() {

    modal.style.display = "none";

}


modal.addEventListener(
    "click",
    function (event) {

        if (event.target === modal) {

            closeModal();

        }

    }
);


// ========================================
// LIVE FLOOD MAP
// ========================================

function openMap() {

    openModal(`

        <h2>
            🗺️ Live Flood Intelligence Map
        </h2>

        <p>
            JalRasta continuously monitors
            water levels, flood zones,
            safe zones and rescue locations.
        </p>


        <div class="demoMap">

            <div class="mapWater"></div>


            <div class="mapLocation flood">
                📍 Flood Zone
            </div>


            <div class="mapLocation safe">
                📍 Safe Zone
            </div>


            <div class="mapLocation rescuePoint">
                🚑 Rescue Team
            </div>

        </div>


        <div class="dataBox">

            <h3>
                Current Area Analysis
            </h3>


            <p>
                🌊 Water Level:
                <b>4.8 metres</b>
            </p>


            <p>
                ⚠️ Flood Risk:
                <b>HIGH</b>
            </p>


            <p>
                👥 Estimated Population:
                <b>2,340</b>
            </p>

        </div>


        <button
            type="button"
            class="modalButton"
            onclick="analyseArea()">

            ANALYSE THIS AREA

        </button>

    `);

}


function analyseArea() {

    alert(

        "AREA ANALYSIS COMPLETE\n\n" +

        "Flood Risk: HIGH\n" +

        "Water Level: 4.8m\n" +

        "Population at Risk: 2,340\n" +

        "Rescue Priority: HIGH"

    );

}


// ========================================
// AI CHATBOT
// ========================================

function openChat() {

    openModal(`

        <h2>
            🤖 JalRasta AI Assistant
        </h2>


        <p>
            Ask JalRasta about floods,
            rainfall, safe routes and
            affected regions.
        </p>


        <div class="chatWindow">

            <div class="botMessage">

                Hello! 👋<br>
                I am JalRasta AI.<br>
                How can I help you?

            </div>


            <div class="userMessage">

                Which area should be
                evacuated first?

            </div>


            <div class="botMessage">

                Based on current flood risk,
                Zone 01 should be prioritised.

            </div>

        </div>


        <button
            type="button"
            class="modalButton"
            onclick="askAI()">

            ASK JALRASTA AI

        </button>

    `);

}


function askAI() {

    alert(

        "JALRASTA AI\n\n" +

        "Priority Zone: Zone 01\n" +

        "Risk Level: HIGH\n" +

        "Recommended Action: " +
        "Immediate evacuation"

    );

}


// ========================================
// CLOUD INTELLIGENCE
// ========================================

function openCloud() {

    openModal(`

        <div class="cloudDashboard">


            <h2>
                ☁️ Cloud Intelligence
            </h2>


            <p>
                Analyse cloud movement,
                rainfall probability and
                satellite observations
                for any location.
            </p>


            <div class="locationBox">

                <input
                    id="locationInput"
                    type="text"
                    placeholder="Enter city or location..."
                >


                <button
                    type="button"
                    class="modalButton"
                    onclick="analyseSelectedLocation()">

                    ANALYSE LOCATION →

                </button>

            </div>


            <div
                id="cloudLoading"
                style="display:none;">

                🛰️ Analysing location...

            </div>


            <div id="cloudMap"></div>


            <div id="cloudResult"></div>


        </div>

    `);

}


// ========================================
// CLOUD ANALYSIS
// ========================================

async function analyseSelectedLocation() {


    const locationInput =
        document.getElementById(
            "locationInput"
        );


    const loading =
        document.getElementById(
            "cloudLoading"
        );


    const result =
        document.getElementById(
            "cloudResult"
        );


    const mapElement =
        document.getElementById(
            "cloudMap"
        );


    if (
        !locationInput ||
        !loading ||
        !result ||
        !mapElement
    ) {

        console.error(
            "Cloud interface elements not found."
        );

        return;

    }


    const location =
        locationInput.value.trim();


    if (!location) {

        alert(
            "Please enter a location."
        );

        return;

    }


    // ====================================
    // START LOADING
    // ====================================

    loading.style.display =
        "block";


    loading.innerHTML =
        "🛰️ Analysing location...";


    result.innerHTML = "";


    mapElement.innerHTML = "";


    try {


        // ====================================
        // 1. GEOCODING
        // ====================================

        const geoResponse =
            await fetch(

                "https://geocoding-api.open-meteo.com/v1/search" +

                "?name=" +
                encodeURIComponent(location) +

                "&count=1" +

                "&format=json"

            );


        if (!geoResponse.ok) {

            throw new Error(
                "Location service is not responding."
            );

        }


        const geoData =
            await geoResponse.json();


        if (
            !geoData.results ||
            geoData.results.length === 0
        ) {

            throw new Error(
                "Location not found. Please enter a valid city."
            );

        }


        const place =
            geoData.results[0];


        console.log(
            "Location found:",
            place
        );


        // ====================================
        // 2. GET WEATHER DATA
        // ====================================

        const weatherURL =

            "http://127.0.0.1:5000" +

            "/cloud-analysis" +

            "?lat=" +
            encodeURIComponent(
                place.latitude
            ) +

            "&lon=" +
            encodeURIComponent(
                place.longitude
            );


        const weatherResponse =
            await fetch(weatherURL);


        if (!weatherResponse.ok) {

            let backendMessage =
                "Cloud analysis server is not responding.";

            try {

                const errorData =
                    await weatherResponse.json();

                if (errorData.error) {

                    backendMessage =
                        errorData.error;

                }

            }

            catch (e) {

                // Ignore JSON parsing error

            }


            throw new Error(
                backendMessage
            );

        }


        const data =
            await weatherResponse.json();


        console.log(
            "Weather data:",
            data
        );


        if (data.error) {

            throw new Error(
                data.error
            );

        }


        // ====================================
        // 3. SENTINEL-1
        // ====================================

        let sentinelHTML = "";


        try {


            const sentinelURL =

                "http://127.0.0.1:5000" +

                "/sentinel1-image" +

                "?lat=" +
                encodeURIComponent(
                    place.latitude
                ) +

                "&lon=" +
                encodeURIComponent(
                    place.longitude
                );


            const sentinelResponse =
                await fetch(
                    sentinelURL
                );


            const sentinelData =
                await sentinelResponse.json();


            console.log(
                "Sentinel data:",
                sentinelData
            );


            if (
                sentinelData.available === true &&
                sentinelData.image
            ) {


                sentinelHTML = `

                    <div class="satelliteObservation">

                        <h3>
                            🛰️ SENTINEL-1
                            SAR OBSERVATION
                        </h3>


                        <div class="realSARScene">

                            <img
                                src="http://127.0.0.1:5000${sentinelData.image}"
                                class="realSARImage"
                                alt="Sentinel-1 SAR observation"
                            >


                            <div class="sarScanOverlay"></div>

                            <div class="sarScanLine"></div>


                            <div class="sarLabel">

                                SENTINEL-1

                                <span>
                                    SAR ANALYSIS
                                </span>

                            </div>


                            <div class="sarTarget">

                                <span></span>

                                <b>
                                    ANALYSIS AREA
                                </b>

                            </div>

                        </div>


                        <div class="sarInfo">


                            <div>

                                <small>
                                    SATELLITE
                                </small>

                                <b>
                                    ${sentinelData.satellite || "Sentinel-1"}
                                </b>

                            </div>


                            <div>

                                <small>
                                    SENSOR
                                </small>

                                <b>
                                    ${sentinelData.sensor || "C-band SAR"}
                                </b>

                            </div>


                            <div>

                                <small>
                                    OBSERVATION
                                </small>

                                <b>
                                    ${sentinelData.observation || "Surface Observation"}
                                </b>

                            </div>


                            <div>

                                <small>
                                    LOCATION
                                </small>

                                <b>
                                    ${place.name},
                                    ${place.country || ""}
                                </b>

                            </div>


                        </div>


                        <div class="sarExplanation">

                            <strong>
                                📡 SAR OBSERVATION
                            </strong>

                            <p>
                                Radar-based satellite
                                observation can monitor
                                Earth's surface even when
                                optical imagery is affected
                                by cloud cover.
                            </p>

                        </div>


                    </div>

                `;

            }


            else {


                sentinelHTML = `

                    <div class="satelliteObservation">

                        <h3>
                            🛰️ SENTINEL-1
                            SAR OBSERVATION
                        </h3>


                        <div class="noSatelliteData">

                            <span>
                                🛰️
                            </span>


                            <b>
                                No recent Sentinel-1
                                observation is available
                                for this location.
                            </b>


                            <small>
                                Weather-based analysis
                                is still available.
                            </small>

                        </div>

                    </div>

                `;

            }


        }

        catch (sentinelError) {


            console.log(
                "Sentinel error:",
                sentinelError
            );


            sentinelHTML = `

                <div class="satelliteObservation">

                    <h3>
                        🛰️ SENTINEL-1
                        SAR OBSERVATION
                    </h3>


                    <div class="noSatelliteData">

                        <span>
                            ⚠️
                        </span>


                        <b>
                            Sentinel-1 imagery is
                            temporarily unavailable.
                        </b>


                        <small>
                            Weather analysis
                            remains available.
                        </small>

                    </div>

                </div>

            `;

        }


        // ====================================
        // 4. HIDE LOADING
        // ====================================

        loading.style.display =
            "none";


        // ====================================
        // 5. CREATE LEAFLET MAP
        // ====================================

        mapElement.innerHTML = "";


        const map =
            L.map(
                "cloudMap"
            ).setView(

                [
                    Number(place.latitude),
                    Number(place.longitude)
                ],

                8

            );


        L.tileLayer(

            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

            {

                attribution:
                    "&copy; OpenStreetMap contributors"

            }

        ).addTo(map);


        L.marker(

            [
                Number(place.latitude),
                Number(place.longitude)
            ]

        )
        .addTo(map)
        .bindPopup(

            `<b>${place.name}</b><br>
             Cloud & Weather Analysis`

        )
        .openPopup();


        // ====================================
        // 6. BUILD 12 HOUR FORECAST
        // ====================================

        let forecastHTML = "";


        if (
            Array.isArray(data.forecast) &&
            data.forecast.length > 0
        ) {


            forecastHTML =
                data.forecast
                .slice(0, 12)
                .map(

                    function (item, index) {


                        let hour =
                            "NOW";


                        if (
                            item.time &&
                            item.time.includes("T")
                        ) {

                            const timePart =
                                item.time
                                .split("T")[1]
                                .substring(0, 5);


                            hour =
                                index === 0
                                ? "NOW"
                                : timePart;

                        }


                        const probability =
                            Number(
                                item.rain_probability
                            ) || 0;


                        let icon =
                            "☁️";


                        if (
                            probability >= 70
                        ) {

                            icon =
                                "🌧️";

                        }

                        else if (
                            probability >= 40
                        ) {

                            icon =
                                "🌦️";

                        }


                        return `

                            <div class="forecastItem">

                                <small>
                                    ${hour}
                                </small>


                                <span>
                                    ${icon}
                                </span>


                                <b>
                                    ${probability}%
                                </b>

                            </div>

                        `;

                    }

                )
                .join("");

        }


        if (!forecastHTML) {

            forecastHTML = `

                <div class="noSatelliteData">

                    Forecast data is
                    temporarily unavailable.

                </div>

            `;

        }


        // ====================================
        // 7. FINAL RESULT
        // ====================================

       // ====================================
// 7. FINAL RESULT
// ====================================

result.innerHTML = `

    <div class="cloudAnalysisResult">

        <h3>
            📍 ${place.name},
            ${place.country || ""}
        </h3>

        <p>
            ☁️ Cloud Cover:
            <b>
                ${data.cloud_cover ?? "N/A"}%
            </b>
        </p>

        <p>
            🌧️ Rain Probability:
            <b>
                ${data.rain_probability ?? "N/A"}%
            </b>
        </p>

        <p>
            ⚠️ Weather Risk:
            <b>
                ${data.weather_risk || "N/A"}
            </b>
        </p>


        <div class="interpretationBox">

            <b>
                DIRECT INTERPRETATION
            </b>

            <p>
                ${data.interpretation || "Analysis completed successfully."}
            </p>

        </div>


        <!-- ================================= -->
        <!-- SENTINEL-1 SAR OBSERVATION -->
        <!-- ================================= -->

        ${sentinelHTML}


        <!-- ================================= -->
        <!-- SATELLITE CLOUD OBSERVATION -->
        <!-- ================================= -->

        <div class="satelliteFlow">

            <h3>
                🛰️ SATELLITE CLOUD OBSERVATION
            </h3>

            <div class="satelliteScene">

                <div class="satelliteObject">
                    🛰️
                </div>

                <div class="scanBeam">
                    ↓ ↓ ↓ ↓ ↓
                </div>

                <div class="cloudObjects">
                    ☁️ ☁️ ☁️ ☁️
                </div>

                <div class="scanBeam">
                    ↓ ↓ ↓ ↓ ↓
                </div>

                <div class="groundObject">
                    🌍
                </div>

            </div>


            <div class="analysisMessage">

                <b>
                    🧠 AI INTERPRETATION
                </b>

                <p>
                    Satellite observations are analysed
                    with cloud conditions and rainfall
                    probability to identify the upcoming
                    weather situation.
                </p>

            </div>

        </div>


        <!-- ================================= -->
        <!-- NEXT 12 HOURS -->
        <!-- ================================= -->

        <div class="forecastSection">

            <h3>
                🌧️ NEXT 12 HOURS
            </h3>

            <div class="forecastTimeline">

                ${forecastHTML}

            </div>

        </div>

    </div>

`;


// ====================================
// FIX LEAFLET MAP SIZE
// ====================================

setTimeout(() => {

    if (map) {
        map.invalidateSize();
    }

}, 300);


console.log(
    "JalRasta analysis completed successfully."
);


// ========================================
// END TRY
// ========================================

}

catch (error) {

    console.error(
        "JalRasta analysis error:",
        error
    );

    loading.style.display = "none";

    result.innerHTML = `

        <div class="alertBox">

            ⚠️ ${error.message}

        </div>

    `;

}

}


// ========================================
// PADDY VS FLOOD
// ========================================

const BACKEND_URL = "http://127.0.0.1:5000";
let paddyMapInstance = null;


function openDetection() {

    openModal(`

        <div class="paddyDashboard">

            <h2>🌾 Paddy vs Flood Detection</h2>

            <p>
                Enter a location to analyse satellite-based
                surface patterns and estimate whether the
                region is normal paddy land, currently
                flooded, or requires monitoring.
            </p>

            <div class="locationBox">

                <input
                    id="paddyLocationInput"
                    type="text"
                    placeholder="Enter city or location..."
                    onkeydown="if(event.key==='Enter'){analysePaddyLocation();}"
                >

                <button
                    type="button"
                    class="modalButton"
                    onclick="analysePaddyLocation(); return false;">
                    ANALYSE LOCATION →
                </button>

            </div>

            <div id="paddyLoading" style="display:none;"></div>

            <div id="paddyMap"></div>

            <div id="paddyResult"></div>

        </div>

    `);

    paddyMapInstance = null;

}


// ----------------------------------------
// HELPERS
// ----------------------------------------

function formatPercent(value) {

    const num = Number(value);

    if (value === undefined || value === null || isNaN(num)) {
        return "N/A";
    }

    return num.toFixed(1) + "%";

}


function getFutureMessage(risk) {

    if (risk >= 50) {
        return "Forecast rainfall and surface-water signatures indicate a high chance of flooding in the next 7 days.";
    }

    if (risk >= 25) {
        return "Moderate flood risk in the coming week. Continued monitoring is recommended.";
    }

    return "Low flood risk expected over the next 7 days based on forecast rainfall.";

}


function getStatusInfo(classification) {

    switch (classification) {

        case "CURRENT FLOOD":
            return { cls: "floodStatus", color: "#e53935" };

        case "HIGH FLOOD RISK":
            return { cls: "riskStatus", color: "#fb8c00" };

        case "PADDY-DOMINANT AREA":
            return { cls: "paddyStatus", color: "#43a047" };

        default:
            return { cls: "mixed", color: "#757575" };

    }

}


function scoreBar(percent, color) {

    const width = Math.max(0, Math.min(100, Number(percent) || 0));

    return `
        <div style="background:#e0e0e0;border-radius:6px;height:8px;margin-top:8px;overflow:hidden;">
            <div style="width:${width}%;height:100%;background:${color};"></div>
        </div>
    `;

}


// ========================================
// ANALYSE PADDY LOCATION
// ========================================

async function analysePaddyLocation() {

    const input = document.getElementById("paddyLocationInput");
    const loading = document.getElementById("paddyLoading");
    const result = document.getElementById("paddyResult");
    const mapElement = document.getElementById("paddyMap");

    if (!input || !loading || !result || !mapElement) {
        console.error("Paddy elements not found.");
        return;
    }

    const location = input.value.trim();

    if (!location) {
        alert("Please enter a location.");
        return;
    }

    // START
    loading.style.display = "block";
    loading.innerHTML = "🛰️ Finding location...";
    result.innerHTML = "";

    try {

        // 1. GEOCODING
        const geoResponse = await fetch(
            "https://geocoding-api.open-meteo.com/v1/search?name=" +
            encodeURIComponent(location) +
            "&count=1&format=json"
        );

        if (!geoResponse.ok) {
            throw new Error("Location service is not responding.");
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("Location not found.");
        }

        const place = geoData.results[0];

        loading.innerHTML = "🛰️ Analysing Sentinel-1 SAR data... (10-30 seconds)";

        // 2. BACKEND ANALYSIS
        const response = await fetch(
            `${BACKEND_URL}/paddy-analysis?lat=${place.latitude}&lon=${place.longitude}`
        );

        const data = await response.json();

        console.log("Paddy analysis:", data);

        if (!response.ok || data.error) {
            throw new Error(data.error || "Paddy analysis failed.");
        }

        // 3. READ VALUES SAFELY
        const paddy = data.paddy_probability;
        const flood = data.current_flood ?? data.flood_probability;
        const risk = data.future_flood_risk;
        const classification = data.classification || "ANALYSIS COMPLETE";

        const interpretation =
            data.interpretation || "Analysis completed successfully.";

        const futureMessage =
            data.future_message || getFutureMessage(Number(risk) || 0);

        const status = getStatusInfo(classification);

        loading.style.display = "none";

        // 4. MAP (old map remove, warna "already initialized" error aata hai)
        if (paddyMapInstance) {
            paddyMapInstance.remove();
            paddyMapInstance = null;
        }

        paddyMapInstance = L.map("paddyMap").setView(
            [place.latitude, place.longitude],
            10
        );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            { attribution: "&copy; OpenStreetMap contributors" }
        ).addTo(paddyMapInstance);

        L.marker([place.latitude, place.longitude])
            .addTo(paddyMapInstance)
            .bindPopup(`<b>${place.name}</b><br>Paddy & Flood Analysis`)
            .openPopup();

        // 5. SATELLITE IMAGE (timestamp se cache ki problem nahi aati)
        let satelliteHTML = "";

        if (data.available && data.image) {

            satelliteHTML = `
                <div class="paddySatellite">

                    <h3>🛰️ SENTINEL-1 SAR OBSERVATION</h3>

                    <div class="paddyImageBox">
                        <img
                            src="${BACKEND_URL}${data.image}?t=${Date.now()}"
                            alt="Sentinel-1 SAR Paddy Flood Analysis"
                            class="paddySARImage"
                            onerror="this.style.display='none';"
                        >
                    </div>

                    <p class="satelliteCaption">
                        Satellite observation for
                        ${place.name}, ${place.country || ""}
                    </p>

                </div>
            `;

        } else {

            satelliteHTML = `
                <div class="noSatelliteData">
                    🛰️
                    <b>Satellite image unavailable.</b>
                    <small>
                        The location analysis could not retrieve
                        a recent Sentinel-1 observation.
                    </small>
                </div>
            `;

        }

        // 6. FINAL RESULT
        result.innerHTML = `

            <div class="paddyAnalysisResult">

                <h3>📍 ${place.name}, ${place.country || ""}</h3>

                <div class="paddyClassification ${status.cls}">
                    <span>AI-ASSISTED INTERPRETATION</span>
                    <strong>${classification}</strong>
                </div>

                <div class="paddyScores">

                    <div class="scoreCard">
                        <span>🌾</span>
                        <small>PADDY PROBABILITY</small>
                        <strong>${formatPercent(paddy)}</strong>
                        ${scoreBar(paddy, "#43a047")}
                    </div>

                    <div class="scoreCard">
                        <span>🌊</span>
                        <small>CURRENT FLOOD</small>
                        <strong>${formatPercent(flood)}</strong>
                        ${scoreBar(flood, "#1e88e5")}
                    </div>

                    <div class="scoreCard">
                        <span>⚠️</span>
                        <small>FUTURE FLOOD RISK</small>
                        <strong>${formatPercent(risk)}</strong>
                        ${scoreBar(risk, "#fb8c00")}
                    </div>

                </div>

                <div class="interpretationBox">
                    <strong>🧠 JALRASTA INTERPRETATION</strong>
                    <p>${interpretation}</p>
                    <p>${futureMessage}</p>
                </div>

                ${satelliteHTML}

                <div class="paddyExplanation">

                    <h3>📡 HOW JALRASTA INTERPRETS IT</h3>

                    <p>
                        Sentinel-1 SAR observations provide
                        radar-based information about Earth's
                        surface. Water appears dark in radar
                        imagery, while crops reflect a stronger
                        signal.
                    </p>

                    <p>
                        Paddy and current flood values come from
                        SAR (VV/VH) pixel analysis of the most
                        recent observation. Future flood risk
                        combines 7-day rainfall forecast with
                        current surface-water signatures.
                    </p>

                    <small>
                        Note: These percentages are indicator-based
                        estimates and are not a substitute for a
                        trained agricultural or flood classification
                        model.
                    </small>

                </div>

            </div>

        `;

        // 7. LEAFLET FIX
        setTimeout(() => {
            if (paddyMapInstance) {
                paddyMapInstance.invalidateSize();
            }
        }, 300);

    } catch (error) {

        console.error("Paddy analysis error:", error);

        loading.style.display = "none";

        result.innerHTML = `
            <div class="alertBox">⚠️ ${error.message}</div>
        `;

    }

}
// ========================================
// FLOOD ALERT
// ========================================

function openAlert() {

    openModal(`

        <h2>🚨 Flood Alert Center</h2>

        <p>
            JalRasta has detected a high-risk
            flood zone.
        </p>


        <div class="alertBox">

            <strong>
                ⚠️ HIGH FLOOD RISK
            </strong>

            <span>
                Water level is rising rapidly.
            </span>

            <span>
                Evacuation is recommended.
            </span>

        </div>


        <div class="dataBox">

            <p>
                📍 Zone:
                <b>Zone 01</b>
            </p>

            <p>
                🌊 Water Level:
                <b>4.8m</b>
            </p>

            <p>
                🚨 Risk:
                <b>HIGH</b>
            </p>

        </div>


        <button
            type="button"
            class="modalButton"
            onclick="sendEmergencyAlert()">

            SEND EMERGENCY ALERT

        </button>

    `);

}


function sendEmergencyAlert() {

    alert(
        "🚨 EMERGENCY ALERT SENT\n\n" +
        "Affected Zone: Zone 01\n" +
        "Priority: HIGH\n" +
        "Status: Authorities Notified"
    );

}


// ========================================
// RESCUE PRIORITY
// ========================================

function openRescue() {

    openModal(`

        <h2>🚑 Rescue Priority System</h2>

        <p>
            JalRasta ranks affected people
            according to vulnerability and
            flood severity.
        </p>


        <div class="priorityList">

            <div class="priorityItem first">

                <b>01</b>

                <span>
                    Elderly / Critical
                </span>

                <strong>
                    FIRST
                </strong>

            </div>


            <div class="priorityItem">

                <b>02</b>

                <span>
                    Children / Families
                </span>

                <strong>
                    SECOND
                </strong>

            </div>


            <div class="priorityItem">

                <b>03</b>

                <span>
                    General Population
                </span>

                <strong>
                    THIRD
                </strong>

            </div>

        </div>


        <button
            type="button"
            class="modalButton"
            onclick="findRescueRoute()">

            FIND FASTEST RESCUE ROUTE

        </button>

    `);

}


function findRescueRoute() {

    alert(
        "🚑 FASTEST ROUTE FOUND\n\n" +
        "Rescue Team → Zone 01\n" +
        "Priority: HIGH\n" +
        "Recommended Action: Dispatch immediately"
    );

}


// ========================================
// END OF JALRASTA SCRIPT
// ========================================