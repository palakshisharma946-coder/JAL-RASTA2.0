import requests


OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving"


def get_route(start_lat, start_lon, end_lat, end_lon):
    """
    Get a driving route between two coordinates.
    This service does not verify flood safety.
    """

    try:
        coordinates = (
            f"{start_lon},{start_lat};"
            f"{end_lon},{end_lat}"
        )

        url = f"{OSRM_BASE_URL}/{coordinates}"

        response = requests.get(
            url,
            params={
                "overview": "false",
                "alternatives": "true",
                "steps": "false"
            },
            timeout=15
        )

        response.raise_for_status()
        data = response.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            return {
                "status": "error",
                "message": "No route found for these locations."
            }

        routes = []

        for index, route in enumerate(data["routes"], start=1):
            routes.append({
                "route_number": index,
                "distance_km": round(route["distance"] / 1000, 2),
                "estimated_time_minutes": round(
                    route["duration"] / 60
                )
            })

        return {
            "status": "success",
            "routes": routes,
            "notice": (
                "Routes are suggestions only. "
                "Flood safety and road closures are not verified."
            )
        }

    except requests.RequestException:
        return {
            "status": "error",
            "message": "Routing service is unavailable. Try again later."
        }
    except (ValueError, KeyError, TypeError):
        return {
            "status": "error",
            "message": "Unable to process the routing response."
        }