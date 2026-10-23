def get_chatbot_response(message):
    """
    Basic JalRasta chatbot.
    It responds to common flood and safety questions.
    """

    message = message.lower().strip()

    if "flood" in message:
        return (
            "Flood risk may be present. Check official flood alerts "
            "and follow instructions from local authorities."
        )

    elif "rescue" in message or "help" in message:
        return (
            "If someone is in immediate danger, contact local emergency "
            "services and follow official rescue instructions."
        )

    elif "rain" in message:
        return (
            "Heavy rainfall can increase flood risk. Monitor local weather "
            "updates and flood warnings."
        )

    elif "route" in message:
        return (
            "Please provide your starting location and destination "
            "to request route information."
        )

    elif "hello" in message or "hi" in message:
        return "Hello! I am JalRasta Assistant. How can I help you?"

    else:
        return (
            "I can help with JalRasta topics such as floods, rainfall, "
            "rescue information and routes."
        )