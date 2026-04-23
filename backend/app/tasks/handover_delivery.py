from app.services.ai.handover_generator import generate_handover


def run() -> dict[str, object]:
    return generate_handover(["Hydration prompts due", "Pressure care review booked"])
