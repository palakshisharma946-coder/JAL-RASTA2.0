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
// ===== JALRASTA LIVE FLOOD MAP =====

function openLiveFloodMap() {
    openModal(`
        <div class="liveFloodModule">
            <h2>🌊 Live Flood Map</h2>
            <p>Search a location to explore available satellite flood layers and river forecasts.</p>

            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <input id="lfmLocationInput"
                       type="text"
                       placeholder="Search city, village or country..."
                       style="flex:1;min-width:180px;padding:12px;border:1px solid #b7dce8;border-radius:10px;">

                <button class="modalButton"
                        type="button"
                        onclick="lfmSearchLocation()">
                    Search
                </button>
            </div>

            <p id="lfmMessage">Search for a location to begin.</p>
            <div id="lfmResults"></div>

            <div id="lfmMap"
                 style="height:360px;width:100%;border-radius:14px;margin:14px 0;z-index:1;">
            </div>

            <div style="padding:14px;background:#f0fafb;border-radius:12px;">
                <b>🛰️ Satellite flood layers</b>
                <p style="font-size:13px;">
                    Use the layer control on the map to explore available observed flood and water layers.
                </p>
                <small>Source: Copernicus Global Flood Monitoring (GFM). Availability depends on the source service.</small>
            </div>

            <div style="padding:14px;margin-top:14px;background:#fff8e8;border-radius:12px;">
                <h3>🌧️ River Flood Forecast</h3>
                <p id="lfmForecastMessage">Select a location to load the forecast.</p>
                <div id="lfmForecastResults"></div>
                <small>River discharge forecasts do not confirm flooding. Follow official local alerts.</small>
            </div>
        </div>
    `);

    setTimeout(() => lfmInitializeMap(), 150);
}

// Aliases in case the existing button uses either function name.
function openFloodMap() {
    openLiveFloodMap();
}

function lfmInitializeMap() {
    const mapElement = document.getElementById("lfmMap");
    if (!mapElement || mapElement.dataset.initialized === "yes") return;

    if (typeof L === "undefined") {
        document.getElementById("lfmMessage").textContent =
            "Map library missing. Add Leaflet to index.html first.";
        return;
    }

    const map = L.map(mapElement).setView([20, 0], 2);
    mapElement.dataset.initialized = "yes";
    window.jalrastaLiveFloodMap = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
    }).addTo(map);

    const floodLayer = L.tileLayer.wms(
        "https://geoserver.gfm.eodc.eu/geoserver/gfm/wms",
        {
            layers: "observed_flood_extent",
            version: "1.1.1",
            format: "image/png",
            transparent: true
        }
    );

    const waterLayer = L.tileLayer.wms(
        "https://geoserver.gfm.eodc.eu/geoserver/gfm/wms",
        {
            layers: "observed_water_extent",
            version: "1.1.1",
            format: "image/png",
            transparent: true
        }
    );

    L.control.layers(null, {
        "Observed Flood Extent (GFM)": floodLayer,
        "Observed Water Extent (GFM)": waterLayer
    }, { collapsed: false }).addTo(map);

    setTimeout(() => map.invalidateSize(), 250);
}

