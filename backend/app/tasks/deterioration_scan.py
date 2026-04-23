from app.services.ai.deterioration_detector import detect_deterioration


def run() -> dict[str, object]:
    return detect_deterioration(["reduced fluids", "new confusion", "pressure area"])
