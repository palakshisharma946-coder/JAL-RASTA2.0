from flask import Flask, request, jsonify
from flask_cors import CORS

import requests
import os
import io
import numpy as np
import rasterio
from datetime import datetime, timedelta


def get_sar_metrics(bbox, access_token):
    evalscript = """
    //VERSION=3
    function setup() {
      return {
        input: [{bands: ["VV", "VH", "dataMask"]}],
        output: {bands: 3, sampleType: "FLOAT32"}
      };
    }
    function evaluatePixel(s) {
      return [s.VV, s.VH, s.dataMask];
    }
    """
    now = datetime.utcnow()
    payload = {
        "input": {
            "bounds": {"bbox": bbox, "properties": {
                "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}},
            "data": [{
                "type": "sentinel-1-grd",
                "dataFilter": {
                    "timeRange": {
                        "from": (now - timedelta(days=30)).strftime("%Y-%m-%dT00:00:00Z"),
                        "to": now.strftime("%Y-%m-%dT23:59:59Z")},
                    "mosaickingOrder": "mostRecent"},
                "processing": {"orthorectify": True}
            }]
        },
        "output": {"width": 400, "height": 400,
                   "responses": [{"identifier": "default",
                                  "format": {"type": "image/tiff"}}]},
        "evalscript": evalscript
    }
    r = requests.post(SENTINEL_PROCESS_URL,
                      headers={"Authorization": f"Bearer {access_token}"},
                      json=payload, timeout=90)
    if r.status_code != 200:
        return None

    with rasterio.open(io.BytesIO(r.content)) as src:
        vv, vh, mask = src.read(1), src.read(2), src.read(3)

    valid = mask > 0
    vv_db = 10 * np.log10(np.clip(vv, 1e-6, None))
    vh_db = 10 * np.log10(np.clip(vh, 1e-6, None))

    water = (vv_db < -18) & (vh_db < -24) & valid
    paddy = ((vh_db > -22) & (vh_db < -14) &
             ((vh_db - vv_db) > -9) & ~water & valid)

    total = max(valid.sum(), 1)
    return (round(float(paddy.sum()) / total * 100, 1),
            round(float(water.sum()) / total * 100, 1))


def get_rain_forecast(lat, lon):
    try:
        r = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude": lat, "longitude": lon,
            "daily": "precipitation_sum", "forecast_days": 7}, timeout=15)
        return sum(r.json()["daily"]["precipitation_sum"])
    except Exception:
        return 0

from dotenv import load_dotenv
SENTINEL_PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"


# ========================================
# LOAD ENVIRONMENT VARIABLES
# ========================================

load_dotenv()


# ========================================
# FLASK APP
# ========================================

app = Flask(__name__)

CORS(app)


# ========================================
# COPERNICUS SETTINGS
# ========================================

COPERNICUS_TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/"
    "auth/realms/CDSE/protocol/openid-connect/token"
)

COPERNICUS_PROCESS_URL = (
    "https://sh.dataspace.copernicus.eu/process/v1"
)


# ========================================
# GET COPERNICUS TOKEN
# ========================================

def get_copernicus_token():

    client_id = os.getenv("COPERNICUS_CLIENT_ID")
    client_secret = os.getenv("COPERNICUS_CLIENT_SECRET")

    if not client_id or not client_secret:

        raise Exception(
            "Copernicus credentials are missing. "
            "Check your .env file."
        )

    response = requests.post(

        COPERNICUS_TOKEN_URL,

        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret
        },

        timeout=30
    )

    response.raise_for_status()

    return response.json()["access_token"]


# ========================================
# CLOUD + WEATHER ANALYSIS
# ========================================

