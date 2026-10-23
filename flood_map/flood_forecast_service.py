import requests

FLOOD_API_URL = "https://flood-api.open-meteo.com/v1/flood"


def get_flood_forecast(latitude, longitude):
    """Get a 7-day river-discharge forecast for a location."""

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "river_discharge",
        "forecast_days": 7
    }

    try:
        response = requests.get(
            FLOOD_API_URL,
            params=params,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        daily_data = data.get("daily", {})
        dates = daily_data.get("time", [])
        discharge_values = daily_data.get("river_discharge", [])

        forecast = []

        for date, discharge in zip(dates, discharge_values):
            forecast.append({
                "date": date,
                "river_discharge_m3_per_second": discharge
            })

        return {
            "status": "success",
            "latitude": latitude,
            "longitude": longitude,
            "unit": "m³/s",
            "forecast": forecast,
            "warning": (
                "River discharge is not direct flood confirmation. "
                "Interpret values using local river thresholds and context."
            ),
            "source": "Open-Meteo Flood API"
        }

    except (requests.RequestException, ValueError):
        return {
            "status": "error",
            "message": "Flood forecast service is temporarily unavailable."
        }