async function lfmSearchLocation() {
    const input = document.getElementById("lfmLocationInput");
    const message = document.getElementById("lfmMessage");
    const results = document.getElementById("lfmResults");
    if (!input || !message || !results) return;

    const name = input.value.trim();
    results.replaceChildren();

    if (name.length < 2) {
        message.textContent = "Please enter at least 2 characters.";
        return;
    }

    message.textContent = "Searching locations...";

    try {
        const response = await fetch(
            `${BACKEND_URL}/api/location-search?name=${encodeURIComponent(name)}`
        );
        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error(data.message || "Location search failed.");
        }

        if (!data.results?.length) {
            message.textContent = "No matching locations found.";
            return;
        }

        message.textContent = "Choose the correct location:";

        data.results.forEach(place => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "modalButton";
            button.style.cssText =
                "display:block;width:100%;margin:6px 0;text-align:left;";

            button.textContent = [
                place.name, place.admin1, place.country
            ].filter(Boolean).join(", ");

            button.addEventListener("click", () => {
                const lat = Number(place.latitude);
                const lon = Number(place.longitude);

                if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                    message.textContent = "Coordinates unavailable.";
                    return;
                }

                const map = window.jalrastaLiveFloodMap;
                if (!map) return;

                map.setView([lat, lon], 9);

                if (window.lfmLocationMarker) {
                    map.removeLayer(window.lfmLocationMarker);
                }

                window.lfmLocationMarker = L.marker([lat, lon])
                    .addTo(map)
                    .bindPopup(button.textContent)
                    .openPopup();

                message.textContent = "Location selected.";
                lfmLoadForecast(lat, lon);
            });

            results.appendChild(button);
        });
    } catch (error) {
        console.error("Live Flood Map search:", error);
        message.textContent =
            "Location search failed. Check that the Flask backend is running.";
    }
}
async function lfmLoadForecast(latitude, longitude) {
    const message = document.getElementById("lfmForecastMessage");
    const results = document.getElementById("lfmForecastResults");

    if (!message || !results) return;

    message.textContent = "Loading river forecast...";
    results.replaceChildren();

    try {
        const response = await fetch(
            `${BACKEND_URL}/api/flood-forecast?latitude=${latitude}&longitude=${longitude}`
        );

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error(data.message || "Forecast unavailable.");
        }

        if (!data.forecast?.length) {
            message.textContent = "No forecast values available.";
            return;
        }

        message.textContent =
            `River discharge forecast · ${data.unit || "m³/s"}`;

        const table = document.createElement("table");
        table.style.cssText =
            "width:100%;border-collapse:collapse;font-size:13px;";

        const header = document.createElement("tr");

        ["Date", "Discharge", "Trend"].forEach(label => {
            const th = document.createElement("th");
            th.textContent = label;
            th.style.cssText =
                "padding:10px 5px;text-align:left;border-bottom:1px solid #c6e1e9;";
            header.appendChild(th);
        });

        table.appendChild(header);

        data.forecast.forEach((item, index) => {
            const row = document.createElement("tr");

            const current = item.river_discharge_m3_per_second;
            const previous = index > 0
                ? data.forecast[index - 1].river_discharge_m3_per_second
                : null;

            const currentValid =
                typeof current === "number" && Number.isFinite(current);

            const previousValid =
                typeof previous === "number" && Number.isFinite(previous);

            let trend = "Unavailable";

            if (index === 0) {
                trend = "First day";
            } else if (currentValid && previousValid) {
                if (current > previous) trend = "Rising";
                else if (current < previous) trend = "Falling";
                else trend = "Stable";
            }

            const values = [
                item.date ?? "—",
                currentValid ? current : "Unavailable",
                trend
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = String(value);
                cell.style.cssText =
                    "padding:10px 5px;border-bottom:1px solid #e2eef2;";

                if (value === "Rising") {
                    cell.style.color = "#c2410c";
                    cell.style.fontWeight = "bold";
                } else if (value === "Falling") {
                    cell.style.color = "#15803d";
                    cell.style.fontWeight = "bold";
                } else if (value === "Stable") {
                    cell.style.color = "#0369a1";
                    cell.style.fontWeight = "bold";
                }

                row.appendChild(cell);
            });

            table.appendChild(row);
        });

        results.appendChild(table);

    } catch (error) {
        console.error("Live Flood Map forecast:", error);
        message.textContent =
            "Forecast could not load. Check the backend and try again.";
    }
}

// ===== END LIVE FLOOD MAP =====


// ========================================
// AI CHATBOT
// ========================================



