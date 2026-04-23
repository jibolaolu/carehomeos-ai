from __future__ import annotations

from app.services.cqc_service import get_cqc_snapshot


def build_inspection_pack() -> dict[str, object]:
    snapshot = get_cqc_snapshot()
    return {
        "title": "CareHomeOS CQC Inspection Pack",
        "overall_readiness": snapshot["overall"],
        "sections": snapshot["key_questions"],
        "priority_actions": snapshot["actions"],
        "export_formats": ["PDF", "CSV evidence register", "ZIP document bundle"],
    }
