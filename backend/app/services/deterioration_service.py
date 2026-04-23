from app.services.ai.deterioration_detector import detect_deterioration


def scan_resident_notes(resident_id: str, notes: list[str]) -> dict[str, object]:
    return {"resident_id": resident_id, **detect_deterioration(notes)}
