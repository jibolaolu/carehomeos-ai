"""
CareHomeOS AI Service Implementations
=====================================
This module provides real LLM-powered AI services for care home operations.
All services use the LLM router with proper prompt engineering, resident context,
and clinical safety fallbacks.

Services implemented:
- Care Note Generator (Claude Sonnet)
- Deterioration Detector (Claude Opus)
- Falls Risk Scorer (GPT-4o mini)
- Family Update Generator (Claude Sonnet)
- Handover Generator (Claude Sonnet)
- CQC Pack Generator (GPT-4o)
- Mock Inspection (Claude Sonnet)
- Rota Optimiser (GPT-4o mini)
- Activity Recommender (Claude Sonnet)
- Care Plan Generator (Claude Sonnet)
- Incident Analyser (Claude Opus)
- Medication Reviewer (GPT-4o)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_router import TaskType, complete
from app.services.phi_filter import deidentify, reidentify
from app.services.quality_gate import evaluate_note, QualityGateResult

logger = logging.getLogger(__name__)


# System Prompts (versioned, nation-specific, clinically validated)
CARE_NOTE_SYSTEM_PROMPT = """You are a senior UK care home nurse with 20 years of experience. 
You structure care notes from voice transcripts into all required CQC domains.
Write in person-first, specific language. Never use vague phrases like "had a good day".
Always note what was observed, what action was taken, and what follow-up is needed.
Follow UK GDPR, CQC expectations, and NICE NG97 guidelines."""

DETERIORATION_SYSTEM_PROMPT = """You are a UK clinical nurse specialist in care home medicine.
Analyse 30 days of resident data to detect early signs of clinical deterioration.
Consider: UTI, chest infection, delirium, cardiac issues, pressure damage, nutritional decline.
Be specific about which data points triggered your concern. Recommend concrete actions.
Use cautious clinical language -- flag uncertainty appropriately."""

FALLS_SYSTEM_PROMPT = """You are a UK falls prevention specialist nurse.
Calculate falls risk scores based on resident data including mobility, medications, 
cognitive status, infection indicators, and environmental factors.
Recommend specific, actionable preventive interventions."""

FAMILY_UPDATE_SYSTEM_PROMPT = """You are a warm, empathetic care home communicator.
Write plain-English updates for family members. No clinical jargon.
Focus on positive moments, specific activities, and reassurance.
Never mention medications, medical conditions, or clinical observations.
Use the resident's preferred name. Write as if speaking to a family member over tea."""

HANDOVER_SYSTEM_PROMPT = """You are a senior nurse preparing a shift handover.
Summarise all shift notes into priorities: concerns, changes, outstanding actions, medication notes.
Highlight any safeguarding flags, deterioration alerts, or falls risk changes.
Be concise but complete -- the incoming team needs to know what to watch for."""

CQC_SYSTEM_PROMPT = """You are a CQC inspector preparing evidence for assessment.
Map care home activities to the 34 CQC Quality Statements across 5 Key Questions.
Be precise about which standards are evidenced and which gaps remain."""

MOCK_INSPECTION_SYSTEM_PROMPT = """You are an experienced CQC inspector conducting a mock inspection.
Read all current evidence and produce a candid readiness report.
Identify strengths, risks, and priority actions. Estimate likely rating if inspected today.
Be honest but constructive -- this is for improvement, not punishment."""

ROTA_SYSTEM_PROMPT = """You are a UK care home workforce manager expert in Working Time Regulations.
Generate optimal rotas considering: resident dependency, staff qualifications, 
WTR compliance (11-hour rest, 48-hour max week), continuity of care, and agency gaps."""

CARE_PLAN_SYSTEM_PROMPT = """You are a UK care home care planner specialising in person-centred care.
Generate care plan goals and interventions from assessment data.
Use SMART goals. Link to NICE guidelines. Consider MCA and DoLS where relevant.
Never auto-publish -- this is a draft for manager review."""

INCIDENT_SYSTEM_PROMPT = """You are a UK care home safeguarding and incident investigation specialist.
Analyse incidents for root causes, severity, and required actions.
Consider: environment, staffing, equipment, training, care plan accuracy, communication.
Recommend specific improvements to prevent recurrence."""

MEDICATION_SYSTEM_PROMPT = """You are a UK care home pharmacist specialising in polypharmacy in older adults.
Review medication lists for interactions, deprescribing opportunities, and adherence issues.
Reference BNF and NICE guidelines. Flag high-risk combinations clearly."""

ACTIVITY_SYSTEM_PROMPT = """You are a UK care home activities coordinator specialising in dementia care.
Recommend personalised activities based on resident interests, abilities, and mood.
Consider: sensory, cognitive, physical, social, and reminiscence activities.
Suggest adaptations for different ability levels."""


# Helper Functions

def _parse_json_safely(text: str) -> dict[str, Any]:
    """Extract JSON from LLM response, handling markdown code blocks."""
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
        logger.warning(f"Failed to parse JSON from LLM response: {text[:200]}...")
        return {"raw_response": text, "parse_error": True}


def _build_resident_context(resident: dict[str, Any] | None) -> str:
    """Build rich resident context for prompts."""
    if not resident:
        return "Resident: [anonymised for privacy]"
    
    ctx = f"""Resident Context:
- Name: {resident.get('name', '[anonymised]')}
- Age: {resident.get('age', 'unknown')}
- Primary need: {resident.get('primary_need', 'unknown')}
- Mobility: {resident.get('mobility', 'unknown')}
- Room: {resident.get('room', 'unknown')}
- Falls risk: {resident.get('falls_risk', 'unknown')}
- Deterioration status: {resident.get('deterioration', 'unknown')}
- Hydration status: {resident.get('hydration', 'unknown')}
- Care plan review due: {resident.get('care_plan_review', 'unknown')}
"""
    return ctx


def _build_care_plan_context(care_plan: dict[str, Any] | None) -> str:
    """Build care plan context for prompts."""
    if not care_plan:
        return "Care plan: [not available]"
    
    return f"""Current Care Plan:
- Goals: {care_plan.get('goals', 'N/A')}
- Key interventions: {care_plan.get('interventions', 'N/A')}
- Risk assessments: {care_plan.get('risk_assessments', 'N/A')}
- Preferences: {care_plan.get('preferences', 'N/A')}
- Last reviewed: {care_plan.get('last_reviewed', 'unknown')}
"""


def _build_recent_notes_context(notes: list[dict[str, Any]]) -> str:
    """Build recent notes context for prompts."""
    if not notes:
        return "Recent notes: [none available]"
    
    ctx = "Recent Care Notes (last 7 days):\n"
    for note in notes[:5]:
        ctx += f"- [{note.get('created_at', 'unknown')}] {note.get('type', 'general')}: {note.get('summary', 'no summary')}\n"
    return ctx


def _build_medication_context(medications: list[dict[str, Any]]) -> str:
    """Build medication context for prompts."""
    if not medications:
        return "Medications: [none available]"
    
    ctx = "Current Medications:\n"
    for med in medications:
        ctx += f"- {med.get('name', 'unknown')} {med.get('dose', '')} {med.get('frequency', '')} (route: {med.get('route', 'unknown')})\n"
    return ctx


def _build_vitals_context(vitals: list[dict[str, Any]]) -> str:
    """Build vital signs context for prompts."""
    if not vitals:
        return "Vital signs: [none available]"
    
    latest = vitals[-1] if vitals else {}
    ctx = f"""Latest Vital Signs ({latest.get('recorded_at', 'unknown')}):
- Temperature: {latest.get('temperature', 'N/A')} C
- Heart rate: {latest.get('heart_rate', 'N/A')} bpm
- Blood pressure: {latest.get('blood_pressure', 'N/A')} mmHg
- Respiratory rate: {latest.get('respiratory_rate', 'N/A')} /min
- SpO2: {latest.get('spo2', 'N/A')}%
- Consciousness: {latest.get('consciousness', 'N/A')}
"""
    return ctx


def _parse_date(date_str: str | None) -> datetime:
    """Parse date string safely."""
    if not date_str:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return datetime.min.replace(tzinfo=timezone.utc)


# 1. Care Note Generator (Claude Sonnet)

