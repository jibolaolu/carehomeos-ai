from __future__ import annotations

import logging

from app.services.ai.core_ai_services import generate_handover as _generate_handover

logger = logging.getLogger(__name__)


async def generate_handover(
    outgoing_shift_notes: list[dict[str, object]],
    current_alerts: list[dict[str, object]] | None = None,
    upcoming_medications: list[dict[str, object]] | None = None,
    residents: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    """Generate AI shift handover from outgoing shift notes using Claude Sonnet.

    This function replaces the previous simple concatenation stub and delegates to
    the real LLM-powered implementation in core_ai_services.py.
    """
    return await _generate_handover(
        outgoing_shift_notes=outgoing_shift_notes,
        current_alerts=current_alerts,
        upcoming_medications=upcoming_medications,
        residents=residents,
    )
