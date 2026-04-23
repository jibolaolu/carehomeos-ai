def generate_handover(notes: list[str]) -> dict[str, object]:
    return {
        "summary": " ".join(notes[:3]),
        "priorities": ["Review outstanding MAR items", "Check residents with hydration or pressure care concerns"],
    }
