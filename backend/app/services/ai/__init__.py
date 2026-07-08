from __future__ import annotations

from app.services.ai.care_note_generator import generate_structured_note
from app.services.ai.deterioration_detector import detect_deterioration
from app.services.ai.falls_risk_scorer import score_falls_risk
from app.services.ai.family_update_generator import generate_family_update
from app.services.ai.handover_generator import generate_handover
from app.services.ai.cqc_pack_generator import build_inspection_pack
from app.services.ai.mock_inspection import run_mock_inspection
from app.services.ai.rota_optimiser import optimise_rota
from app.services.ai.activity_recommender import recommend_activities
from app.services.ai.care_plan_generator import generate_care_plan
from app.services.ai.incident_analyser import analyse_incident
from app.services.ai.medication_reviewer import review_medications

__all__ = [
    "generate_structured_note",
    "detect_deterioration",
    "score_falls_risk",
    "generate_family_update",
    "generate_handover",
    "build_inspection_pack",
    "run_mock_inspection",
    "optimise_rota",
    "recommend_activities",
    "generate_care_plan",
    "analyse_incident",
    "review_medications",
]
