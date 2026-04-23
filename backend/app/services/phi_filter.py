from __future__ import annotations

import re
from dataclasses import dataclass, field


PHI_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("NHS_NUMBER", re.compile(r"\b(?:NHS\s*)?(?:\d{3}[-\s]?\d{3}[-\s]?\d{4})\b", re.I)),
    ("DOB", re.compile(r"\b(?:DOB|date of birth)?\s*:?\s*(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Z][a-z]+\s+\d{4})\b", re.I)),
    ("ROOM", re.compile(r"\b(?:room|rm)\s*[A-Z]?\d+[A-Z]?\b", re.I)),
    ("ADDRESS", re.compile(r"\b\d{1,4}\s+[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,4}\s+(?:Road|Rd|Street|St|Avenue|Ave|Lane|Ln|Close|Drive|Dr)\b", re.I)),
    ("NOK", re.compile(r"\b(?:next of kin|NOK)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})", re.I)),
    ("GP", re.compile(r"\b(?:Dr|Doctor|GP)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b")),
    ("CARER", re.compile(r"\b(?:carer|staff member)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", re.I)),
    ("PERSON", re.compile(r"\b(?:Margaret Ellis|George Patel|Evelyn Morgan|Daniel Ellis|Anika Shah|Claire Morgan)\b")),
]


@dataclass
class DeidentifiedText:
    text: str
    replacements: dict[str, str] = field(default_factory=dict)


def deidentify(text: str) -> DeidentifiedText:
    clean = text
    replacements: dict[str, str] = {}
    counter = 1

    for label, pattern in PHI_PATTERNS:
        def replace(match: re.Match[str]) -> str:
            nonlocal counter
            original = match.group(0)
            token = f"[{label}_{counter}]"
            replacements[token] = original
            counter += 1
            return token

        clean = pattern.sub(replace, clean)

    return DeidentifiedText(text=clean, replacements=replacements)


def reidentify(text: str, replacements: dict[str, str]) -> str:
    restored = text
    for token, original in replacements.items():
        restored = restored.replace(token, original)
    return restored
