from __future__ import annotations

import logging

from app.services.ai.core_ai_services import detect_deterioration as _detect_deterioration

logger = logging.getLogger(__name__)

SIGNALS = {
    "high": ("short of breath", "chest pain", "unresponsive", "sepsis", "acute confusion"),
    "medium": ("not eating", "reduced fluids", "new confusion", "fall", "pressure area", "pain"),
}


async def detect_deterioration(
    resident: dict[str, object],
    notes: list[dict[str, object]],
    vitals: list[dict[str, object]] | None = None,
    medications: list[dict[str, object]] | None = None,
    fluids: list[dict[str, object]] | None = None,
    weight_history: list[dict[str, object]] | None = None,
    incidents: list[dict[str, object]] | None = None,
    days: int = 30,
) -> dict[str, object]:
    """Detect clinical deterioration using Claude Opus with real LLM analysis.

    This function replaces the previous keyword-based stub and delegates to the
    real LLM-powered implementation in core_ai_services.py.
    """
    return await _detect_deterioration(
        resident=resident,
        notes=notes,
        vitals=vitals,
        medications=medications,
        fluids=fluids,
        weight_history=weight_history,
        incidents=incidents,
        days=days,
    )