async def generate_structured_note(
    transcript: str,
    note_type: str = "general",
    resident: dict[str, Any] | None = None,
    care_plan: dict[str, Any] | None = None,
    recent_notes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generate a structured care note from a voice transcript using Claude Sonnet."""
    filtered = deidentify(transcript)
    
    prompt = f"""Structure the following care home voice transcript into a comprehensive care note.

{_build_resident_context(resident)}

{_build_care_plan_context(care_plan)}

{_build_recent_notes_context(recent_notes or [])}

Note type: {note_type}

Voice transcript:
"{filtered.text}"

Structure your response as a JSON object with these exact fields:
{{
    "note_type": "{note_type}",
    "source": "voice",
    "transcript": "[the de-identified transcript]",
    "personal_care": "[specific observations about personal care, hygiene, dignity, privacy]",
    "nutrition": "[food and fluid intake, prompting needs, fortified drinks, supplements]",
    "mobility": "[mobility, transfers, walking aids, falls prevention, positioning]",
    "mood": "[mood, engagement, behaviour, interaction with others, signs of distress]",
    "skin": "[skin integrity, pressure areas, repositioning, wound care]",
    "continence": "[continence support, toileting, catheter care, hygiene]",
    "sleep": "[sleep quality, rest patterns, night-time observations]",
    "social": "[social interaction, activities, family contact, community links]",
    "concerns": "[any concerns requiring senior review, with specific observations]",
    "concern_flag": true/false,
    "family_update": "[warm, plain-English 2-3 sentence update for family - NO clinical terms]",
    "recommended_actions": ["[action 1]", "[action 2]"],
    "cqc_tags": ["[relevant CQC Quality Statement tags]"]
}}

Rules:
1. Be SPECIFIC -- never write "had a good day" or "was fine"
2. Use person-first language: "Margaret enjoys" not "Margaret is a dementia patient"
3. concern_flag = true if any deterioration, pain, safeguarding, or significant change is mentioned
4. family_update must be warm, positive, and contain NO clinical terminology
5. recommended_actions must be concrete and actionable
"""

    result = await complete(
        task_type=TaskType.CARE_NOTE,
        prompt=prompt,
        system=CARE_NOTE_SYSTEM_PROMPT,
    )
    
    structured = _parse_json_safely(result.text)
    
    if structured.get("parse_error"):
        logger.warning("Care note LLM response parse failed, using fallback")
        structured = _care_note_fallback(filtered.text, note_type)
    
    if "transcript" in structured and isinstance(structured["transcript"], str):
        structured["transcript"] = reidentify(structured["transcript"], filtered.replacements)
    
    for domain in ("personal_care", "nutrition", "mobility", "mood", "skin", 
                     "continence", "sleep", "social", "concerns"):
        if domain not in structured:
            structured[domain] = "[Not documented in this note]"
    
    if "concern_flag" not in structured:
        structured["concern_flag"] = False
    if "family_update" not in structured:
        structured["family_update"] = "[Family update pending]"
    if "recommended_actions" not in structured:
        structured["recommended_actions"] = []
    if "cqc_tags" not in structured:
        structured["cqc_tags"] = []
    
    structured["phi_tokens"] = filtered.replacements
    structured["ai_provider"] = result.provider
    structured["ai_model"] = result.model
    structured["fallback_used"] = result.fallback_used
    
    return structured


def _care_note_fallback(transcript: str, note_type: str) -> dict[str, Any]:
    """Fallback care note when LLM fails."""
    lower = transcript.lower()
    concern_terms = ("fall", "pain", "confused", "bruise", "pressure", "not eating", 
                     "short of breath", "agitated", "distressed", "refused", "wandering")
    concern_flag = any(term in lower for term in concern_terms)
    
    return {
        "note_type": note_type,
        "source": "voice",
        "transcript": transcript,
        "personal_care": "Personal care support provided. See transcript for details.",
        "nutrition": "Nutrition and hydration monitored. See transcript for details.",
        "mobility": "Mobility and transfers assessed. See transcript for details.",
        "mood": "Mood and engagement observed. See transcript for details.",
        "skin": "Skin integrity checked. See transcript for details.",
        "continence": "Continence support provided as needed. See transcript for details.",
        "sleep": "Sleep patterns noted. See transcript for details.",
        "social": "Social interaction observed. See transcript for details.",
        "concerns": "Senior review recommended based on transcript content." if concern_flag else "No immediate concerns identified.",
        "concern_flag": concern_flag,
        "family_update": "Today was a comfortable day with support provided as needed." if not concern_flag else "The team is keeping a close eye on things today and will update you soon.",
        "recommended_actions": ["Review transcript for specific details"] if concern_flag else [],
        "cqc_tags": [],
        "_fallback": True,
    }


# 2. Deterioration Detector (Claude Opus)

async def detect_deterioration(
    resident: dict[str, Any],
    notes: list[dict[str, Any]],
    vitals: list[dict[str, Any]] | None = None,
    medications: list[dict[str, Any]] | None = None,
    fluids: list[dict[str, Any]] | None = None,
    weight_history: list[dict[str, Any]] | None = None,
    incidents: list[dict[str, Any]] | None = None,
    days: int = 30,
) -> dict[str, Any]:
    """Detect clinical deterioration using Claude Opus 200K context analysis."""
    signal_summary = _build_deterioration_signals(
        notes=notes or [],
        vitals=vitals or [],
        medications=medications or [],
        fluids=fluids or [],
        weight_history=weight_history or [],
        incidents=incidents or [],
        days=days,
    )
    
    keyword_signals = _scan_deterioration_keywords(notes or [])
    
    prompt = f"""Analyse the following 30-day clinical data for signs of deterioration.

Resident: {resident.get('name', '[anonymised]')}, Age: {resident.get('age', 'unknown')}
Primary need: {resident.get('primary_need', 'unknown')}
Current deterioration status: {resident.get('deterioration', 'unknown')}

{signal_summary}

Keyword pre-scan findings: {keyword_signals}

Based on this data, provide a structured analysis in JSON format:
{{
    "risk_score": 0-10,
    "alert_level": "none" | "monitor" | "review_today" | "urgent_gp" | "emergency",
    "most_likely_pattern": "UTI" | "chest_infection" | "delirium" | "cardiac" | "pressure_damage" | "nutritional" | "none",
    "confidence": 0.0-1.0,
    "key_signals": ["specific data points that triggered concern"],
    "trend": "improving" | "stable" | "deteriorating" | "rapidly_deteriorating",
    "recommended_action": "specific immediate action",
    "observations_needed": ["specific observations to monitor"],
    "gp_contact_recommended": true/false,
    "explanation": "clear explanation of reasoning for clinical staff"
}}

Alert level thresholds:
- none (0-2): Continue routine monitoring
- monitor (3-4): Increase observations, note in handover
- review_today (5-6): Senior nurse review required today
- urgent_gp (7-8): Contact GP urgently, consider admission
- emergency (9-10): Immediate emergency response, call 999 if indicated

Be specific about which data points support your assessment. Flag uncertainty clearly."""

    result = await complete(
        task_type=TaskType.DETERIORATION,
        prompt=prompt,
        system=DETERIORATION_SYSTEM_PROMPT,
    )
    
    analysis = _parse_json_safely(result.text)
    
    if analysis.get("parse_error"):
        logger.warning("Deterioration analysis parse failed, using keyword fallback")
        analysis = _deterioration_fallback(keyword_signals, resident)
    
    analysis["risk_score"] = max(0, min(10, float(analysis.get("risk_score", 0))))
    analysis["confidence"] = max(0, min(1, float(analysis.get("confidence", 0.5))))
    
    valid_alert_levels = ("none", "monitor", "review_today", "urgent_gp", "emergency")
    if analysis.get("alert_level") not in valid_alert_levels:
        analysis["alert_level"] = _score_to_alert_level(analysis["risk_score"])
    
    valid_patterns = ("UTI", "chest_infection", "delirium", "cardiac", "pressure_damage", "nutritional", "none")
    if analysis.get("most_likely_pattern") not in valid_patterns:
        analysis["most_likely_pattern"] = "none"
    
    analysis["resident_id"] = resident.get("id")
    analysis["analysis_date"] = datetime.now(timezone.utc).isoformat()
    analysis["lookback_days"] = days
    analysis["ai_provider"] = result.provider
    analysis["ai_model"] = result.model
    analysis["fallback_used"] = result.fallback_used
    
    return analysis


def _build_deterioration_signals(
    notes: list[dict[str, Any]],
    vitals: list[dict[str, Any]],
    medications: list[dict[str, Any]],
    fluids: list[dict[str, Any]],
    weight_history: list[dict[str, Any]],
    incidents: list[dict[str, Any]],
    days: int,
) -> str:
    """Build comprehensive signal summary for deterioration analysis."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    summary = f"Clinical Data Summary (last {days} days):\n\n"
    
    recent_notes = [n for n in notes if _parse_date(n.get("created_at")) > cutoff]
    summary += f"Care Notes ({len(recent_notes)} entries):\n"
    for note in recent_notes[-10:]:
        summary += f"- [{note.get('created_at', 'unknown')}] {note.get('type', 'general')}: {note.get('summary', 'N/A')}\n"
    
    if vitals:
        recent_vitals = [v for v in vitals if _parse_date(v.get("recorded_at")) > cutoff]
        summary += f"\nVital Signs ({len(recent_vitals)} entries):\n"
        for v in recent_vitals[-5:]:
            summary += f"- [{v.get('recorded_at', 'unknown')}] Temp: {v.get('temperature', 'N/A')}, HR: {v.get('heart_rate', 'N/A')}, BP: {v.get('blood_pressure', 'N/A')}, SpO2: {v.get('spo2', 'N/A')}\n"
    
    if medications:
        summary += f"\nCurrent Medications ({len(medications)}):\n"
        for med in medications:
            summary += f"- {med.get('name', 'unknown')}\n"
    
    if fluids:
        recent_fluids = [f for f in fluids if _parse_date(f.get("recorded_at")) > cutoff]
        summary += f"\nFluid Balance ({len(recent_fluids)} entries):\n"
        for f in recent_fluids[-5:]:
            summary += f"- [{f.get('recorded_at', 'unknown')}] Intake: {f.get('intake_ml', 'N/A')}ml, Output: {f.get('output_ml', 'N/A')}ml\n"
    
    if weight_history:
        recent_weights = [w for w in weight_history if _parse_date(w.get("recorded_at")) > cutoff]
        if recent_weights:
            summary += f"\nWeight History ({len(recent_weights)} entries):\n"
            for w in recent_weights:
                summary += f"- [{w.get('recorded_at', 'unknown')}] {w.get('weight_kg', 'N/A')}kg\n"
            if len(recent_weights) >= 2:
                first = recent_weights[0].get("weight_kg", 0)
                last = recent_weights[-1].get("weight_kg", 0)
                if first and last:
                    change = ((last - first) / first) * 100
                    summary += f"Weight change: {change:+.1f}%\n"
    
    if incidents:
        recent_incidents = [i for i in incidents if _parse_date(i.get("occurred_at")) > cutoff]
        if recent_incidents:
            summary += f"\nIncidents ({len(recent_incidents)}):\n"
            for i in recent_incidents:
                summary += f"- [{i.get('occurred_at', 'unknown')}] {i.get('type', 'unknown')}: {i.get('description', 'N/A')[:100]}\n"
    
    return summary


def _scan_deterioration_keywords(notes: list[dict[str, Any]]) -> dict[str, Any]:
    """Fast keyword pre-scan for deterioration signals."""
    text = " ".join([n.get("summary", "") for n in notes]).lower()
    
    patterns = {
        "UTI": ["dysuria", "frequency", "urgency", "cloudy urine", "foul smell", "temperature", "confusion"],
        "chest_infection": ["cough", "sputum", "breathless", "wheeze", "chest pain", "oxygen"],
        "delirium": ["confused", "disoriented", "agitated", "hallucination", "not themselves", "sundowning"],
        "cardiac": ["chest pain", "palpitations", "oedema", "shortness of breath", "fatigue"],
        "pressure_damage": ["redness", "skin breakdown", "pressure ulcer", "blister", "discolouration"],
        "nutritional": ["weight loss", "poor appetite", "refusing meals", "dehydrated", "swallowing"],
    }
    
    findings = {}
    for pattern, keywords in patterns.items():
        hits = [kw for kw in keywords if kw in text]
        if hits:
            findings[pattern] = hits
    
    return findings


def _deterioration_fallback(keyword_signals: dict[str, Any], resident: dict[str, Any]) -> dict[str, Any]:
    """Fallback deterioration analysis when LLM fails."""
    patterns = list(keyword_signals.keys())
    
    if not patterns:
        return {
            "risk_score": 1,
            "alert_level": "none",
            "most_likely_pattern": "none",
            "confidence": 0.6,
            "key_signals": ["No deterioration keywords detected"],
            "trend": "stable",
            "recommended_action": "Continue routine monitoring",
            "observations_needed": ["General observations"],
            "gp_contact_recommended": False,
            "explanation": "Keyword analysis found no significant deterioration indicators.",
        }
    
    score = min(3 + len(patterns) * 2, 8)
    
    return {
        "risk_score": score,
        "alert_level": _score_to_alert_level(score),
        "most_likely_pattern": patterns[0] if patterns else "none",
        "confidence": 0.5 + len(patterns) * 0.1,
        "key_signals": [f"{p}: {keyword_signals[p]}" for p in patterns],
        "trend": "deteriorating" if len(patterns) > 1 else "stable",
        "recommended_action": "Senior review recommended based on keyword indicators",
        "observations_needed": ["Monitor for further signs", "Document all observations"],
        "gp_contact_recommended": score >= 7,
        "explanation": f"Keyword analysis detected indicators of: {', '.join(patterns)}. Clinical review recommended.",
    }


def _score_to_alert_level(score: float) -> str:
    """Convert risk score to alert level."""
    if score <= 2:
        return "none"
    elif score <= 4:
        return "monitor"
    elif score <= 6:
        return "review_today"
    elif score <= 8:
        return "urgent_gp"
    else:
        return "emergency"


# 3. Falls Risk Scorer (GPT-4o mini)

async def score_falls_risk(
    resident: dict[str, Any],
    notes: list[dict[str, Any]] | None = None,
    medications: list[dict[str, Any]] | None = None,
    incidents: list[dict[str, Any]] | None = None,
    environment: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Calculate daily falls risk score using GPT-4o mini."""
    context = _build_falls_context(resident, notes, medications, incidents, environment)
    
    prompt = f"""Calculate a falls risk score for this resident and recommend specific preventive interventions.

{_build_resident_context(resident)}

{context}

Respond with JSON:
{{
    "score": 0-100,
    "risk_level": "low" | "medium" | "high" | "very_high",
    "confidence": 0.0-1.0,
    "factors": [
        {{"factor": "name", "weight": "low/medium/high", "details": "specific observation"}}
    ],
    "new_since_yesterday": true/false,
    "previous_score": 0-100 (if known),
    "preventive_interventions": [
        "specific actionable intervention 1",
        "specific actionable intervention 2"
    ],
    "environmental_recommendations": [
        "specific environmental change 1"
    ],
    "medication_review_needed": true/false,
    "review_care_plan": true/false,
    "explanation": "clear reasoning for clinical staff"
}}

Score thresholds:
- 0-24: Low risk
- 25-49: Medium risk  
- 50-74: High risk
- 75-100: Very high risk

Be specific about which medications increase risk (benzodiazepines, antihypertensives, sedatives).
Recommend concrete interventions, not generic advice."""

    result = await complete(
        task_type=TaskType.FALLS,
        prompt=prompt,
        system=FALLS_SYSTEM_PROMPT,
    )
    
    analysis = _parse_json_safely(result.text)
    
    if analysis.get("parse_error"):
        logger.warning("Falls risk analysis parse failed, using arithmetic fallback")
        analysis = _falls_risk_fallback(resident, notes, medications)
    
    analysis["score"] = max(0, min(100, int(analysis.get("score", 0))))
    analysis["confidence"] = max(0, min(1, float(analysis.get("confidence", 0.5))))
    
    valid_levels = ("low", "medium", "high", "very_high")
    if analysis.get("risk_level") not in valid_levels:
        analysis["risk_level"] = _score_to_risk_level(analysis["score"])
    
    analysis["resident_id"] = resident.get("id")
    analysis["assessment_date"] = datetime.now(timezone.utc).isoformat()
    analysis["ai_provider"] = result.provider
    analysis["ai_model"] = result.model
    analysis["fallback_used"] = result.fallback_used
    
    return analysis


def _build_falls_context(
    resident: dict[str, Any],
    notes: list[dict[str, Any]] | None,
    medications: list[dict[str, Any]] | None,
    incidents: list[dict[str, Any]] | None,
    environment: dict[str, Any] | None,
) -> str:
    """Build falls-specific context."""
    ctx = ""
    
    if notes:
        recent = notes[-7:]
        mobility_notes = [n for n in recent if "mobil" in n.get("summary", "").lower()]
        if mobility_notes:
            ctx += "Recent Mobility Notes:\n"
            for n in mobility_notes:
                ctx += f"- [{n.get('created_at', 'unknown')}] {n.get('summary', 'N/A')}\n"
    
    if medications:
        ctx += "\nMedications (falls-relevant):\n"
        risk_meds = ["benzodiazepine", "zopiclone", "zolpidem", "tramadol", "morphine",
                     "amitriptyline", "gabapentin", "pregabalin", "codeine", "diazepam",
                     "lorazepam", "temazepam", "haloperidol", "risperidone", "quetiapine"]
        for med in medications:
            med_name = med.get("name", "").lower()
            if any(rm in med_name for rm in risk_meds):
                ctx += f"- {med.get('name', 'unknown')} FALLS RISK\n"
            else:
                ctx += f"- {med.get('name', 'unknown')}\n"
    
    if incidents:
        falls = [i for i in incidents if "fall" in i.get("type", "").lower()]
        if falls:
            ctx += f"\nPrevious Falls ({len(falls)} in last 90 days):\n"
            for f in falls:
                ctx += f"- [{f.get('occurred_at', 'unknown')}] {f.get('description', 'N/A')[:100]}\n"
    
    if environment:
        ctx += f"\nEnvironment:\n"
        ctx += f"- Bed rails: {environment.get('bed_rails', 'unknown')}\n"
        ctx += f"- Non-slip socks: {environment.get('non_slip_socks', 'unknown')}\n"
        ctx += f"- Call bell accessible: {environment.get('call_bell', 'unknown')}\n"
        ctx += f"- Lighting: {environment.get('lighting', 'unknown')}\n"
        ctx += f"- Floor condition: {environment.get('floor', 'unknown')}\n"
    
    return ctx


def _falls_risk_fallback(
    resident: dict[str, Any],
    notes: list[dict[str, Any]] | None,
    medications: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    """Arithmetic fallback for falls risk when LLM fails."""
    score = 15
    factors = []
    
    falls_90d = resident.get("falls_last_90_days", 0)
    if falls_90d > 0:
        score += min(falls_90d * 15, 45)
        factors.append({"factor": "Recent falls", "weight": "high", "details": f"{falls_90d} fall(s) in 90 days"})
    
    mobility = str(resident.get("mobility", "")).lower()
    if "frame" in mobility or "walker" in mobility:
        score += 15
        factors.append({"factor": "Walking aid", "weight": "medium", "details": mobility})
    elif "hoist" in mobility or "wheelchair" in mobility:
        score += 10
        factors.append({"factor": "Limited mobility", "weight": "medium", "details": mobility})
    elif "independent" in mobility:
        score += 0
        factors.append({"factor": "Independent mobility", "weight": "low", "details": mobility})
    else:
        score += 10
        factors.append({"factor": "Mobility assistance needed", "weight": "medium", "details": mobility})
    
    if resident.get("confusion") or "confus" in str(resident.get("primary_need", "")).lower():
        score += 20
        factors.append({"factor": "Cognitive impairment", "weight": "high", "details": "Confusion/dementia present"})
    
    if medications:
        risk_meds = ["benzodiazepine", "zopiclone", "zolpidem", "tramadol", "morphine",
                     "amitriptyline", "gabapentin", "pregabalin", "diazepam", "lorazepam"]
        med_count = len(medications)
        risk_count = sum(1 for med in medications 
                        if any(rm in med.get("name", "").lower() for rm in risk_meds))
        
        if med_count >= 8:
            score += 10
            factors.append({"factor": "Polypharmacy", "weight": "medium", "details": f"{med_count} medications"})
        
        if risk_count > 0:
            score += risk_count * 10
            factors.append({"factor": "High-risk medications", "weight": "high", 
                          "details": f"{risk_count} falls-risk medication(s)"})
    
    if resident.get("night_wandering"):
        score += 15
        factors.append({"factor": "Night wandering", "weight": "high", "details": "Wandering at night observed"})
    
    if notes:
        recent = " ".join([n.get("summary", "") for n in notes[-3:]]).lower()
        if any(term in recent for term in ["infection", "antibiotic", "temperature", "unwell"]):
            score += 10
            factors.append({"factor": "Recent infection", "weight": "medium", "details": "Infection may affect mobility/strength"})
    
    score = min(score, 100)
    
    if not factors:
        factors.append({"factor": "No elevated falls factors", "weight": "low", "details": "Standard precautions apply"})
    
    return {
        "score": score,
        "risk_level": _score_to_risk_level(score),
        "confidence": 0.6,
        "factors": factors,
        "new_since_yesterday": False,
        "preventive_interventions": _generate_falls_interventions(score, factors),
        "environmental_recommendations": ["Ensure call bell within reach", "Check lighting at night"],
        "medication_review_needed": score >= 50,
        "review_care_plan": score >= 40,
        "explanation": f"Arithmetic fallback: score based on {len(factors)} risk factors.",
        "_fallback": True,
    }


def _score_to_risk_level(score: int) -> str:
    """Convert score to risk level."""
    if score < 25:
        return "low"
    elif score < 50:
        return "medium"
    elif score < 75:
        return "high"
    else:
        return "very_high"


def _generate_falls_interventions(score: int, factors: list[dict]) -> list[str]:
    """Generate specific falls prevention interventions."""
    interventions = []
    
    if score >= 75:
        interventions.extend([
            "1:1 supervision during high-risk periods",
            "Bed alarm or sensor mat",
            "Review all sedating medications with GP",
            "Consider hip protectors",
        ])
    elif score >= 50:
        interventions.extend([
            "Regular checks every 15-30 minutes",
            "Non-slip footwear at all times",
            "Ensure walking aid within reach",
            "Review medications for falls risk",
        ])
    elif score >= 25:
        interventions.extend([
            "Encourage use of call bell",
            "Clear pathways, remove trip hazards",
            "Regular toileting schedule",
            "Supervision during transfers",
        ])
    else:
        interventions.extend([
            "Maintain active lifestyle",
            "Regular strength and balance exercises",
            "Annual vision check",
        ])
    
    factor_names = [f["factor"] for f in factors]
    if "Night wandering" in factor_names:
        interventions.append("Night-time supervision or monitoring")
    if "Cognitive impairment" in factor_names:
        interventions.append("Orient to environment regularly, familiar objects")
    if "Recent falls" in factor_names:
        interventions.append("Post-fall assessment to identify cause")
    if "Polypharmacy" in factor_names or "High-risk medications" in factor_names:
        interventions.append("Medication review with pharmacist")
    
    return interventions


# 4. Family Update Generator (Claude Sonnet)

async def generate_family_update(
    resident: dict[str, Any],
    note_summary: str,
    recent_activities: list[str] | None = None,
    mood: str | None = None,
) -> dict[str, Any]:
    """Generate a warm, plain-English family update using Claude Sonnet."""
    prompt = f"""Write a warm, reassuring family update for {resident.get('name', 'your loved one')}.

Today's care note summary: {note_summary}

Recent activities: {', '.join(recent_activities or [])}
Observed mood: {mood or 'positive and engaged'}

Resident preferences: {resident.get('preferences', 'enjoys social interaction and familiar routines')}

Write 2-4 sentences that:
1. Start with a warm greeting
2. Mention something specific and positive from today
3. Use the resident's preferred name
4. Include NO clinical terminology (no medications, no medical observations, no diagnoses)
5. End with reassurance

Example good update:
"Margaret had a lovely morning today. She really enjoyed the music session and was tapping her foot along to the songs. She ate well at lunch and seemed very content. The team will keep you updated."

Example bad update (DO NOT WRITE LIKE THIS):
"Patient tolerated personal care. Bowels opened. No PRN required. Skin intact."

Write the update now:"""

    result = await complete(
        task_type=TaskType.FAMILY_UPDATE,
        prompt=prompt,
        system=FAMILY_UPDATE_SYSTEM_PROMPT,
    )
    
    update = result.text.strip()
    update = _sanitise_family_update(update)
    
    return {
        "update_text": update,
        "resident_id": resident.get("id"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "ai_provider": result.provider,
        "ai_model": result.model,
        "fallback_used": result.fallback_used,
    }


def _sanitise_family_update(text: str) -> str:
    """Remove clinical terms from family update."""
    clinical_terms = [
        "medication", "tablet", "dose", "mg", "prescription", "PRN",
        "diagnosis", "condition", "disease", "treatment", "therapy",
        "blood pressure", "temperature", "pulse", "heart rate",
        "incontinence", "catheter", "wound", "ulcer", "dressing",
        "dementia", "alzheimer", "stroke", "diabetes", "parkinson",
        "falls risk", "pressure area", "waterlow", "NEWS2",
    ]
    
    for term in clinical_terms:
        text = text.replace(term, "[health matter]")
        text = text.replace(term.capitalize(), "[health matter]")
    
    return text


# 5. Handover Generator (Claude Sonnet)

async def generate_handover(
    outgoing_shift_notes: list[dict[str, Any]],
    current_alerts: list[dict[str, Any]] | None = None,
    upcoming_medications: list[dict[str, Any]] | None = None,
    residents: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generate AI shift handover from outgoing shift notes."""
    notes_summary = "\n".join([
        f"- [{n.get('resident', 'Unknown')}] {n.get('type', 'general')}: {n.get('summary', 'N/A')}"
        for n in outgoing_shift_notes[-20:]
    ])
    
    alerts_summary = ""
    if current_alerts:
        alerts_summary = "\n".join([
            f"- [{a.get('resident_name', 'Unknown')}] {a.get('alert_type', 'Alert')}: {a.get('message', 'N/A')}"
            for a in current_alerts
        ])
    
    meds_summary = ""
    if upcoming_medications:
        meds_summary = "\n".join([
            f"- {m.get('resident_name', 'Unknown')}: {m.get('medication', 'N/A')} at {m.get('scheduled_time', 'N/A')}"
            for m in upcoming_medications[:10]
        ])
    
    prompt = f"""Generate a shift handover summary for the incoming care team.

OUTGOING SHIFT NOTES:
{notes_summary}

ACTIVE ALERTS:
{alerts_summary or "No active alerts"}

UPCOMING MEDICATIONS (next 4 hours):
{meds_summary or "No upcoming medications"}

Respond with JSON:
{{
    "shift_period": "[e.g., 'Morning to Afternoon']",
    "summary": "[2-3 sentence overview of the shift]",
    "priorities": [
        {{"priority": 1, "resident": "name", "issue": "concern", "action_required": "what incoming team must do"}}
    ],
    "concerns": [
        {{"resident": "name", "concern": "description", "escalated_to": "who was informed"}}
    ],
    "medication_notes": [
        {{"resident": "name", "note": "specific instruction"}}
    ],
    "outstanding_actions": [
        {{"action": "description", "owner": "who should do it", "deadline": "when"}}
    ],
    "positive_notes": [
        "[something positive from the shift]"
    ],
    "general_reminders": [
        "[reminders for incoming team]"
    ]
}}

Priorities should be ordered by clinical urgency (safeguarding > deterioration > missed meds > routine).
Be specific -- name residents and exact actions needed."""

    result = await complete(
        task_type=TaskType.CARE_NOTE,
        prompt=prompt,
        system=HANDOVER_SYSTEM_PROMPT,
    )
    
    handover = _parse_json_safely(result.text)
    
    if handover.get("parse_error"):
        logger.warning("Handover generation parse failed, using fallback")
        handover = _handover_fallback(outgoing_shift_notes, current_alerts)
    
    handover["generated_at"] = datetime.now(timezone.utc).isoformat()
    handover["ai_provider"] = result.provider
    handover["ai_model"] = result.model
    handover["fallback_used"] = result.fallback_used
    
    return handover


def _handover_fallback(
    notes: list[dict[str, Any]],
    alerts: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    """Fallback handover when LLM fails."""
    flagged = [n for n in notes if n.get("route") in ("SOFT_FLAG", "HARD_FLAG", "SAFEGUARDING")]
    
    priorities = []
    for i, note in enumerate(flagged[:5], 1):
        priorities.append({
            "priority": i,
            "resident": note.get("resident", "Unknown"),
            "issue": note.get("summary", "Flagged note")[:100],
            "action_required": "Review flagged note and follow care plan",
        })
    
    if alerts:
        for i, alert in enumerate(alerts[:3], len(priorities) + 1):
            priorities.append({
                "priority": i,
                "resident": alert.get("resident_name", "Unknown"),
                "issue": alert.get("message", "Active alert"),
                "action_required": "Acknowledge alert and follow protocol",
            })
    
    if not priorities:
        priorities.append({
            "priority": 1,
            "resident": "All residents",
            "issue": "Routine handover",
            "action_required": "Continue care plan as documented",
        })
    
    return {
        "shift_period": "Shift handover",
        "summary": f"Shift completed with {len(notes)} notes recorded. {len(flagged)} flagged for review.",
        "priorities": priorities,
        "concerns": [{"resident": n.get("resident", "Unknown"), "concern": n.get("summary", "N/A")[:100], 
                      "escalated_to": "Senior on duty"} for n in flagged],
        "medication_notes": [],
        "outstanding_actions": [],
        "positive_notes": ["Shift completed successfully"],
        "general_reminders": ["Check all residents are comfortable", "Verify MAR entries"],
        "_fallback": True,
    }


# 6. CQC Pack Generator (GPT-4o)

async def generate_inspection_pack(
    home_id: str,
    home_name: str,
    evidence_summary: dict[str, Any],
) -> dict[str, Any]:
    """Generate a CQC inspection readiness pack using GPT-4o."""
    prompt = f"""Generate a CQC inspection pack for {home_name}.

Evidence Summary:
{json.dumps(evidence_summary, indent=2, default=str)[:4000]}

CQC Single Assessment Framework -- 5 Key Questions, 34 Quality Statements:

SAFE (S1-S9):
- S1: Safeguarding people from abuse
- S2: Protection from discrimination
- S3: Safe environment, premises, equipment
- S4: Safe use of medicines
- S5: Infection prevention and control
- S6: Safe and effective staffing
- S7: Learning culture
- S8: Medicines optimisation
- S9: Consent to care and treatment

EFFECTIVE (E1-E6):
- E1: Assessing needs
- E2: Delivering evidence-based care
- E3: Consent
- E4: Nutritional support
- E5: Coordinated care
- E6: Staff competency

CARING (C1-C5):
- C1: Kindness, dignity, compassion
- C2: Privacy
- C3: Involving people
- C4: Responding to concerns
- C5: Emotional support

RESPONSIVE (R1-R7):
- R1: Person-centred care
- R2: Timely access
- R3: Information accessibility
- R4: Listening to concerns
- R5: Equity in outcomes
- R6: End of life care
- R7: Complaint handling

WELL-LED (W1-W7):
- W1: Leadership capacity
- W2: Vision and strategy
- W3: Governance
- W4: Engagement
- W5: Learning culture
- W6: Sustainability
- W7: Partnerships

Respond with JSON:
{{
    "home_id": "{home_id}",
    "home_name": "{home_name}",
    "generated_at": "[ISO datetime]",
    "overall_readiness": "Outstanding" | "Good" | "Requires Improvement" | "Inadequate",
    "confidence": 0.0-1.0,
    "key_questions": {{
        "safe": {{"score": 0-100, "strengths": ["..."], "risks": ["..."], "evidence_count": 0}},
        "effective": {{"score": 0-100, "strengths": ["..."], "risks": ["..."], "evidence_count": 0}},
        "caring": {{"score": 0-100, "strengths": ["..."], "risks": ["..."], "evidence_count": 0}},
        "responsive": {{"score": 0-100, "strengths": ["..."], "risks": ["..."], "evidence_count": 0}},
        "well_led": {{"score": 0-100, "strengths": ["..."], "risks": ["..."], "evidence_count": 0}}
    }},
    "priority_actions": [
        {{"action": "...", "owner": "...", "deadline": "...", "impact": "high/medium/low"}}
    ],
    "strengths_summary": "[2-3 sentences]",
    "risks_summary": "[2-3 sentences]",
    "estimated_rating": "[likely CQC rating]",
    "missing_evidence": ["[QS codes with no evidence]"]
}}

Be honest and constructive. If evidence is weak, say so clearly."""

    result = await complete(
        task_type=TaskType.CQC_PACK,
        prompt=prompt,
        system=CQC_SYSTEM_PROMPT,
    )
    
    pack = _parse_json_safely(result.text)
    
    if pack.get("parse_error"):
        logger.warning("CQC pack generation parse failed, using fallback")
        pack = _cqc_pack_fallback(home_id, home_name, evidence_summary)
    
    pack["home_id"] = home_id
    pack["home_name"] = home_name
    pack["generated_at"] = datetime.now(timezone.utc).isoformat()
    pack["ai_provider"] = result.provider
    pack["ai_model"] = result.model
    pack["fallback_used"] = result.fallback_used
    
    return pack


def _cqc_pack_fallback(
    home_id: str,
    home_name: str,
    evidence_summary: dict[str, Any],
) -> dict[str, Any]:
    """Fallback CQC pack when LLM fails."""
    kq_scores = {}
    for kq in ("safe", "effective", "caring", "responsive", "well_led"):
        evidence = evidence_summary.get(kq, {})
        count = evidence.get("evidence_count", 0) if isinstance(evidence, dict) else 0
        kq_scores[kq] = {
            "score": min(count * 5, 100),
            "strengths": evidence.get("strengths", ["Evidence being collected"]) if isinstance(evidence, dict) else ["Evidence being collected"],
            "risks": evidence.get("risks", ["Continue building evidence"]) if isinstance(evidence, dict) else ["Continue building evidence"],
            "evidence_count": count,
        }
    
    avg_score = sum(kq_scores[kq]["score"] for kq in kq_scores) / len(kq_scores) if kq_scores else 50
    rating = "Good" if avg_score >= 70 else "Requires Improvement" if avg_score >= 50 else "Inadequate"
    
    return {
        "home_id": home_id,
        "home_name": home_name,
        "overall_readiness": rating,
        "confidence": 0.5,
        "key_questions": kq_scores,
        "priority_actions": [
            {"action": "Continue building evidence across all Quality Statements", "owner": "Registered Manager", "deadline": "Ongoing", "impact": "high"},
        ],
        "strengths_summary": "Evidence collection is ongoing.",
        "risks_summary": "Some Quality Statements may have limited evidence.",
        "estimated_rating": rating,
        "missing_evidence": [],
        "_fallback": True,
    }


# 7. Mock Inspection (Claude Sonnet)

async def run_mock_inspection(
    home_id: str,
    home_name: str,
    evidence_summary: dict[str, Any],
) -> dict[str, Any]:
    """Run a mock CQC inspection using Claude Sonnet."""
    prompt = f"""Conduct a mock CQC inspection for {home_name}.

Current Evidence:
{json.dumps(evidence_summary, indent=2, default=str)[:4000]}

You are an experienced CQC inspector. Read all the evidence and produce a candid mock inspection report.

Respond with JSON:
{{
    "home_id": "{home_id}",
    "home_name": "{home_name}",
    "inspection_date": "[today's date]",
    "overall_rating": "Outstanding" | "Good" | "Requires Improvement" | "Inadequate",
    "key_question_ratings": {{
        "safe": "rating",
        "effective": "rating",
        "caring": "rating",
        "responsive": "rating",
        "well_led": "rating"
    }},
    "strengths": [
        {{"area": "...", "evidence": "...", "quality_statement": "S1/E1/etc"}}
    ],
    "risks": [
        {{"area": "...", "concern": "...", "quality_statement": "S1/E1/etc", "urgency": "immediate/soon/routine"}}
    ],
    "priority_actions": [
        {{"action": "...", "owner": "...", "timescale": "...", "qs_impact": "..."}}
    ],
    "inspector_notes": "[candid observations, 3-4 sentences]",
    "likely_enforcement": "none" | "warning_notice" | "action_plan" | "prosecution",
    "confidence": 0.0-1.0
}}

Be honest but constructive. This is for improvement, not punishment.
If there are gaps, identify them clearly with specific actions needed.
Reference specific Quality Statements where relevant."""

    result = await complete(
        task_type=TaskType.CQC_PACK,
        prompt=prompt,
        system=MOCK_INSPECTION_SYSTEM_PROMPT,
    )
    
    inspection = _parse_json_safely(result.text)
    
    if inspection.get("parse_error"):
        logger.warning("Mock inspection parse failed, using fallback")
        inspection = _mock_inspection_fallback(home_id, home_name, evidence_summary)
    
    inspection["home_id"] = home_id
    inspection["home_name"] = home_name
    inspection["inspection_date"] = datetime.now(timezone.utc).isoformat()
    inspection["ai_provider"] = result.provider
    inspection["ai_model"] = result.model
    inspection["fallback_used"] = result.fallback_used
    
    return inspection


def _mock_inspection_fallback(
    home_id: str,
    home_name: str,
    evidence_summary: dict[str, Any],
) -> dict[str, Any]:
    """Fallback mock inspection when LLM fails."""
    scores = {}
    for kq in ("safe", "effective", "caring", "responsive", "well_led"):
        evidence = evidence_summary.get(kq, {})
        count = evidence.get("evidence_count", 0) if isinstance(evidence, dict) else 0
        scores[kq] = "Good" if count > 10 else "Requires Improvement" if count > 5 else "Inadequate"
    
    return {
        "home_id": home_id,
        "home_name": home_name,
        "inspection_date": datetime.now(timezone.utc).isoformat(),
        "overall_rating": "Good",
        "key_question_ratings": scores,
        "strengths": [{"area": "Evidence collection", "evidence": "Systematic recording in progress", "quality_statement": "W3"}],
        "risks": [{"area": "Evidence depth", "concern": "Some areas may need more evidence", "quality_statement": "W5", "urgency": "routine"}],
        "priority_actions": [{"action": "Continue systematic evidence collection", "owner": "Registered Manager", "timescale": "Ongoing", "qs_impact": "All"}],
        "inspector_notes": "Evidence collection is systematic. Continue building depth across all Quality Statements.",
        "likely_enforcement": "none",
        "confidence": 0.5,
        "_fallback": True,
    }


# 8. Rota Optimiser (GPT-4o mini)

async def generate_optimal_rota(
    home_id: str,
    shift_date: str,
    shift_type: str,
    staff_pool: list[dict[str, Any]],
    resident_dependencies: dict[str, int],
    required_roles: list[str],
) -> dict[str, Any]:
    """Generate an optimal rota using GPT-4o mini constraint-solving."""
    total_dependency = sum(resident_dependencies.values())
    avg_dependency = total_dependency / len(resident_dependencies) if resident_dependencies else 0
    
    staff_summary = "\n".join([
        f"- {s.get('name', 'Unknown')}: Role={s.get('role', 'unknown')}, "
        f"Quals={', '.join(s.get('qualifications', []))}, "
        f"Hours this week={s.get('hours_this_week', 0)}, "
        f"Preferred={s.get('preferred_shifts', 'any')}, "
        f"Available={s.get('available', True)}"
        for s in staff_pool
    ])
    
    prompt = f"""Generate an optimal care home rota for {shift_date} ({shift_type} shift).

STAFF POOL:
{staff_summary}

RESIDENT DEPENDENCY:
- Total residents: {len(resident_dependencies)}
- Total dependency load: {total_dependency}
- Average dependency: {avg_dependency:.1f}/100
- High dependency residents (>=70): {sum(1 for d in resident_dependencies.values() if d >= 70)}

REQUIRED ROLES: {', '.join(required_roles)}

CONSTRAINTS:
1. Working Time Regulations: max 48 hours/week, 11-hour rest between shifts
2. Continuity: same key workers where possible
3. Skill mix: senior staff for high-dependency residents
4. Agency brief needed if gaps cannot be filled internally

Respond with JSON:
{{
    "home_id": "{home_id}",
    "shift_date": "{shift_date}",
    "shift_type": "{shift_type}",
    "assignments": [
        {{"staff_id": "...", "staff_name": "...", "role": "...", "residents_assigned": ["..."], "reason": "..."}}
    ],
    "coverage_status": "full" | "partial" | "gap",
    "gaps": [{{"role": "...", "reason": "..."}}],
    "agency_brief": {{"needed": true/false, "roles_needed": ["..."], "qualifications": "...", "shift_hours": "..."}},
    "wtr_compliance": "compliant" | "warning" | "breach",
    "continuity_score": 0-100,
    "skill_mix_score": 0-100,
    "explanation": "reasoning for assignments"
}}

Be specific about which residents each staff member is assigned to.
Flag any WTR compliance issues clearly."""

    result = await complete(
        task_type=TaskType.STAFF_REPORT,
        prompt=prompt,
        system=ROTA_SYSTEM_PROMPT,
    )
    
    rota = _parse_json_safely(result.text)
    
    if rota.get("parse_error"):
        logger.warning("Rota generation parse failed, using fallback")
        rota = _rota_fallback(home_id, shift_date, shift_type, staff_pool, required_roles)
    
    rota["home_id"] = home_id
    rota["shift_date"] = shift_date
    rota["shift_type"] = shift_type
    rota["generated_at"] = datetime.now(timezone.utc).isoformat()
    rota["ai_provider"] = result.provider
    rota["ai_model"] = result.model
    rota["fallback_used"] = result.fallback_used
    
    return rota


def _rota_fallback(
    home_id: str,
    shift_date: str,
    shift_type: str,
    staff_pool: list[dict[str, Any]],
    required_roles: list[str],
) -> dict[str, Any]:
    """Fallback rota when LLM fails."""
    available_staff = [s for s in staff_pool if s.get("available", True)]
    covered_roles = set()
    assignments = []
    
    for staff in available_staff:
        role = staff.get("role", "")
        if role in required_roles:
            covered_roles.add(role)
            assignments.append({
                "staff_id": staff.get("id", "unknown"),
                "staff_name": staff.get("name", "Unknown"),
                "role": role,
                "residents_assigned": [],
                "reason": "Role match",
            })
    
    gaps = [{"role": r, "reason": "No available staff with this role"} 
            for r in required_roles if r not in covered_roles]
    
    return {
        "home_id": home_id,
        "shift_date": shift_date,
        "shift_type": shift_type,
        "assignments": assignments,
        "coverage_status": "full" if not gaps else "gap",
        "gaps": gaps,
        "agency_brief": {
            "needed": bool(gaps),
            "roles_needed": [g["role"] for g in gaps],
            "qualifications": "See gap list",
            "shift_hours": "Standard shift",
        },
        "wtr_compliance": "compliant",
        "continuity_score": 50,
        "skill_mix_score": 50,
        "explanation": "Fallback assignment based on role matching.",
        "_fallback": True,
    }


# 9. Activity Recommender (Claude Sonnet)

async def recommend_activities(
    resident: dict[str, Any],
    care_plan: dict[str, Any] | None = None,
    recent_activities: list[dict[str, Any]] | None = None,
    current_mood: str | None = None,
    weather: str | None = None,
    day_of_week: str | None = None,
) -> dict[str, Any]:
    """Generate personalised activity recommendations using Claude Sonnet."""
    interests = resident.get("interests", [])
    abilities = resident.get("abilities", [])
    limitations = resident.get("limitations", [])
    
    prompt = f"""Recommend personalised activities for {resident.get('name', 'this resident')}.

Resident Profile:
- Age: {resident.get('age', 'unknown')}
- Primary need: {resident.get('primary_need', 'unknown')}
- Interests: {', '.join(interests) if interests else 'Not specified'}
- Abilities: {', '.join(abilities) if abilities else 'Not specified'}
- Limitations: {', '.join(limitations) if limitations else 'None recorded'}
- Mobility: {resident.get('mobility', 'unknown')}
- Current mood: {current_mood or 'unknown'}

Care Plan Goals: {care_plan.get('goals', 'Not specified') if care_plan else 'Not specified'}

Recent Activities: {', '.join([a.get('name', 'unknown') for a in (recent_activities or [])[-5:]])}

Context: {weather or 'Indoor'} weather, {day_of_week or 'today'}

Respond with JSON:
{{
    "resident_id": "{resident.get('id', 'unknown')}",
    "recommendations": [
        {{
            "activity": "name of activity",
            "type": "sensory" | "cognitive" | "physical" | "social" | "reminiscence" | "creative",
            "duration_minutes": 15-60,
            "adaptations": ["for their specific needs"],
            "materials_needed": ["..."],
            "staff_support_level": "independent" | "supervised" | "1:1" | "hoist_assist",
            "expected_benefits": ["physical", "cognitive", "emotional", "social"],
            "rationale": "why this activity suits this resident"
        }}
    ],
    "group_activity_suggestions": ["activities they could do with others"],
    "one_to_one_suggestions": ["activities for individual attention"],
    "outdoor_options": ["if weather permits"],
    "evening_calm_activities": ["for wind-down time"],
    "notes_for_staff": "specific instructions"
}}

Recommend 3-5 activities. Consider their interests, abilities, and current mood.
Suggest adaptations for any limitations. Include both group and one-to-one options."""

    result = await complete(
        task_type=TaskType.CARE_PLAN,
        prompt=prompt,
        system=ACTIVITY_SYSTEM_PROMPT,
    )
    
    recommendations = _parse_json_safely(result.text)
    
    if recommendations.get("parse_error"):
        logger.warning("Activity recommendation parse failed, using fallback")
        recommendations = _activity_fallback(resident)
    
    recommendations["resident_id"] = resident.get("id")
    recommendations["generated_at"] = datetime.now(timezone.utc).isoformat()
    recommendations["ai_provider"] = result.provider
    recommendations["ai_model"] = result.model
    recommendations["fallback_used"] = result.fallback_used
    
    return recommendations


def _activity_fallback(resident: dict[str, Any]) -> dict[str, Any]:
    """Fallback activity recommendations."""
    interests = {str(i).lower() for i in resident.get("interests", [])}
    mobility = str(resident.get("mobility", "")).lower()
    
    recommendations = []
    
    if "music" in interests:
        recommendations.append({
            "activity": "Music listening or sing-along",
            "type": "sensory",
            "duration_minutes": 30,
            "adaptations": ["Use familiar songs from their era", "Keep volume comfortable"],
            "materials_needed": ["Music player", "Headphones if preferred"],
            "staff_support_level": "supervised",
            "expected_benefits": ["emotional", "cognitive"],
            "rationale": "Music is personally meaningful and can improve mood",
        })
    
    if "gardening" in interests and "hoist" not in mobility:
        recommendations.append({
            "activity": "Garden walk or indoor planting",
            "type": "physical",
            "duration_minutes": 20,
            "adaptations": ["Use raised planters if bending is difficult", "Supervise walking"],
            "materials_needed": ["Plants", "Soil", "Watering can"],
            "staff_support_level": "supervised",
            "expected_benefits": ["physical", "sensory", "emotional"],
            "rationale": "Connects to lifelong interest in nature",
        })
    
    if "reading" in interests:
        recommendations.append({
            "activity": "Reading aloud or audiobook",
            "type": "cognitive",
            "duration_minutes": 20,
            "adaptations": ["Large print books", "Good lighting", "Audiobooks if vision impaired"],
            "materials_needed": ["Books", "Reading glasses"],
            "staff_support_level": "supervised",
            "expected_benefits": ["cognitive", "emotional"],
            "rationale": "Stimulates cognitive engagement and provides relaxation",
        })
    
    if not recommendations:
        recommendations.extend([
            {
                "activity": "One-to-one reminiscence conversation",
                "type": "reminiscence",
                "duration_minutes": 15,
                "adaptations": ["Use memory prompts (photos, objects)", "Follow their lead"],
                "materials_needed": ["Photo albums", "Memory box"],
                "staff_support_level": "1:1",
                "expected_benefits": ["emotional", "cognitive", "social"],
                "rationale": "Personal connection and cognitive stimulation",
            },
            {
                "activity": "Gentle hand massage",
                "type": "sensory",
                "duration_minutes": 10,
                "adaptations": ["Use unscented lotion if sensitive", "Check for skin integrity first"],
                "materials_needed": ["Hand lotion", "Warm towel"],
                "staff_support_level": "1:1",
                "expected_benefits": ["physical", "emotional"],
                "rationale": "Provides comfort and sensory stimulation",
            },
        ])
    
    return {
        "recommendations": recommendations,
        "group_activity_suggestions": ["Morning coffee social", "Afternoon tea with music"],
        "one_to_one_suggestions": ["Reminiscence conversation", "Hand massage", "Looking at photos"],
        "outdoor_options": ["Garden walk", "Bird watching"] if "hoist" not in mobility else ["Window bird watching"],
        "evening_calm_activities": ["Gentle music", "Hand massage", "Looking at photo albums"],
        "notes_for_staff": "Follow resident's lead. Stop if they show signs of fatigue or distress.",
        "_fallback": True,
    }


# 10. Care Plan Generator (Claude Sonnet)

async def generate_care_plan(
    resident: dict[str, Any],
    assessment_data: dict[str, Any],
    existing_plan: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate an AI-assisted care plan draft using Claude Sonnet."""
    prompt = f"""Generate a person-centred care plan draft for {resident.get('name', 'this resident')}.

RESIDENT PROFILE:
- Name: {resident.get('name', 'unknown')}
- Age: {resident.get('age', 'unknown')}
- Preferred name: {resident.get('preferred_name', resident.get('name', 'unknown'))}
- Primary need: {resident.get('primary_need', 'unknown')}
- Mobility: {resident.get('mobility', 'unknown')}
- Communication: {resident.get('communication', 'unknown')}
- Cognitive status: {resident.get('cognitive_status', 'unknown')}
- Dietary needs: {resident.get('dietary', 'unknown')}
- Religious/cultural needs: {resident.get('religious_cultural', 'none specified')}
- Next of kin: {resident.get('family_contact', 'unknown')}

ASSESSMENT DATA:
{json.dumps(assessment_data, indent=2, default=str)[:2000]}

{"CURRENT CARE PLAN (for update):" + json.dumps(existing_plan, indent=2, default=str)[:1000] if existing_plan else "This is a new care plan."}

Respond with JSON:
{{
    "resident_id": "{resident.get('id', 'unknown')}",
    "plan_type": "initial" | "review" | "emergency",
    "domains": [
        {{
            "domain": "personal_care" | "nutrition" | "mobility" | "cognition" | "communication" | "social" | "end_of_life",
            "goals": ["SMART goal 1", "SMART goal 2"],
            "interventions": [
                {{
                    "action": "specific intervention",
                    "frequency": "how often",
                    "responsible_role": "who does it",
                    "outcome_measures": ["how we know it worked"]
                }}
            ],
            "risks": ["identified risks"],
            "risk_mitigations": ["how we reduce risks"]
        }}
    ],
    "preferences": {{
        "likes": ["..."],
        "dislikes": ["..."],
        "routine": "...",
        "sleep_preferences": "...",
        "bathing_preferences": "..."
    }},
    "review_schedule": "weekly/monthly/quarterly",
    "next_review_date": "YYYY-MM-DD",
    "author": "AI-assisted draft",
    "manager_approval_required": true,
    "notes": "specific considerations"
}}

Use SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound).
Link to NICE guidelines where relevant.
Consider MCA and DoLS if cognitive impairment present.
NEVER auto-publish -- this is a draft for manager review."""

    result = await complete(
        task_type=TaskType.CARE_PLAN,
        prompt=prompt,
        system=CARE_PLAN_SYSTEM_PROMPT,
    )
    
    plan = _parse_json_safely(result.text)
    
    if plan.get("parse_error"):
        logger.warning("Care plan generation parse failed, using fallback")
        plan = _care_plan_fallback(resident, assessment_data)
    
    plan["resident_id"] = resident.get("id")
    plan["generated_at"] = datetime.now(timezone.utc).isoformat()
    plan["ai_provider"] = result.provider
    plan["ai_model"] = result.model
    plan["fallback_used"] = result.fallback_used
    plan["manager_approval_required"] = True
    
    return plan


def _care_plan_fallback(
    resident: dict[str, Any],
    assessment_data: dict[str, Any],
) -> dict[str, Any]:
    """Fallback care plan when LLM fails."""
    primary_need = resident.get("primary_need", "unknown").lower()
    
    domains = []
    
    domains.append({
        "domain": "personal_care",
        "goals": ["Maintain dignity and privacy during personal care", "Support independence where possible"],
        "interventions": [
            {"action": "Offer choices for bathing/showering", "frequency": "Daily", "responsible_role": "Carer", "outcome_measures": ["Resident expresses preference"]},
            {"action": "Check skin integrity during care", "frequency": "Daily", "responsible_role": "Carer", "outcome_measures": ["No pressure damage"]},
        ],
        "risks": ["Skin breakdown", "Loss of dignity"],
        "risk_mitigations": ["Regular repositioning", "Privacy curtains", "Gentle handling"],
    })
    
    domains.append({
        "domain": "nutrition",
        "goals": ["Maintain adequate nutrition and hydration", "Enjoy mealtimes"],
        "interventions": [
            {"action": "Offer fortified drinks and snacks", "frequency": "3 times daily", "responsible_role": "Carer", "outcome_measures": ["Weight stable"]},
            {"action": "Monitor fluid intake", "frequency": "Daily", "responsible_role": "Carer", "outcome_measures": ["Adequate hydration"]},
        ],
        "risks": ["Malnutrition", "Dehydration"],
        "risk_mitigations": ["MUST screening", "Dietitian referral if needed"],
    })
    
    if "dementia" in primary_need or "stroke" in primary_need or "fracture" in primary_need:
        domains.append({
            "domain": "mobility",
            "goals": ["Maintain maximum mobility", "Prevent falls"],
            "interventions": [
                {"action": "Regular mobilisation with appropriate aid", "frequency": "Daily", "responsible_role": "Carer/Physio", "outcome_measures": ["Maintains current mobility level"]},
                {"action": "Falls risk assessment", "frequency": "Weekly", "responsible_role": "Senior", "outcome_measures": ["Falls risk score documented"]},
            ],
            "risks": ["Falls", "Deconditioning"],
            "risk_mitigations": ["Non-slip footwear", "Call bell within reach", "Supervised transfers"],
        })
    
    if "dementia" in primary_need or "confus" in primary_need:
        domains.append({
            "domain": "cognition",
            "goals": ["Support orientation", "Minimise distress"],
            "interventions": [
                {"action": "Orient to environment regularly", "frequency": "Each interaction", "responsible_role": "All staff", "outcome_measures": ["Reduced agitation"]},
                {"action": "Meaningful activities", "frequency": "Daily", "responsible_role": "Activities coordinator", "outcome_measures": ["Engagement observed"]},
            ],
            "risks": ["Wandering", "Agitation", "Distress"],
            "risk_mitigations": ["Familiar objects", "Consistent staff", "Calm environment"],
        })
    
    return {
        "plan_type": "initial",
        "domains": domains,
        "preferences": {
            "likes": resident.get("likes", []),
            "dislikes": resident.get("dislikes", []),
            "routine": resident.get("routine", "Follow resident's lead"),
            "sleep_preferences": resident.get("sleep_preferences", "Quiet, dim lighting"),
            "bathing_preferences": resident.get("bathing_preferences", "Offer choice"),
        },
        "review_schedule": "monthly",
        "next_review_date": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "author": "AI-assisted draft (fallback)",
        "manager_approval_required": True,
        "notes": "This is a template-based fallback. Manager review and personalisation required.",
        "_fallback": True,
    }


# 11. Incident Analyser (Claude Opus)

async def analyse_incident(
    incident: dict[str, Any],
    related_notes: list[dict[str, Any]] | None = None,
    previous_incidents: list[dict[str, Any]] | None = None,
    resident: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Analyse an incident for root causes and required actions using Claude Opus."""
    context = f"""INCIDENT DETAILS:
- Type: {incident.get('type', 'unknown')}
- Severity: {incident.get('severity', 'unknown')}
- Date/Time: {incident.get('occurred_at', 'unknown')}
- Location: {incident.get('location', 'unknown')}
- Description: {incident.get('description', 'No description')}
- Immediate action taken: {incident.get('immediate_action', 'None recorded')}
- Staff involved: {incident.get('staff_involved', 'Unknown')}
- Resident condition after: {incident.get('resident_condition_after', 'Unknown')}
- Witnesses: {incident.get('witnesses', 'None')}
"""
    
    if related_notes:
        context += "\nRELATED CARE NOTES:\n"
        for note in related_notes[-5:]:
            context += f"- [{note.get('created_at', 'unknown')}] {note.get('summary', 'N/A')}\n"
    
    if previous_incidents:
        context += f"\nPREVIOUS INCIDENTS ({len(previous_incidents)} in last 90 days):\n"
        for prev in previous_incidents[-5:]:
            context += f"- [{prev.get('occurred_at', 'unknown')}] {prev.get('type', 'unknown')}: {prev.get('description', 'N/A')[:100]}\n"
    
    if resident:
        context += f"\nRESIDENT PROFILE:\n"
        context += f"- Name: {resident.get('name', 'unknown')}\n"
        context += f"- Primary need: {resident.get('primary_need', 'unknown')}\n"
        context += f"- Mobility: {resident.get('mobility', 'unknown')}\n"
        context += f"- Falls risk: {resident.get('falls_risk', 'unknown')}\n"
        context += f"- Cognitive status: {resident.get('cognitive_status', 'unknown')}\n"
    
    prompt = f"""Analyse this care home incident for root causes and recommend improvements.

{context}

Respond with JSON:
{{
    "incident_id": "{incident.get('id', 'unknown')}",
    "severity_assessment": {{
        "initial_severity": "{incident.get('severity', 'unknown')}",
        "ai_assessed_severity": "low" | "medium" | "high" | "critical",
        "severity_rationale": "why this severity level"
    }},
    "root_causes": [
        {{"category": "environment" | "staffing" | "equipment" | "training" | "care_plan" | "communication" | "resident_factor", "description": "...", "confidence": 0.0-1.0}}
    ],
    "contributing_factors": ["..."],
    "immediate_actions_required": ["..."],
    "preventive_measures": [
        {{"measure": "...", "owner": "...", "timescale": "...", "resource_needed": "..."}}
    ],
    "training_needed": ["..."],
    "policy_review_needed": true/false,
    "safeguarding_concern": true/false,
    "regulatory_reporting": {{
        "riddor_required": true/false,
        "cqc_notification_required": true/false,
        "la_notification_required": true/false,
        "duty_of_candour_required": true/false
    }},
    "pattern_analysis": "[if previous incidents exist, note patterns]",
    "learning_points": ["..."],
    "review_date": "YYYY-MM-DD"
}}

Consider all possible root causes. Be specific about what needs to change to prevent recurrence.
If this is part of a pattern, highlight that clearly."""

    result = await complete(
        task_type=TaskType.PATTERN_DETECTION,
        prompt=prompt,
        system=INCIDENT_SYSTEM_PROMPT,
    )
    
    analysis = _parse_json_safely(result.text)
    
    if analysis.get("parse_error"):
        logger.warning("Incident analysis parse failed, using fallback")
        analysis = _incident_fallback(incident)
    
    analysis["incident_id"] = incident.get("id")
    analysis["analysed_at"] = datetime.now(timezone.utc).isoformat()
    analysis["ai_provider"] = result.provider
    analysis["ai_model"] = result.model
    analysis["fallback_used"] = result.fallback_used
    
    return analysis


def _incident_fallback(incident: dict[str, Any]) -> dict[str, Any]:
    """Fallback incident analysis."""
    severity = str(incident.get("severity", "medium")).lower()
    incident_type = str(incident.get("type", "")).lower()
    
    requires_manager = severity in ("high", "critical")
    safeguarding = any(term in incident_type for term in ["abuse", "neglect", "assault", "medication error"])
    
    root_causes = [{"category": "care_plan", "description": "Review care plan for this resident", "confidence": 0.6}]
    
    if "fall" in incident_type:
        root_causes.append({"category": "environment", "description": "Check for trip hazards and lighting", "confidence": 0.7})
        root_causes.append({"category": "resident_factor", "description": "Review mobility and falls risk assessment", "confidence": 0.7})
    
    if "medication" in incident_type:
        root_causes.append({"category": "staffing", "description": "Review medication administration procedures", "confidence": 0.8})
        root_causes.append({"category": "training", "description": "Medication training refresher", "confidence": 0.7})
    
    return {
        "severity_assessment": {
            "initial_severity": severity,
            "ai_assessed_severity": severity,
            "severity_rationale": "Based on initial assessment and incident type",
        },
        "root_causes": root_causes,
        "contributing_factors": ["To be determined through investigation"],
        "immediate_actions_required": ["Ensure resident safety", "Document all details", "Inform senior staff"],
        "preventive_measures": [
            {"measure": "Review and update care plan", "owner": "Senior nurse", "timescale": "24 hours", "resource_needed": "Care plan review time"},
        ],
        "training_needed": ["Incident-specific training based on root cause analysis"],
        "policy_review_needed": False,
        "safeguarding_concern": safeguarding,
        "regulatory_reporting": {
            "riddor_required": "fall" in incident_type and severity in ("high", "critical"),
            "cqc_notification_required": severity in ("high", "critical"),
            "la_notification_required": safeguarding,
            "duty_of_candour_required": severity in ("high", "critical"),
        },
        "pattern_analysis": "No previous incidents analysed in fallback mode.",
        "learning_points": ["Complete full investigation", "Update risk assessments", "Review training needs"],
        "review_date": (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d"),
        "_fallback": True,
    }


# 12. Medication Reviewer (GPT-4o)

async def review_medications(
    resident: dict[str, Any],
    medications: list[dict[str, Any]],
    mar_history: list[dict[str, Any]] | None = None,
    recent_notes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Review medications for interactions, deprescribing, and adherence using GPT-4o."""
    med_list = "\n".join([
        f"- {med.get('name', 'unknown')} {med.get('dose', '')} {med.get('frequency', '')} "
        f"(route: {med.get('route', 'unknown')}, start: {med.get('start_date', 'unknown')})"
        for med in medications
    ])
    
    mar_summary = ""
    if mar_history:
        mar_summary = f"\nMAR History (last 30 days):\n"
        recent_mar = mar_history[-30:]
        administered = sum(1 for m in recent_mar if m.get("status") == "administered")
        refused = sum(1 for m in recent_mar if m.get("status") == "refused")
        missed = sum(1 for m in recent_mar if m.get("status") == "missed")
        mar_summary += f"- Administered: {administered}, Refused: {refused}, Missed: {missed}\n"
        mar_summary += f"- Adherence rate: {(administered / len(recent_mar) * 100):.1f}%\n"
    
    prompt = f"""Review the following medication list for a care home resident.

Resident: {resident.get('name', 'unknown')}, Age: {resident.get('age', 'unknown')}
Primary need: {resident.get('primary_need', 'unknown')}

CURRENT MEDICATIONS:
{med_list}

{mar_summary}

Respond with JSON:
{{
    "resident_id": "{resident.get('id', 'unknown')}",
    "medication_count": {len(medications)},
    "interactions": [
        {{"drugs": ["drug1", "drug2"], "severity": "high/medium/low", "mechanism": "...", "recommendation": "..."}}
    ],
    "deprescribing_opportunities": [
        {{"drug": "...", "rationale": "...", "suggested_action": "...", "priority": "high/medium/low"}}
    ],
    "adherence_concerns": [
        {{"drug": "...", "issue": "...", "suggested_action": "..."}}
    ],
    "high_risk_medications": [
        {{"drug": "...", "risk": "...", "monitoring_required": "..."}}
    ],
    "prn_analysis": [
        {{"drug": "...", "frequency_used": "...", "trend": "increasing/stable/decreasing", "concern": true/false}}
    ],
    "recommendations_for_gp": [
        "specific recommendation 1",
        "specific recommendation 2"
    ],
    "review_priority": "urgent" | "routine" | "annual",
    "next_review_date": "YYYY-MM-DD",
    "overall_assessment": "summary of findings"
}}

Reference BNF and NICE guidelines. Flag high-risk combinations clearly.
Consider STOPP/START criteria for older adults."""

    result = await complete(
        task_type=TaskType.MEDICATION_CHECK,
        prompt=prompt,
        system=MEDICATION_SYSTEM_PROMPT,
    )
    
    review = _parse_json_safely(result.text)
    
    if review.get("parse_error"):
        logger.warning("Medication review parse failed, using fallback")
        review = _medication_fallback(resident, medications)
    
    review["resident_id"] = resident.get("id")
    review["review_date"] = datetime.now(timezone.utc).isoformat()
    review["ai_provider"] = result.provider
    review["ai_model"] = result.model
    review["fallback_used"] = result.fallback_used
    
    return review


def _medication_fallback(
    resident: dict[str, Any],
    medications: list[dict[str, Any]],
) -> dict[str, Any]:
    """Fallback medication review when LLM fails."""
    interactions = []
    med_names = [m.get("name", "").lower() for m in medications]
    
    # Check for known interactions
    if any("warfarin" in m for m in med_names) and any("ibuprofen" in m for m in med_names):
        interactions.append({
            "drugs": ["warfarin", "ibuprofen"],
            "severity": "high",
            "mechanism": "Increased bleeding risk (NSAID + anticoagulant)",
            "recommendation": "Consider alternative analgesic. Monitor INR closely.",
        })
    
    if any("ace" in m or "angiotensin" in m for m in med_names) and any("spironolactone" in m for m in med_names):
        interactions.append({
            "drugs": ["ACE inhibitor", "spironolactone"],
            "severity": "high",
            "mechanism": "Risk of hyperkalaemia",
            "recommendation": "Monitor potassium and renal function",
        })
    
    if any("ssri" in m or "fluoxetine" in m or "sertraline" in m for m in med_names) and any("tramadol" in m for m in med_names):
        interactions.append({
            "drugs": ["SSRI", "tramadol"],
            "severity": "medium",
            "mechanism": "Serotonin syndrome risk",
            "recommendation": "Monitor for serotonin syndrome symptoms",
        })
    
    high_risk = []
    risk_meds = ["warfarin", "digoxin", "methotrexate", "amiodarone", "lithium", "insulin"]
    for med in medications:
        if any(rm in med.get("name", "").lower() for rm in risk_meds):
            high_risk.append({
                "drug": med.get("name", "unknown"),
                "risk": "High-risk medication requiring monitoring",
                "monitoring_required": "Regular blood tests and clinical review",
            })
    
    return {
        "medication_count": len(medications),
        "interactions": interactions,
        "deprescribing_opportunities": [],
        "adherence_concerns": [],
        "high_risk_medications": high_risk,
        "prn_analysis": [],
        "recommendations_for_gp": ["Complete medication review recommended"] if interactions or high_risk else ["Continue current regimen"],
        "review_priority": "urgent" if interactions else "routine",
        "next_review_date": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "overall_assessment": f"Fallback review: {len(interactions)} interaction(s) found, {len(high_risk)} high-risk medication(s). Full clinical review recommended.",
        "_fallback": True,
    }
