from __future__ import annotations

from app.demo_data import CQC_SNAPSHOT


TAG_RULES: dict[str, list[str]] = {
    "nutrition": ["Effective: nutrition and hydration", "Responsive: personalised care"],
    "mobility": ["Safe: managing risks", "Effective: assessing needs"],
    "skin": ["Safe: managing risks", "Effective: monitoring outcomes"],
    "mood": ["Caring: kindness and compassion", "Responsive: personalised care"],
    "safeguarding": ["Safe: safeguarding people from abuse"],
    "medication": ["Safe: medicines optimisation"],
    "audit": ["Well-led: governance and assurance"],
    "family": ["Caring: involving people", "Responsive: listening to concerns"],
}


def tag_quality_statement(note_type: str, text: str = "") -> list[str]:
    lower = f"{note_type} {text}".lower()
    tags: list[str] = []
    for keyword, mapped in TAG_RULES.items():
        if keyword in lower:
            tags.extend(mapped)
    return sorted(set(tags or ["Responsive: personalised care"]))


def build_regulation_17_trail(finding: str, owner: str, due: str) -> dict[str, object]:
    return {
        "regulation": "Regulation 17: Good governance",
        "finding": finding,
        "owner": owner,
        "due": due,
        "evidence_chain": ["audit finding", "action owner assigned", "deadline recorded"],
        "status": "open",
    }


def get_cqc_snapshot() -> dict[str, object]:
    return CQC_SNAPSHOT
