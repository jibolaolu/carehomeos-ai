def build_presigned_upload(key: str) -> dict[str, object]:
    return {"key": key, "url": f"http://localhost:9000/audio-temp/{key}", "method": "PUT"}


def delete_object(key: str) -> dict[str, object]:
    return {"key": key, "deleted": True}