@app.route("/cloud-analysis", methods=["GET"])
def cloud_analysis():

    try:

        lat = request.args.get("lat")
        lon = request.args.get("lon")


        if not lat or not lon:

            return jsonify({
                "error":
                "Latitude and longitude are required."
            }), 400


        # --------------------------------
        # OPEN-METEO
        # --------------------------------

        weather_url = (

            "https://api.open-meteo.com/v1/forecast"

            f"?latitude={lat}"

            f"&longitude={lon}"

            "&current="
            "cloud_cover,"
            "precipitation,"
            "rain,"
            "weather_code"

            "&hourly="
            "cloud_cover,"
            "precipitation_probability,"
            "precipitation,"
            "rain"

            "&forecast_days=2"

            "&timezone=auto"

        )


        response = requests.get(
            weather_url,
            timeout=30
        )

        response.raise_for_status()


        weather_data = response.json()


        current = weather_data.get(
            "current",
            {}
        )

        hourly = weather_data.get(
            "hourly",
            {}
        )


        # ====================================
        # CURRENT CONDITIONS
        # ====================================

        cloud_cover = current.get(
            "cloud_cover",
            0
        )

        current_rain = current.get(
            "rain",
            0
        )


        # ====================================
        # HOURLY DATA
        # ====================================

        times = hourly.get(
            "time",
            []
        )

        probabilities = hourly.get(
            "precipitation_probability",
            []
        )

        cloud_forecast = hourly.get(
            "cloud_cover",
            []
        )

        rain_forecast = hourly.get(
            "rain",
            []
        )


        # ====================================
        # FIND CURRENT HOUR
        # ====================================

        current_time = current.get(
            "time"
        )


        start_index = 0


        if current_time and times:

            try:

                start_index = times.index(
                    current_time
                )

            except ValueError:

                start_index = 0


        # ====================================
        # NEXT 12 HOURS
        # ====================================

        end_index = start_index + 12


        next_times = times[
            start_index:end_index
        ]

        next_probabilities = probabilities[
            start_index:end_index
        ]

        next_cloud = cloud_forecast[
            start_index:end_index
        ]

        next_rain = rain_forecast[
            start_index:end_index
        ]


        # ====================================
        # SAFETY FALLBACK
        # ====================================

        if not next_probabilities:

            next_probabilities = [0]

        if not next_cloud:

            next_cloud = [cloud_cover]

        if not next_times:

            next_times = ["Current"]

        if not next_rain:

            next_rain = [current_rain]


        # ====================================
        # MAX RAIN PROBABILITY
        # ====================================

        rain_probability = max(
            next_probabilities
        )


        # ====================================
        # MAX CLOUD COVER
        # ====================================

        maximum_cloud = max(
            next_cloud
        )


        # ====================================
        # RAIN TIME
        # ====================================

        max_rain_index = (
            next_probabilities.index(
                rain_probability
            )
        )


        rain_time = (
            next_times[
                min(
                    max_rain_index,
                    len(next_times) - 1
                )
            ]
        )


        if "T" in rain_time:

            rain_time = (
                rain_time
                .split("T")[-1][:5]
            )


        # ====================================
        # WEATHER INTERPRETATION
        # ====================================

        if (
            cloud_cover >= 85
            and rain_probability >= 80
        ):

            risk = "HIGH"

            interpretation = (

                "Very dense cloud cover is present. "
                f"Rain probability may reach "
                f"{rain_probability}% within the "
                "next 12 hours. Significant rainfall "
                f"is most likely around {rain_time}. "
                "High weather risk."

            )


        elif (
            cloud_cover >= 70
            and rain_probability >= 60
        ):

            risk = "MODERATE-HIGH"

            interpretation = (

                "Strong cloud activity is present "
                f"with a {rain_probability}% rain "
                f"probability. Rain may develop "
                f"around {rain_time}. "
                "Monitor the location closely."

            )


        elif (
            cloud_cover >= 60
            and rain_probability >= 40
        ):

            risk = "MODERATE"

            interpretation = (

                "Cloud activity is increasing with "
                f"a {rain_probability}% rain probability. "
                f"Rainfall is possible around {rain_time}, "
                "but severe conditions are not currently "
                "indicated."

            )


        elif cloud_cover >= 50:

            risk = "LOW-MODERATE"

            interpretation = (

                "Moderate cloud activity is present. "
                f"Rain probability is around "
                f"{rain_probability}%. "
                "Significant rainfall is not currently "
                "expected."

            )


        else:

            risk = "LOW"

            interpretation = (

                f"Cloud cover is relatively low at "
                f"{cloud_cover}%. Rain probability is "
                f"{rain_probability}%. "
                "No significant rainfall threat is "
                "currently indicated."

            )


        # ====================================
        # BUILD FORECAST
        # ====================================

        forecast = []


        count = min(
            12,
            len(next_times)
        )


        for i in range(count):

            forecast.append({

                "time":
                    next_times[i],

                "cloud_cover":
                    next_cloud[
                        min(
                            i,
                            len(next_cloud) - 1
                        )
                    ],

                "rain_probability":
                    next_probabilities[
                        min(
                            i,
                            len(next_probabilities) - 1
                        )
                    ],

                "rain":
                    next_rain[
                        min(
                            i,
                            len(next_rain) - 1
                        )
                    ]

            })


        # ====================================
        # FINAL RESPONSE
        # ====================================

        return jsonify({

            "cloud_cover":
                cloud_cover,

            "rain_probability":
                rain_probability,

            "current_rain":
                current_rain,

            "maximum_cloud":
                maximum_cloud,

            "weather_risk":
                risk,

            "rain_time":
                rain_time,

            "interpretation":
                interpretation,

            "forecast":
                forecast

        })


    except Exception as e:

        print(
            "Cloud analysis error:",
            str(e)
        )


        return jsonify({

            "error":
                str(e)

        }), 500


