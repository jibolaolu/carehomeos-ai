from __future__ import annotations

import logging

from app.services.ai.core_ai_services import generate_inspection_pack as _generate_inspection_pack

logger = logging.getLogger(__name__)


async def build_inspection_pack(
    home_id: str,
    home_name: str,
    evidence_summary: dict[str, object],
) -> dict[str, object]:
    """Generate a CQC inspection readiness pack using GPT-4o.

    This function replaces the previous stub that returned hardcoded data and
    delegates to the real LLM-powered implementation in core_ai_services.py.
    """
    return await _generate_inspection_pack(
        home_id=home_id,
        home_name=home_name,
        evidence_summary=evidence_summary,
    )
