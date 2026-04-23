from __future__ import annotations


SIGNALS = {
    "high": ("short of breath", "chest pain", "unresponsive", "sepsis", "acute confusion"),
    "medium": ("not eating", "reduced fluids", "new confusion", "fall", "pressure area", "pain"),
}


def detect_deterioration(notes: list[str]) -> dict[str, object]:
    text = " ".join(notes).lower()
    high_hits = [term for term in SIGNALS["high"] if term in text]
    medium_hits = [term for term in SIGNALS["medium"] if term in text]

    if high_hits:
        level = "high"
        score = 0.91
        actions = ["Immediate nurse review", "Record observations", "Consider 111/999 escalation"]
    elif len(medium_hits) >= 2:
        level = "medium"
        score = 0.74
        actions = ["Senior carer review", "Increase observations", "Update care plan"]
    elif medium_hits:
        level = "watch"
        score = 0.58
        actions = ["Monitor next shift", "Encourage fluids and document response"]
    else:
        level = "low"
        score = 0.22
        actions = ["Continue routine monitoring"]

    return {"alert_level": level, "score": score, "signals": high_hits + medium_hits, "actions": actions}