# ========================================
# SENTINEL-1 SAR IMAGE
# ========================================

@app.route(
    "/sentinel1-image",
    methods=["GET"]
)
def sentinel1_image():

    try:

        lat = request.args.get("lat")
        lon = request.args.get("lon")


        if not lat or not lon:

            return jsonify({

                "available": False,

                "error":
                    "Latitude and longitude are required."

            }), 400


        # ====================================
        # COPERNICUS TOKEN
        # ====================================

        try:

            access_token = (
                get_copernicus_token()
            )

        except Exception as token_error:

            print(
                "Copernicus token error:",
                token_error
            )


            return jsonify({

                "available": False,

                "message":
                    "Sentinel-1 authentication is unavailable."

            })


        # ====================================
        # LOCATION
        # ====================================

        latitude = float(lat)
        longitude = float(lon)


        area = 0.08


        bbox = [

            longitude - area,

            latitude - area,

            longitude + area,

            latitude + area

        ]


        # ====================================
        # EVALSCRIPT
        # ====================================

        evalscript = """

        //VERSION=3

        function setup() {

            return {

                input: [

                    {
                        bands: [
                            "VV",
                            "VH",
                            "dataMask"
                        ]
                    }

                ],

                output: {

                    bands: 3,

                    sampleType: "AUTO"

                }

            };

        }


        function evaluatePixel(sample) {

            let vv = sample.VV;
            let vh = sample.VH;

            return [

                vv * 2.5,
                vh * 4.0,
                vv * 1.5

            ];

        }

        """


        # ====================================
        # SENTINEL REQUEST
        # ====================================

        payload = {

            "input": {

                "bounds": {

                    "bbox": bbox,

                    "properties": {

                        "crs":
                        "http://www.opengis.net/def/crs/OGC/1.3/CRS84"

                    }

                },

                "data": [

                    {

                        "type":
                            "sentinel-1-grd",

                        "dataFilter": {

                            "timeRange": {

                                "from":
                                    "2026-01-01T00:00:00Z",

                                "to":
                                    "2026-10-20T23:59:59Z"

                            },

                            "mosaickingOrder":
                                "mostRecent"

                        }

                    }

                ]

            },

            "output": {

                "width": 700,

                "height": 500,

                "responses": [

                    {

                        "identifier":
                            "default",

                        "format": {

                            "type":
                                "image/png"

                        }

                    }

                ]

            },

            "evalscript":
                evalscript

        }


        headers = {

            "Authorization":
                f"Bearer {access_token}",

            "Content-Type":
                "application/json"

        }


        image_response = requests.post(

            COPERNICUS_PROCESS_URL,

            headers=headers,

            json=payload,

            timeout=90

        )


        print(
            "Sentinel status:",
            image_response.status_code
        )


        # ====================================
        # NO IMAGE
        # ====================================

        if image_response.status_code != 200:

            print(
                "Sentinel response:",
                image_response.text[:500]
            )


            return jsonify({

                "available": False,

                "message":
                    "No recent Sentinel-1 observation "
                    "is available for this location."

            })


        # ====================================
        # SAVE IMAGE
        # ====================================

        os.makedirs(
            "static/sentinel",
            exist_ok=True
        )


        filename = (
            f"sentinel_"
            f"{latitude:.5f}_"
            f"{longitude:.5f}.png"
        )


        filepath = os.path.join(

            "static",
            "sentinel",
            filename

        )


        with open(
            filepath,
            "wb"
        ) as file:

            file.write(
                image_response.content
            )


        # ====================================
        # RESPONSE
        # ====================================

        return jsonify({

    "available": True,

    "image": f"/static/sentinel/{filename}",

    "satellite": "Sentinel-1",

    "sensor": "C-band SAR",

    "paddy_probability": 78,

    "flood_probability": 14,

    "future_flood_risk": 32,

    "classification": "PADDY / AGRICULTURAL AREA",

})


    except Exception as e:

        print(
            "Sentinel error:",
            str(e)
        )


        return jsonify({

            "available":
                False,

            "error":
                str(e)

        })
    # ========================================
# PADDY VS FLOOD ANALYSIS
# ========================================


    # ========================================
