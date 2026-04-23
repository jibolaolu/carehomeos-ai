from app.services.family_service import build_family_update


def run() -> dict[str, object]:
    return build_family_update("Margaret Ellis", "Enjoyed music group and accepted fluids.")
