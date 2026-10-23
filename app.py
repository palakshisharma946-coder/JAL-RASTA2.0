from flask import Flask, jsonify, request 
from flask_cors import CORS
from chatbot.chatbot_service import get_chatbot_response
from flood_map.flood_map_service import get_flood_map_data
import requests 
from flood_map.flood_forecast_service import get_flood_forecast
from rescue_priority.rescue_priority_service import rank_rescue_reports
from routing.routing_service import get_route
from alert_system.alert_service import generate_flood_alert

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "message": "JalRasta backend is running"
    })

    
@app.route("/api/chatbot", methods=["POST"])
def chatbot():
    data = request.get_json(silent=True)

    if not data or not isinstance(data.get("message"), str):
        return jsonify({
            "status": "error",
            "message": "Please provide a message."
        }), 400

    user_message = data["message"].strip()

    if not user_message:
        return jsonify({
            "status": "error",
            "message": "Message cannot be empty."
        }), 400

    response = get_chatbot_response(user_message)

    return jsonify({
        "status": "success",
        "user_message": user_message,
        "response": response
    })
@app.route("/api/flood-map", methods=["GET"])
def flood_map():
    latitude = request.args.get("latitude", type=float)
    longitude = request.args.get("longitude", type=float)

    if latitude is None or longitude is None:
        return jsonify({
            "status": "error",
            "message": "Please provide latitude and longitude."
        }), 400

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return jsonify({
            "status": "error",
            "message": "Invalid latitude or longitude."
        }), 400

    result = get_flood_map_data(latitude, longitude)

    status_code = 200 if result["status"] == "success" else 502
    return jsonify(result), status_code
@app.route("/api/location-search", methods=["GET"])
def location_search():
    place = request.args.get("name", "").strip()

    if len(place) < 2:
        return jsonify({
            "status": "error",
            "message": "Please enter at least 2 characters."
        }), 400

    try:
        response = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={
                "name": place,
                "count": 10,
                "language": "en",
                "format": "json"
            },
            timeout=15
        )
        response.raise_for_status()
        data = response.json()

        results = []

        for item in data.get("results", []):
            results.append({
                "name": item.get("name"),
                "country": item.get("country"),
                "admin1": item.get("admin1"),
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude")
            })

        return jsonify({
            "status": "success",
            "query": place,
            "results": results,
            "source": "Open-Meteo Geocoding API"
        })

    except requests.RequestException:
        return jsonify({
            "status": "error",
            "message": "Location service is temporarily unavailable."
        }), 502
@app.route("/api/flood-forecast", methods=["GET"])
def flood_forecast():
    latitude = request.args.get("latitude", type=float)
    longitude = request.args.get("longitude", type=float)

    if latitude is None or longitude is None:
        return jsonify({
            "status": "error",
            "message": "Please provide latitude and longitude."
        }), 400

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return jsonify({
            "status": "error",
            "message": "Invalid latitude or longitude."
        }), 400

    result = get_flood_forecast(latitude, longitude)

    status_code = 200 if result["status"] == "success" else 502
    return jsonify(result), status_code 
@app.route("/api/rescue-priority", methods=["POST"])
def rescue_priority():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Please provide a JSON object."
        }), 400

    reports = data.get("reports")

    if not isinstance(reports, list) or not reports:
        return jsonify({
            "status": "error",
            "message": "Please provide a non-empty reports list."
        }), 400

    if not all(isinstance(report, dict) for report in reports):
        return jsonify({
            "status": "error",
            "message": "Each report must be a JSON object."
        }), 400

    allowed_fields = {
        "location",
        "immediate_danger",
        "people_trapped",
        "medical_emergency",
        "vulnerable_people",
        "water_rising",
        "safe_route_available"
    }

    for report in reports:
        if not set(report).issubset(allowed_fields):
            return jsonify({
                "status": "error",
                "message": "A report contains unsupported fields."
            }), 400

        boolean_fields = allowed_fields - {"location"}

        for field in boolean_fields:
            if field in report and type(report[field]) is not bool:
                return jsonify({
                    "status": "error",
                    "message": f"{field} must be true or false."
                }), 400

        if "location" in report and not isinstance(report["location"], str):
            return jsonify({
                "status": "error",
                "message": "Location must be text."
            }), 400

    ranked_reports = rank_rescue_reports(reports)

    return jsonify({
        "status": "success",
        "count": len(ranked_reports),
        "ranked_reports": ranked_reports,
        "notice": (
            "Preliminary prioritization only; verify reports and "
            "follow official emergency services."
        )
    }) 
@app.route("/api/route", methods=["GET"])
def calculate_route():
    try:
        start_lat = float(request.args.get("start_lat", ""))
        start_lon = float(request.args.get("start_lon", ""))
        end_lat = float(request.args.get("end_lat", ""))
        end_lon = float(request.args.get("end_lon", ""))

        coordinates = [start_lat, start_lon, end_lat, end_lon]

        if not all(-90 <= value <= 90 for value in [start_lat, end_lat]):
            return jsonify({
                "status": "error",
                "message": "Latitude must be between -90 and 90."
            }), 400

        if not all(-180 <= value <= 180 for value in [start_lon, end_lon]):
            return jsonify({
                "status": "error",
                "message": "Longitude must be between -180 and 180."
            }), 400

        result = get_route(
            start_lat, start_lon,
            end_lat, end_lon
        )

        status_code = 200 if result["status"] == "success" else 502
        return jsonify(result), status_code

    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "Provide valid numeric coordinates."
        }), 400 
@app.route("/api/alerts", methods=["POST"])
def create_flood_alert():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Please provide a valid JSON object."
        }), 400

    result = generate_flood_alert(data)

    if result["status"] == "error":
        return jsonify(result), 400

    return jsonify(result), 200     
if __name__ == "__main__":
    app.run(debug=True, port=5000)