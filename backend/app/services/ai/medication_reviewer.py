def review_medications(medications: list[str]) -> dict[str, object]:
    interactions = []
    if any("warfarin" in med.lower() for med in medications) and any("ibuprofen" in med.lower() for med in medications):
        interactions.append("Warfarin and ibuprofen bleeding risk")
    return {"interactions": interactions, "clinical_review_required": bool(interactions)}
