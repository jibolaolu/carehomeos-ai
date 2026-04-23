def run_mock_inspection(snapshot: dict[str, object]) -> dict[str, object]:
    low_sections = [item for item in snapshot.get("key_questions", []) if item.get("score", 100) < 85]
    return {"focus_areas": low_sections, "likely_rating": "Good with targeted actions"}
