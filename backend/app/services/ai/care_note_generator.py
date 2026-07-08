from __future__ import annotations

import logging

from app.services.ai.core_ai_services import generate_structured_note as _generate_structured_note
from app.services.phi_filter import deidentify

logger = logging.getLogger(__name__)

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


async def generate_structured_note(
    transcript: str,
    note_type: str = "general",
    resident: dict[str, object] | None = None,
    care_plan: dict[str, object] | None = None,
    recent_notes: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    """Generate a structured care note from a voice transcript using Claude Sonnet.

    This function replaces the previous hardcoded stub and delegates to the real
    LLM-powered implementation in core_ai_services.py.
    """
    filtered = deidentify(transcript)
    result = await _generate_structured_note(
        transcript=filtered.text,
        note_type=note_type,
        resident=resident,
        care_plan=care_plan,
        recent_notes=recent_notes,
    )
    # Ensure phi_tokens are preserved for audit trail
    if "phi_tokens" not in result:
        result["phi_tokens"] = filtered.replacements
    return result
