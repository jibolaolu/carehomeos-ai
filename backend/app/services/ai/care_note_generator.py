from __future__ import annotations

from app.services.phi_filter import deidentify


DOMAINS = (
    "personal_care",
    "nutrition",
    "mobility",
    "mood",
    "skin",
    "continence",
    "sleep",
    "social",
    "concerns",
)


def generate_structured_note(transcript: str, note_type: str = "general") -> dict[str, object]:
    filtered = deidentify(transcript)
    lower = filtered.text.lower()
    concern_terms = ("fall", "pain", "confused", "bruise", "pressure", "not eating", "short of breath")
    concern_flag = any(term in lower for term in concern_terms)

    note = {
        "note_type": note_type,
        "source": "voice",
        "transcript": filtered.text,
        "personal_care": "Support delivered with consent and privacy maintained.",
        "nutrition": "Food and fluid intake reviewed during the interaction.",
        "mobility": "Mobility and transfer needs considered against the current care plan.",
        "mood": "Mood and engagement described in person-first language.",
        "skin": "Skin integrity considered; escalation added where concerns are described.",
        "continence": "Continence support recorded where relevant to the note.",
        "sleep": "Sleep and rest patterns recorded where relevant.",
        "social": "Meaningful engagement and family communication considered.",
        "concerns": "Senior review required." if concern_flag else "No immediate concern identified.",
        "concern_flag": concern_flag,
        "family_update": "Today was settled, with support provided in a calm and reassuring way.",
        "phi_tokens": filtered.replacements,
    }

    if note_type == "nutrition":
        note["nutrition"] = "Meal and fluid intake recorded with any prompting or fortified drinks noted."
    if note_type == "mobility":
        note["mobility"] = "Transfers, walking aid use, and falls prevention measures recorded."
    if note_type == "skin":
        note["skin"] = "Pressure area observations and repositioning actions recorded."

    return note
