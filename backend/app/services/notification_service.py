def send_notification(channel: str, recipient: str, message: str) -> dict[str, object]:
    return {"channel": channel, "recipient": recipient, "message": message, "queued": True}