function openChat() {
    openModal(`
        <h2>🤖 JalRasta AI Assistant</h2>
        <p>Ask about floods, rainfall, rescue information and routes.</p>

        <div id="chatWindow" class="chatWindow">
            <div class="botMessage">
                Hello! I am JalRasta AI. How can I help you?
            </div>
        </div>

        <form id="chatForm" onsubmit="askAI(event)">
            <input
                id="chatInput"
                type="text"
                placeholder="Type your question..."
                required
                style="width:100%; padding:12px; margin:10px 0;"
            >
            <button class="modalButton" type="submit">
                SEND MESSAGE
            </button>
        </form>

        <p id="chatStatus" role="status"></p>
    `);
}

async function askAI(event) {
    if (event) event.preventDefault();

    const input = document.getElementById("chatInput");
    const chatWindow = document.getElementById("chatWindow");
    const status = document.getElementById("chatStatus");

    if (!input || !chatWindow || !status) return;

    const message = input.value.trim();
    if (!message) return;

    chatWindow.insertAdjacentHTML(
        "beforeend",
        `<div class="userMessage"></div>`
    );
    chatWindow.lastElementChild.textContent = message;

    input.value = "";
    status.textContent = "JalRasta is responding...";

    try {
        const response = await fetch(`${BACKEND_URL}/api/chatbot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error(data.message || "Chatbot request failed.");
        }

        chatWindow.insertAdjacentHTML(
            "beforeend",
            `<div class="botMessage"></div>`
        );
        chatWindow.lastElementChild.textContent = data.response;
        status.textContent = "";
    } catch (error) {
        status.textContent =
            "Could not connect to the chatbot. Check that app.py is running.";
        console.error("Chatbot error:", error);
    }

    chatWindow.scrollTop = chatWindow.scrollHeight;
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

const BACKEND_URL = "";
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
        <div class="alertDashboard">
            <div class="alertHero">
                <div class="alertHeroIcon">🚨</div>
                <div>
                    <div class="alertEyebrow">JALRASTA • SAFETY CENTER</div>
                    <h2>Flood Risk Assessment</h2>
                    <p>Enter a location to analyse available conditions.</p>
                </div>
            </div>

            <div class="alertFormCard">
                <label for="alertLocation">📍 Location</label>
                <input
                    id="alertLocation"
                    type="text"
                    placeholder="Enter city, district or village"
                    style="width:100%;box-sizing:border-box;padding:14px;border:1px solid #d7e7eb;border-radius:12px;margin-bottom:14px;"
                    onkeydown="if(event.key==='Enter'){event.preventDefault(); analyseLocationRisk();}"
                >

                <button class="alertAnalyseBtn" type="button"
        onclick="analyseLocationRisk()">
    <span>Analyse Location</span>
    <span>→</span>
</button>

<div id="alertResult" class="alertResultPanel"
     aria-live="polite"></div>

<button class="alertAnalyseBtn" type="button"
        onclick="generateLocationEmergencyAlert()"
        style="margin-top:12px;background:#b91c1c;">
    <span>🚨 Generate Emergency Alert</span>
    <span>→</span>
</button>
            </div>

            <div class="alertSafetyNote">
                <span>ℹ️</span>
                <p>Assessment depends on available forecast data. Follow official local warnings and emergency instructions.</p>
            </div>
        </div>
    `);
}

async function analyseLocationRisk() {
    const input = document.getElementById("alertLocation");
    const result = document.getElementById("alertResult");

    if (!input || !result) return;

    const location = input.value.trim();

    if (!location) {
        result.textContent = "Please enter a location.";
        return;
    }

    result.replaceChildren();
    result.textContent = "Analysing rainfall and river forecast...";

    try {
        const geoResponse = await fetch(
            `${BACKEND_URL}/api/location-search?name=${encodeURIComponent(location)}`
        );
        const geoData = await geoResponse.json();

        if (!geoResponse.ok || geoData.status !== "success" ||
            !geoData.results?.length) {
            throw new Error(geoData.message || "Location not found.");
        }

        const place = geoData.results[0];
        const params = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude
        });

        const [weatherResponse, riverResponse] = await Promise.all([
            fetch(`${BACKEND_URL}/api/flood-map?${params}`),
            fetch(`${BACKEND_URL}/api/flood-forecast?${params}`)
        ]);

        const weather = await weatherResponse.json();
        const river = await riverResponse.json();

        if (!weatherResponse.ok || weather.status !== "success") {
            throw new Error(weather.message || "Rainfall data unavailable.");
        }

        if (!riverResponse.ok || river.status !== "success") {
            throw new Error(river.message || "River forecast unavailable.");
        }

        const current = weather.current_weather || {};
        const rainfall = Number(current.precipitation_mm);
        const probability = Number(weather.rain_probability_percent);
        const days = Array.isArray(river.forecast) ? river.forecast : [];

        const validDischarge = days
            .map(day => day.river_discharge_m3_per_second)
            .filter(value => value !== null && value !== undefined)
            .map(Number)
            .filter(Number.isFinite);

        const firstDischarge = validDischarge[0];
        const lastDischarge = validDischarge[validDischarge.length - 1];

        // Demo screening rules only; not an official flood prediction.
        let risk = "INSUFFICIENT DATA";
        let explanation =
            "Available data is not enough to assign a reliable risk level.";

        if (Number.isFinite(rainfall) && Number.isFinite(probability)) {
            if (rainfall >= 20 || probability >= 80) {
                risk = "HIGH WEATHER CONCERN";
                explanation =
                    "Heavy current precipitation or a high rain probability needs attention. This does not confirm flooding.";
            } else if (rainfall >= 5 || probability >= 50) {
                risk = "MODERATE WEATHER CONCERN";
                explanation =
                    "Rainfall conditions may need monitoring. Check official local flood warnings.";
            } else {
                risk = "LOW WEATHER CONCERN";
                explanation =
                    "The available rainfall indicators are relatively low. Local flooding can still occur.";
            }
        }

        result.replaceChildren();

        function addText(tag, text, className) {
            const element = document.createElement(tag);
            element.textContent = text;
            if (className) element.className = className;
            result.appendChild(element);
        }

        addText(
            "h3",
            `📍 ${place.name || location}${place.admin1 ? ", " + place.admin1 : ""}`
        );

        addText("p", `Preliminary status: ${risk}`, "alertRiskLevel");
        addText("p", explanation);

        addText("h4", "🌧️ Current Weather");
        addText(
            "p",
            `Precipitation: ${
                Number.isFinite(rainfall) ? rainfall + " mm" : "Unavailable"
            }`
        );
        addText(
            "p",
            `Rain probability: ${
                Number.isFinite(probability) ? probability + "%" : "Unavailable"
            }`
        );

        addText("h4", "🌊 River Discharge Forecast");

        if (days.length) {
            days.forEach(day => {
                const value = day.river_discharge_m3_per_second;
                addText(
                    "p",
                    `${day.date}: ${
                        value == null ? "Unavailable" : value + " m³/s"
                    }`
                );
            });
        } else {
            addText("p", "No river discharge values available.");
        }

        if (Number.isFinite(firstDischarge) &&
            Number.isFinite(lastDischarge)) {
            addText(
                "p",
                `Forecast change: ${firstDischarge} to ${lastDischarge} m³/s`
            );
        }

        addText(
            "p",
            "Safety: This is a simple weather screening, not a validated flood-risk model. River discharge needs local thresholds; follow official warnings."
        );

    } catch (error) {
        result.replaceChildren();
        const message = document.createElement("p");
        message.textContent = `Analysis failed: ${error.message}`;
        result.appendChild(message);
        console.error("Location risk error:", error);
    }
}
async function generateLocationEmergencyAlert() {
    const input = document.getElementById("alertLocation");
    const result = document.getElementById("alertResult");

    if (!input || !result) return;

    const location = input.value.trim();

    if (!location) {
        result.textContent = "Please enter and analyse a location first.";
        return;
    }

    result.textContent = "Checking conditions before generating alert...";

    try {
        const geoResponse = await fetch(
            `${BACKEND_URL}/api/location-search?name=${encodeURIComponent(location)}`
        );
        const geo = await geoResponse.json();

        if (!geoResponse.ok || geo.status !== "success" ||
            !geo.results?.length) {
            throw new Error("Location could not be verified.");
        }

        const place = geo.results[0];
        const params = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude
        });

        const response = await fetch(
            `${BACKEND_URL}/api/flood-map?${params}`
        );
        const weather = await response.json();

        if (!response.ok || weather.status !== "success") {
            throw new Error("Weather conditions are unavailable.");
        }

        const current = weather.current_weather || {};
        const rainfall = Number(current.precipitation_mm);
        const probability = Number(weather.rain_probability_percent);

        if (!Number.isFinite(rainfall) || !Number.isFinite(probability)) {
            throw new Error("Not enough weather data to assess an alert.");
        }

        // These are screening inputs, not proof of an actual flood.
        const payload = {
            rainfall_mm: rainfall,
            water_rising: false,
            people_at_risk: false
        };

        const alertResponse = await fetch(`${BACKEND_URL}/api/alerts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await alertResponse.json();

        if (!alertResponse.ok || data.status !== "success") {
            throw new Error(data.message || "Alert assessment failed.");
        }

        result.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = `🚨 ${place.name || location}: ${data.alert_level}`;
        result.appendChild(heading);

        const message = document.createElement("p");
        message.textContent = data.alert_message || "Preliminary alert assessment completed.";
        result.appendChild(message);

        const weatherInfo = document.createElement("p");
        weatherInfo.textContent =
            `Rainfall: ${rainfall} mm | Rain probability: ${probability}%`;
        result.appendChild(weatherInfo);

        if (Array.isArray(data.reasons) && data.reasons.length) {
            const list = document.createElement("ul");
            data.reasons.forEach(reason => {
                const item = document.createElement("li");
                item.textContent = reason;
                list.appendChild(item);
            });
            result.appendChild(list);
        }

        const note = document.createElement("p");
        note.textContent =
            "Preliminary weather-based assessment only. Rising water and people in danger have not been verified. This does not contact emergency services. Follow official local warnings.";
        result.appendChild(note);

    } catch (error) {
        result.textContent = `Alert assessment failed: ${error.message}`;
        console.error("Location emergency alert error:", error);
    }
}

async function sendEmergencyAlert() {
    const result = document.getElementById("alertResult");
    const rainfallInput = document.getElementById("alertRainfall");
    const waterInput = document.getElementById("alertWaterRising");
    const peopleInput = document.getElementById("alertPeopleRisk");

    if (!result || !rainfallInput || !waterInput || !peopleInput) return;

    const rainfallText = rainfallInput.value.trim();

    if (rainfallText !== "" &&
        (!Number.isFinite(Number(rainfallText)) || Number(rainfallText) < 0)) {
        result.textContent = "Please enter valid non-negative rainfall.";
        return;
    }

    const payload = {
        water_rising: waterInput.value === "true",
        people_at_risk: peopleInput.value === "true"
    };

    if (rainfallText !== "") {
        payload.rainfall_mm = Number(rainfallText);
    }

    result.textContent = "Analysing reported conditions...";

    try {
        const response = await fetch(`${BACKEND_URL}/api/alerts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error(data.message || "Alert analysis failed.");
        }

        result.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = `Preliminary risk: ${data.alert_level}`;
        result.appendChild(heading);

        const message = document.createElement("p");
        message.textContent = data.alert_message;
        result.appendChild(message);

        if (Array.isArray(data.reasons) && data.reasons.length) {
            const list = document.createElement("ul");
            data.reasons.forEach(reason => {
                const item = document.createElement("li");
                item.textContent = reason;
                list.appendChild(item);
            });
            result.appendChild(list);
        }

        const notice = document.createElement("p");
        notice.textContent = data.notice ||
            "Preliminary analysis only. Follow official emergency guidance.";
        result.appendChild(notice);

    } catch (error) {
        result.textContent =
            `Could not connect to the alert backend: ${error.message}`;
        console.error("Alert API error:", error);
    }
}
// ========================================
// RESCUE PRIORITY
// ========================================
// ========================================
// RESCUE PRIORITY + ROUTE SYSTEM
// PART 1/2
// ========================================