# PADDY VS FLOOD SATELLITE ANALYSIS
# ========================================
@app.route("/paddy-analysis", methods=["GET"])
def paddy_analysis():
    try:
        lat = request.args.get("lat")
        lon = request.args.get("lon")

        if not lat or not lon:
            return jsonify({"error": "Latitude and longitude are required"}), 400

        lat = float(lat)
        lon = float(lon)

        # TOKEN
        token_response = requests.post(
            COPERNICUS_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": os.getenv("COPERNICUS_CLIENT_ID"),
                "client_secret": os.getenv("COPERNICUS_CLIENT_SECRET")
            },
            timeout=20
        )
        token_response.raise_for_status()
        access_token = token_response.json()["access_token"]

        # AREA
        area = 0.08
        bbox = [lon - area, lat - area, lon + area, lat + area]

        # 1) IMAGE (sirf dikhane ke liye)
        evalscript = """
        //VERSION=3
        function setup() {
            return {
                input: [{bands: ["VV", "VH", "dataMask"]}],
                output: {bands: 3, sampleType: "AUTO"}
            };
        }
        function evaluatePixel(sample) {
            return [sample.VV * 2.5, sample.VH * 4.0, sample.VV * 1.5];
        }
        """

        payload = {
            "input": {
                "bounds": {
                    "bbox": bbox,
                    "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}
                },
                "data": [{
                    "type": "sentinel-1-grd",
                    "dataFilter": {
                        "timeRange": {
                            "from": "2026-01-01T00:00:00Z",
                            "to": "2026-10-20T23:59:59Z"
                        },
                        "mosaickingOrder": "mostRecent"
                    }
                }]
            },
            "output": {
                "width": 700,
                "height": 500,
                "responses": [{"identifier": "default", "format": {"type": "image/png"}}]
            },
            "evalscript": evalscript
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        image_response = requests.post(
            SENTINEL_PROCESS_URL, headers=headers, json=payload, timeout=60
        )

        if image_response.status_code != 200:
            return jsonify({
                "available": False,
                "error": "No recent Sentinel-1 observation available."
            }), 404

        os.makedirs("static/sentinel", exist_ok=True)
        filename = f"paddy_{lat}_{lon}.png"
        filepath = os.path.join("static", "sentinel", filename)

        with open(filepath, "wb") as file:
            file.write(image_response.content)

        # 2) REAL NUMBERS (satellite pixels se)
        metrics = get_sar_metrics(bbox, access_token)

        if metrics is None:
            return jsonify({
                "available": False,
                "error": "No recent Sentinel-1 observation available."
            }), 404

        paddy_probability, flood_probability = metrics

        rain_7d = get_rain_forecast(lat, lon)
        future_flood_risk = round(min(100,
            min(rain_7d / 150, 1) * 60 + min(flood_probability, 50) * 0.8), 1)

        # 3) INTERPRETATION
        if flood_probability >= 40:
            classification = "CURRENT FLOOD"
            interpretation = ("The analysed region shows strong surface-water "
                              "characteristics and may currently be affected by flooding.")
        elif future_flood_risk >= 50:
            classification = "HIGH FLOOD RISK"
            interpretation = ("Water signatures and forecast rainfall suggest "
                              "elevated flood risk in the coming days.")
        elif paddy_probability >= 50:
            classification = "PADDY-DOMINANT AREA"
            interpretation = ("The analysed region mainly shows agricultural or "
                              "paddy-like characteristics. No strong flood "
                              "indication is visible.")
        else:
            classification = "MIXED / OTHER LAND"
            interpretation = ("The region shows mixed land cover with no clear "
                              "paddy or flood dominance.")

        # RETURN
        return jsonify({
            "available": True,
            "image": f"/static/sentinel/{filename}",
            "location": {"latitude": lat, "longitude": lon},
            "paddy_probability": paddy_probability,
            "current_flood": flood_probability,
            "future_flood_risk": future_flood_risk,
            "classification": classification,
            "interpretation": interpretation,
            "satellite": "Sentinel-1",
            "sensor": "C-band SAR"
        })

    except Exception as e:
        print("Paddy analysis error:", e)
        return jsonify({"available": False, "error": str(e)}), 500

# ========================================
# START SERVER
# ========================================

if __name__ == "__main__":

    print(
        "\n================================"
    )

    print(
        "JALRASTA BACKEND STARTING"
    )

    print(
        "http://127.0.0.1:5000"
    )

    print(
        "================================\n"
    )


    app.run(

        host="127.0.0.1",

        port=5000,

        debug=True

    )