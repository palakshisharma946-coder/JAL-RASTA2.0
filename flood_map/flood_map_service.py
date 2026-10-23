import requests


def get_flood_map_data(latitude, longitude):
    """
    Fetch current weather and rainfall information
    for a location using Open-Meteo.
    """

    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "precipitation,rain,weather_code",
        "hourly": "precipitation_probability",
        "forecast_days": 1
    }

    try:
        result = requests.get(
            url,
            params=params,
            timeout=15
        )
        result.raise_for_status()
        data = result.json()

        current = data.get("current", {})
        hourly = data.get("hourly", {})

        rain_probability = hourly.get(
            "precipitation_probability", []
        )

        return {
            "status": "success",
            "location": {
                "latitude": latitude,
                "longitude": longitude
            },
            "current_weather": {
                "precipitation_mm": current.get("precipitation"),
                "rain_mm": current.get("rain"),
                "weather_code": current.get("weather_code")
            },
            "rain_probability_percent": (
                rain_probability[0] if rain_probability else None
            ),
            "note": (
                "Weather and rainfall information only; "
                "this is not confirmed flood detection."
            )
        }

    except requests.RequestException as error:
        return {
            "status": "error",
            "message": "Unable to fetch weather data.",
            "details": str(error)
        }