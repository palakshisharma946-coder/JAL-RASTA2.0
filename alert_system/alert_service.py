def generate_flood_alert(data):
    """
    Generate a preliminary flood-related alert from supplied data.
    This is a prototype, not an official flood warning system.
    """

    if not isinstance(data, dict):
        return {
            "status": "error",
            "message": "Input must be a JSON object."
        }

    rainfall = data.get("rainfall_mm")
    water_rising = data.get("water_rising")
    people_at_risk = data.get("people_at_risk")

    if rainfall is not None:
        if (
            isinstance(rainfall, bool)
            or not isinstance(rainfall, (int, float))
            or rainfall < 0
        ):
            return {
                "status": "error",
                "message": "rainfall_mm must be a non-negative number."
            }

    for field in ("water_rising", "people_at_risk"):
        if field in data and type(data[field]) is not bool:
            return {
                "status": "error",
                "message": f"{field} must be true or false."
            }

    score = 0
    reasons = []

    if rainfall is not None and rainfall >= 100:
        score += 2
        reasons.append("High rainfall value reported")
    elif rainfall is not None and rainfall >= 50:
        score += 1
        reasons.append("Moderate-to-high rainfall value reported")

    if water_rising is True:
        score += 2
        reasons.append("Rising water reported")

    if people_at_risk is True:
        score += 2
        reasons.append("People reported at risk")

    if score >= 4:
        level = "HIGH"
        message = "Potential flood concern. Verify conditions and follow official guidance."
    elif score >= 2:
        level = "MODERATE"
        message = "Some warning indicators reported. Check local official alerts."
    else:
        level = "LOW"
        message = "Few warning indicators supplied. This does not confirm safety."

    return {
        "status": "success",
        "alert_level": level,
        "alert_message": message,
        "reasons": reasons,
        "score": score,
        "notice": (
            "Prototype decision support only. These thresholds are illustrative, "
            "not validated warning criteria. Follow official emergency alerts."
        )
    }