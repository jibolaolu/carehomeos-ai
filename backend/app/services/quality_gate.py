from __future__ import annotations

from dataclasses import dataclass


SAFEGUARDING_TERMS = {
    "bruise",
    "unexplained injury",
    "neglect",
    "abuse",
    "fearful",
    "rough handling",
    "missed medication",
}


@dataclass(frozen=True)
class QualityGateResult:
    route: str
    confidence: float
    reasons: list[str]
    safeguarding: bool


def evaluate_note(note: dict[str, object]) -> QualityGateResult:
    text = " ".join(str(value) for value in note.values()).lower()
    safeguarding = any(term in text for term in SAFEGUARDING_TERMS)
    populated_domains = [
        key
        for key in (
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
        if note.get(key)
    ]
    confidence = min(0.97, 0.46 + (len(populated_domains) * 0.055))
    reasons: list[str] = []

    if safeguarding:
        return QualityGateResult("SAFEGUARDING", max(confidence, 0.9), ["Safeguarding keyword detected"], True)

    if note.get("concern_flag"):
        confidence -= 0.08
        reasons.append("Concern flag requires senior visibility")

    if len(populated_domains) < 6:
        reasons.append("Clinical domains incomplete")

    if confidence >= 0.85:
        route = "AUTO_FILE"
    elif confidence >= 0.60:
        route = "SOFT_FLAG"
    else:
        route = "HARD_FLAG"

    if not reasons:
        reasons.append("Completeness and language checks passed")

    return QualityGateResult(route, round(confidence, 2), reasons, False)