// ===== RESCUE PRIORITY: PART 1 =====

let rescueZoneCount = 1;

function openRescue() {
    rescueZoneCount = 1;

    openModal(`
        <div class="rescueModule">
            <h2>🚑 Rescue Priority System</h2>
            <p>Enter the rescue team's starting location and the affected zones. JalRasta will rank the reports by urgency.</p>

            <label for="rescueStartLocation"><b>📍 Rescue team starting location</b></label>
            <input
                id="rescueStartLocation"
                type="text"
                placeholder="e.g. Bhopal Railway Station"
            />

            <div id="rescueZones">
                ${createRescueZoneHTML(1)}
            </div>

            <button
                type="button"
                class="modalButton"
                onclick="addRescueZone()">
                + ADD ANOTHER ZONE
            </button>

            <button
                type="button"
                class="modalButton"
                onclick="findRescueRoute()">
                🚨 ANALYSE & FIND RESCUE ROUTES
            </button>

            <div id="rescueResult" style="margin-top:18px;"></div>
        </div>
    `);
}

function createRescueZoneHTML(number) {
    return `
        <div class="rescueZone"
             id="rescueZone${number}"
             style="border:1px solid #b9dfe8;border-radius:12px;padding:14px;margin:14px 0;">

            <h3>📍 Affected Zone ${number}</h3>

            <label for="rescueLocation${number}">Zone location</label>
            <input
                id="rescueLocation${number}"
                type="text"
                placeholder="Enter village, area or city"
            />

            <div style="margin-top:10px;display:grid;gap:8px;">
                <label>
                    <input type="checkbox" id="rescueDanger${number}">
                    Immediate danger reported
                </label>

                <label>
                    <input type="checkbox" id="rescueTrapped${number}">
                    People trapped
                </label>

                <label>
                    <input type="checkbox" id="rescueMedical${number}">
                    Medical emergency
                </label>

                <label>
                    <input type="checkbox" id="rescueVulnerable${number}">
                    Children, elderly or people needing extra assistance
                </label>

                <label>
                    <input type="checkbox" id="rescueWater${number}">
                    Water level is rising
                </label>

                <label>
                    <input type="checkbox" id="rescueNoRoute${number}">
                    Safe route is NOT confirmed
                </label>
            </div>

            ${
                number > 1
                    ? `<button type="button"
                               class="modalButton"
                               onclick="removeRescueZone(${number})">
                           Remove this zone
                       </button>`
                    : ""
            }
        </div>
    `;
}

