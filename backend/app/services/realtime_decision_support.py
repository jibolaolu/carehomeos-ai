"""
Real-Time Clinical Decision Support
====================================
Provides AI-powered suggestions to carers as they document care notes,
with streaming debounced LLM calls for responsive assistance.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from app.services.llm_router import TaskType, complete

logger = logging.getLogger(__name__)


DECISION_SUPPORT_SYSTEM_PROMPT = """You are a UK care home clinical decision support assistant.
As a carer types their care note, suggest relevant care plan sections to document,
flag potential deterioration language, and recommend observations.
Be concise and practical. Only suggest what is clinically relevant."""


async def get_realtime_suggestions(
    partial_text: str,
    resident: dict[str, Any] | None = None,
    care_plan: dict[str, Any] | None = None,
    recent_notes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Get real-time suggestions as carer types care note.
    
    Args:
        partial_text: Current text being typed
        resident: Resident context
        care_plan: Current care plan
        recent_notes: Recent notes for context
    
    Returns:
        Suggestions for care plan sections, deterioration flags, observations
    """
    if not partial_text or len(partial_text) < 10:
        return {
            "suggestions": [],
            "deterioration_flag": False,
            "care_plan_sections": [],
            "observations_recommended": [],
        }
    
    prompt = f"""A carer is typing a care note. Provide real-time suggestions.

Partial text: "{partial_text}"

Resident: {resident.get('name', 'unknown') if resident else 'unknown'}
Primary need: {resident.get('primary_need', 'unknown') if resident else 'unknown'}

Care plan goals: {care_plan.get('goals', 'N/A') if care_plan else 'N/A'}

Recent notes: {', '.join([n.get('summary', '') for n in (recent_notes or [])[:3]])}

Respond with JSON:
{{
    "suggestions": [
        "specific suggestion 1",
        "specific suggestion 2"
    ],
    "deterioration_flag": true/false,
    "deterioration_indicators": ["words/phrases that suggest deterioration"],
    "care_plan_sections": ["which sections of care plan to document in"],
    "observations_recommended": ["specific observations to record"],
    "documentation_tips": ["tips for better documentation"]
}}

Be concise. Only flag genuine deterioration indicators."""

    result = await complete(
        task_type=TaskType.CARE_NOTE,
        prompt=prompt,
        system=DECISION_SUPPORT_SYSTEM_PROMPT,
    )
    
    suggestions = _parse_json_safely(result.text)
    
    if suggestions.get("parse_error"):
        # Keyword-based fallback
        lower = partial_text.lower()
        deterioration_terms = ["pain", "confused", "not eating", "short of breath", "fall", "bruise", "agitated"]
        has_deterioration = any(term in lower for term in deterioration_terms)
        
        suggestions = {
            "suggestions": ["Continue documenting specific observations"] if not has_deterioration else ["Consider senior review"],
            "deterioration_flag": has_deterioration,
            "deterioration_indicators": [t for t in deterioration_terms if t in lower],
            "care_plan_sections": ["general"],
            "observations_recommended": ["Document specific observations"],
            "documentation_tips": ["Be specific about what was observed and what action was taken"],
            "_fallback": True,
        }
    
    suggestions["timestamp"] = datetime.now(timezone.utc).isoformat()
    suggestions["partial_text_length"] = len(partial_text)
    
    return suggestions


