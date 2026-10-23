def calculate_rescue_priority(report):
    """
    Calculate a preliminary rescue priority score from an emergency report.
    This is a decision-support aid, not an autonomous dispatch system.
    """

    score = 0
    reasons = []

    # Immediate danger
    if report.get("immediate_danger") is True:
        score += 50
        reasons.append("Immediate danger reported")

    # People trapped or unable to evacuate
    if report.get("people_trapped") is True:
        score += 30
        reasons.append("People reported trapped")

    # Medical emergency
    if report.get("medical_emergency") is True:
        score += 25
        reasons.append("Medical assistance requested")

    # Vulnerable people needing additional help
    if report.get("vulnerable_people") is True:
        score += 15
        reasons.append("People may need additional assistance")

    # Rising water
    if report.get("water_rising") is True:
        score += 20
        reasons.append("Rising water reported")

    # Safe route availability
    if report.get("safe_route_available") is False:
        score += 10
        reasons.append("Safe route not confirmed")

    # Convert the score into a preliminary priority category
    if score >= 70:
        priority = "CRITICAL"
    elif score >= 40:
        priority = "HIGH"
    elif score >= 20:
        priority = "MODERATE"
    else:
        priority = "REVIEW"

    return {
        "priority_score": score,
        "priority": priority,
        "reasons": reasons,
        "disclaimer": (
            "Preliminary decision support only. "
            "Verify reports and follow official emergency services."
        )
    }


def rank_rescue_reports(reports):
    """Rank reports by score, highest first."""

    ranked = []

    for report in reports:
        result = calculate_rescue_priority(report)

        ranked.append({
            **report,
            **result
        })

    ranked.sort(
        key=lambda item: item["priority_score"],
        reverse=True
    )

    return ranked