function addRescueZone() {
    rescueZoneCount++;

    document.getElementById("rescueZones").insertAdjacentHTML(
        "beforeend",
        createRescueZoneHTML(rescueZoneCount)
    );
}

function removeRescueZone(number) {
    const zone = document.getElementById(`rescueZone${number}`);
    if (zone) zone.remove();
}

// ===== PART 1 ENDS HERE =====
// Paste PART 2 immediately below this code.
// ===== RESCUE PRIORITY: PART 2 =====

async function findRescueRoute() {
    const resultBox = document.getElementById("rescueResult");
    const startLocation = document.getElementById("rescueStartLocation")?.value.trim();

    if (!startLocation) {
        resultBox.innerHTML = "⚠️ Please enter the rescue team's starting location.";
        return;
    }

    const zoneElements = document.querySelectorAll(".rescueZone");
    const reports = [];

    zoneElements.forEach((zone) => {
        const id = zone.id.replace("rescueZone", "");
        const location = document.getElementById(`rescueLocation${id}`)?.value.trim();

        if (!location) return;

        reports.push({
            location,
            immediate_danger: document.getElementById(`rescueDanger${id}`).checked,
            people_trapped: document.getElementById(`rescueTrapped${id}`).checked,
            medical_emergency: document.getElementById(`rescueMedical${id}`).checked,
            vulnerable_people: document.getElementById(`rescueVulnerable${id}`).checked,
            water_rising: document.getElementById(`rescueWater${id}`).checked,
            safe_route_available: !document.getElementById(`rescueNoRoute${id}`).checked
        });
    });

    if (reports.length === 0) {
        resultBox.innerHTML = "⚠️ Enter a location for at least one affected zone.";
        return;
    }

    resultBox.innerHTML = "⏳ Analysing reports, locations and available routes...";

    try {
        // 1. Find rescue team's starting coordinates
        const startResponse = await fetch(
            `${BACKEND_URL}/api/location-search?name=${encodeURIComponent(startLocation)}`
        );
        const startData = await startResponse.json();

        if (!startResponse.ok || !startData.results?.length) {
            throw new Error("Rescue starting location not found. Try a more specific location.");
        }

        const start = startData.results[0];

        // 2. Ask backend to rank affected zones
        const priorityResponse = await fetch(
            `${BACKEND_URL}/api/rescue-priority`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reports })
            }
        );

        const priorityData = await priorityResponse.json();

        if (!priorityResponse.ok || !priorityData.ranked_reports) {
            throw new Error(priorityData.message || "Could not calculate rescue priorities.");
        }

        // 3. Find coordinates and driving routes for each ranked report
        const rankedZones = await Promise.all(
            priorityData.ranked_reports.map(async (report) => {
                try {
                    const locationResponse = await fetch(
                        `${BACKEND_URL}/api/location-search?name=${encodeURIComponent(report.location)}`
                    );
                    const locationData = await locationResponse.json();

                    if (!locationResponse.ok || !locationData.results?.length) {
                        return { ...report, routeError: "Location not found." };
                    }

                    const place = locationData.results[0];

                    const routeResponse = await fetch(
                        `${BACKEND_URL}/api/route?start_lat=${start.latitude}` +
                        `&start_lon=${start.longitude}` +
                        `&end_lat=${place.latitude}` +
                        `&end_lon=${place.longitude}`
                    );

                    const routeData = await routeResponse.json();

                    const routes = routeData.status === "success"
                        ? [...(routeData.routes || [])].sort(
                            (a, b) => a.estimated_time_minutes - b.estimated_time_minutes
                        )
                        : [];

                    return {
                        ...report,
                        latitude: place.latitude,
                        longitude: place.longitude,
                        routes,
                        routeError: routes.length ? "" : "No driving route returned."
                    };
                } catch (error) {
                    return { ...report, routeError: "Could not retrieve route." };
                }
            })
        );

        // 4. Prepare result area and map
        resultBox.innerHTML = `
            <h3>🚨 Rescue Priority Results</h3>
            <p>Reports are ranked by the backend's priority score.</p>
            <div id="rescueMap"
                 style="height:360px;width:100%;border-radius:12px;margin:14px 0;">
            </div>
            <div class="rescueLegend">
    <span><i class="dot critical"></i> Critical</span>
    <span><i class="dot high"></i> High</span>
    <span><i class="dot moderate"></i> Moderate</span>
    <span><i class="dot review"></i> Review</span>
</div>
            <div id="rescueRankedCards"></div>
            <p style="font-size:12px;">
                ⚠️ Route suggestions may not reflect flooded or closed roads.
                Confirm conditions with emergency services before dispatch.
            </p>
        `;

        let rescueMap = null;
        let mapPoints = [];

        if (typeof L !== "undefined") {
            rescueMap = L.map("rescueMap").setView(
                [start.latitude, start.longitude],
                10
            );

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors",
                maxZoom: 19
            }).addTo(rescueMap);

            L.marker([start.latitude, start.longitude])
                .addTo(rescueMap)
                .bindPopup("🚑 Rescue team starting point");

            mapPoints.push([start.latitude, start.longitude]);
        } else {
            document.getElementById("rescueMap").innerHTML =
                "Map library is missing. Please check Leaflet in index.html.";
        }

        // 5. Draw zone markers and fastest available routes
        rankedZones.forEach((zone, index) => {
            if (zone.latitude == null || zone.longitude == null) return;

            const color = zone.priority === "CRITICAL"
                ? "#dc2626"
                : zone.priority === "HIGH"
                    ? "#f97316"
                    : zone.priority === "MODERATE"
                        ? "#eab308"
                        : "#16a34a";

            if (rescueMap) {
                L.circleMarker([zone.latitude, zone.longitude], {
                    radius: 9,
                    color,
                    fillColor: color,
                    fillOpacity: 0.8
                })
                    .addTo(rescueMap)
                    .bindPopup(
                        `<b>${zone.location}</b><br>` +
                        `Priority: ${zone.priority}<br>` +
                        `Score: ${zone.priority_score}`
                    );

                mapPoints.push([zone.latitude, zone.longitude]);

                const fastest = zone.routes?.[0];
                const coordinates = fastest?.geometry?.coordinates;

                if (coordinates?.length) {
                    const latLngs = coordinates.map(
                        ([longitude, latitude]) => [latitude, longitude]
                    );

                    L.polyline(latLngs, {
                        color,
                        weight: 4,
                        opacity: 0.75
                    }).addTo(rescueMap);
                }
            }
        });

        if (rescueMap && mapPoints.length) {
            rescueMap.fitBounds(mapPoints, { padding: [25, 25] });
            setTimeout(() => rescueMap.invalidateSize(), 150);
        }

        // 6. Display ranked reports and route information
        const cards = document.getElementById("rescueRankedCards");

        cards.innerHTML = rankedZones.map((zone, index) => {
            const fastest = zone.routes?.[0];

            const reasons = Array.isArray(zone.reasons) && zone.reasons.length
                ? zone.reasons.map(reason => `<li>${reason}</li>`).join("")
                : "<li>No urgent conditions were selected in this report.</li>";

            const alternativeRoutes = zone.routes?.length > 1
                ? zone.routes.slice(1).map(route => `
                    <li>
                        Alternative route ${route.route_number}:
                        ${route.distance_km} km,
                        ${route.estimated_time_minutes} min
                    </li>
                `).join("")
                : "";

            return `
                <div style="border:1px solid #cbd5e1;border-radius:12px;
                            padding:14px;margin:12px 0;">
                    <h3>${index + 1}. ${zone.location}</h3>
                    <p><b>Priority:</b> ${zone.priority || "REVIEW"}</p>
                    <p><b>Priority score:</b> ${zone.priority_score ?? "N/A"}</p>
                    <p><b>Reasons:</b></p>
                    <ul>${reasons}</ul>

                    ${
                        fastest
                            ? `<p><b>Fastest returned driving route:</b>
                                 Route ${fastest.route_number},
                                 ${fastest.distance_km} km,
                                 ${fastest.estimated_time_minutes} minutes.</p>
                               <ul>${alternativeRoutes}</ul>`
                            : `<p>⚠️ ${zone.routeError || "No route available."}</p>`
                    }
                </div>
            `;
        }).join("");

    } catch (error) {
        resultBox.innerHTML = `
            <p>❌ ${error.message}</p>
            <p>Check that the backend is running and try again.</p>
        `;
        console.error("Rescue Priority error:", error);
    }
}

// ===== RESCUE PRIORITY CODE ENDS =====
// Make the Live Flood Map available to the HTML button
window.openMap = function () {
    if (typeof window.openLiveFloodMap === "function") {
        window.openLiveFloodMap();
    } else {
        console.error("openLiveFloodMap function is missing!");
    }
};

// ========================================
// END OF JALRASTA SCRIPT
// ========================================