async def get_care_plan_suggestions(
    note_text: str,
    care_plan: dict[str, Any],
) -> list[dict[str, Any]]:
    """Suggest which care plan sections to document based on note content.
    
    Args:
        note_text: Completed care note text
        care_plan: Current care plan
    
    Returns:
        Relevant care plan sections with suggested content
    """
    prompt = f"""Match this care note to relevant care plan sections.

Care note: {note_text[:500]}

Care plan domains: {', '.join(care_plan.get('domains', []))}

Respond with JSON array:
[
    {{
        "domain": "care plan domain",
        "relevance": "high/medium/low",
        "suggested_update": "what to add to care plan",
        "goal_link": "which goal this relates to"
    }}
]

Only include domains that are clearly relevant to this note."""

    result = await complete(
        task_type=TaskType.CARE_PLAN,
        prompt=prompt,
        system=DECISION_SUPPORT_SYSTEM_PROMPT,
    )
    
    parsed = _parse_json_safely(result.text)
    
    if parsed.get("parse_error"):
        # Simple keyword matching fallback
        lower = note_text.lower()
        sections = []
        
        if any(term in lower for term in ["ate", "drink", "fluid", "meal"]):
            sections.append({"domain": "nutrition", "relevance": "high", "suggested_update": "Update nutrition intake record", "goal_link": "Maintain adequate nutrition"})
        
        if any(term in lower for term in ["walk", "mobil", "transfer", "fall"]):
            sections.append({"domain": "mobility", "relevance": "high", "suggested_update": "Update mobility status", "goal_link": "Maintain maximum mobility"})
        
        if any(term in lower for term in ["skin", "pressure", "redness", "wound"]):
            sections.append({"domain": "skin_integrity", "relevance": "high", "suggested_update": "Update skin assessment", "goal_link": "Maintain skin integrity"})
        
        if not sections:
            sections.append({"domain": "general", "relevance": "medium", "suggested_update": "General observation recorded", "goal_link": "Monitor wellbeing"})
        
        return sections
    
    if isinstance(parsed, list):
        return parsed
    
    return []


async def get_observation_recommendations(
    note_text: str,
    resident: dict[str, Any],
) -> list[str]:
    """Recommend specific observations based on note content.
    
    Args:
        note_text: Care note text
        resident: Resident context
    
    Returns:
        List of recommended observations
    """
    lower = note_text.lower()
    recommendations = []
    
    # Temperature check
    if any(term in lower for term in ["unwell", "fever", "temperature", "infection", "antibiotic"]):
        recommendations.append("Check and record temperature")
    
    # Pain assessment
    if "pain" in lower:
        recommendations.append("Record pain score (0-10)")
        recommendations.append("Note pain location and character")
    
    # Fluid balance
    if any(term in lower for term in ["not drinking", "dehydrated", "reduced intake", "fluid"]):
        recommendations.append("Monitor fluid intake and output for 24 hours")
        recommendations.append("Record daily weight")
    
    # Mental state
    if any(term in lower for term in ["confused", "agitated", "not themselves", "drowsy"]):
        recommendations.append("Record mental state assessment (AMT4 or 4AT)")
        recommendations.append("Check for infection, dehydration, medication changes")
    
    # Falls
    if any(term in lower for term in ["fall", "slipped", "unsteady", "dizzy"]):
        recommendations.append("Complete post-fall assessment")
        recommendations.append("Check for injuries (head, hips, wrists)")
        recommendations.append("Review falls risk score")
    
    # Skin
    if any(term in lower for term in ["redness", "pressure", "skin breakdown", "blister"]):
        recommendations.append("Complete Waterlow/Braden risk assessment")
        recommendations.append("Photograph and measure any pressure areas")
        recommendations.append("Review repositioning schedule")
    
    # Nutrition
    if any(term in lower for term in ["not eating", "weight loss", "poor appetite", "refusing meals"]):
        recommendations.append("Complete MUST screening")
        recommendations.append("Weigh weekly for 4 weeks")
        recommendations.append("Consider dietitian referral")
    
    # Breathing
    if any(term in lower for term in ["breathless", "cough", "wheeze", "chest"]):
        recommendations.append("Record respiratory rate and SpO2")
        recommendations.append("Listen for chest sounds")
        recommendations.append("Check for signs of chest infection")
    
    if not recommendations:
        recommendations.append("Continue routine observations")
    
    return recommendations


def _parse_json_safely(text: str) -> dict[str, Any]:
    """Extract JSON from text safely."""
    import json
    text = text.strip()
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
        return {"raw_response": text, "parse_error": True}
