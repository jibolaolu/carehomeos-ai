from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident
from app.models.resident import Resident
from app.models.safeguarding import PatternSignal, RiskPattern, SafeguardingCase
from app.services.llm_router import TaskType, complete

logger = logging.getLogger(__name__)

SIGNAL_EXTRACTORS: dict[str, list[tuple[str, list[str]]]] = {
    "visit_note": [
        ("bruising", ["bruise", "bruising", "unexplained mark", "discolouration"]),
        ("weight_loss", ["weight loss", "lost weight", "poor appetite", "refusing meals"]),
        ("mood_change", ["low mood", "withdrawn", "agitated", "anxious", "tearful"]),
        ("pain_increase", ["increased pain", "pain score risen", "more painful"]),
        ("falls", ["fall", "fell", "slipped", "trip"]),
        ("medication_refusal", ["refused medication", "refused tablets", "would not take"]),
        ("isolation", ["isolated", "lonely", "no visitors", "kept apart"]),
        ("rough_handling", ["rough handling", "handled roughly", "pulled", "dragged"]),
    ],
    "incident": [
        ("bruising", ["bruise", "bruising", "unexplained injury", "unexplained mark"]),
        ("falls", ["fall", "fell", "slipped"]),
        ("aggression", ["aggressive", "hit", "slap", "threatened"]),
        ("medication_error", ["missed dose", "wrong dose", "medication error"]),
    ],
    "clinical_tool": [
        ("deterioration", ["news2", "deterioration", "abnormal"]),
    ],
    "fluid_nutrition": [
        ("dehydration_risk", ["reduced intake", "dehydration", "low output"]),
        ("malnutrition_risk", ["weight loss", "poor appetite", "refusing meals"]),
    ],
    "risk_assessment": [
        ("high_risk", ["high risk", "severe", "critical"]),
    ],
    "controlled_drug": [
        ("discrepancy", ["discrepancy", "missing", "incorrect count"]),
    ],
}


def _extract_signals(source_type: str, text: str) -> list[dict[str, Any]]:
    lower = text.lower()
    found: list[dict[str, Any]] = []
    for signal_type, keywords in SIGNAL_EXTRACTORS.get(source_type, []):
        matched = [kw for kw in keywords if kw in lower]
        if matched:
            found.append({"signal_type": signal_type, "keywords": matched, "confidence": min(0.5 + 0.1 * len(matched), 0.95)})
    return found


def _build_pattern_prompt(
    resident: Resident | None,
    signals: list[PatternSignal],
    pattern_type: str,
    time_window_days: int,
) -> str:
    patient_ctx = f"Resident: {resident.first_name} {resident.last_name}, DOB {resident.date_of_birth}" if resident else "Unknown resident"

    signal_texts = []
    for s in signals:
        signal_texts.append(
            f"- [{s.source_type}:{s.source_id}] {s.signal_type} (confidence {s.confidence}, weight {s.risk_weight})\n  {s.evidence_text[:400] if s.evidence_text else ''}"
        )

    if pattern_type == "sar_evidence_synthesis":
        return (
            "You are a UK adult safeguarding evidence synthesiser. Summarise the signals below "
            "into a concise SAR evidence summary.\n\n"
            f"{patient_ctx}\n"
            f"Time window: last {time_window_days} days\n\n"
            "Signals:\n" + "\n".join(signal_texts) + "\n\n"
            "Respond ONLY with a valid JSON object:\n"
            '- "summary": string\n'
            '- "evidence_categories": list of strings\n'
            '- "gaps": string\n'
            '- "recommended_presentation": string\n\n'
            "JSON:"
        )

    return (
        "You are a UK adult safeguarding risk pattern analyst. Review the signals below and determine "
        "whether they form a longitudinal safeguarding risk pattern under the Care Act 2014.\n\n"
        f"{patient_ctx}\n"
        f"Time window: last {time_window_days} days\n\n"
        "Signals:\n" + "\n".join(signal_texts) + "\n\n"
        "Respond ONLY with a valid JSON object:\n"
        '- "pattern_detected": boolean\n'
        '- "category": one of physical, emotional, financial, neglect, organisational, self_neglect, sexual, discriminatory, domestic_abuse, modern_slavery, or none\n'
        '- "severity": one of low, medium, high, critical\n'
        '- "confidence": float 0.0-1.0\n'
        '- "summary": string\n'
        '- "contributing_evidence": list of strings\n'
        '- "recommended_actions": list of strings\n\n'
        "JSON:"
    )


def _parse_json_from_llm(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return {}


class PatternDetector:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def scan_resident(
        self,
        care_home_id: uuid.UUID,
        resident_id: uuid.UUID,
        auth0_id: str,
        *,
        time_window_days: int = 30,
        pattern_type: str = "longitudinal_risk",
    ) -> RiskPattern | None:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(days=time_window_days)

        resident = await self.db.get(Resident, resident_id)

        signals: list[PatternSignal] = []

        # Scan incidents
        incidents_result = await self.db.execute(
            select(Incident).where(
                Incident.care_home_id == str(care_home_id),
                Incident.resident_id == str(resident_id),
                Incident.occurred_at >= window_start,
            )
        )
        for incident in incidents_result.scalars().all():
            text = f"{incident.incident_type}\n{incident.description}\n{incident.immediate_action_taken or ''}"
            for sig in _extract_signals("incident", text):
                signals.append(PatternSignal(
                    care_home_id=str(care_home_id),
                    resident_id=str(resident_id),
                    source_type="incident",
                    source_id=str(incident.id),
                    signal_type=sig["signal_type"],
                    detected_at=incident.occurred_at or now,
                    evidence_text=text[:2000],
                    confidence=sig["confidence"],
                    risk_weight=3 if incident.severity in {"high", "critical"} else 2,
                ))

        # Scan care notes (using CareNote model)
        from app.models.care_note import CareNote
        notes_result = await self.db.execute(
            select(CareNote).where(
                CareNote.resident_id == str(resident_id),
                CareNote.recorded_at >= window_start,
            )
        )
        for note in notes_result.scalars().all():
            text = note.content or ""
            for sig in _extract_signals("visit_note", text):
                signals.append(PatternSignal(
                    care_home_id=str(care_home_id),
                    resident_id=str(resident_id),
                    source_type="care_note",
                    source_id=str(note.id),
                    signal_type=sig["signal_type"],
                    detected_at=note.recorded_at or now,
                    evidence_text=text[:2000],
                    confidence=sig["confidence"],
                    risk_weight=2,
                ))

        # Scan vital signs for deterioration signals
        from app.models.vital_signs import VitalSigns
        vitals_result = await self.db.execute(
            select(VitalSigns).where(
                VitalSigns.resident_id == str(resident_id),
                VitalSigns.recorded_at >= window_start,
            )
        )
        for vital in vitals_result.scalars().all():
            text = f"Vital signs: Temp {vital.temperature}, HR {vital.heart_rate}, BP {vital.blood_pressure}, SpO2 {vital.spo2}, Consciousness {vital.consciousness}"
            for sig in _extract_signals("clinical_tool", text):
                signals.append(PatternSignal(
                    care_home_id=str(care_home_id),
                    resident_id=str(resident_id),
                    source_type="vital_signs",
                    source_id=str(vital.id),
                    signal_type=sig["signal_type"],
                    detected_at=vital.recorded_at or now,
                    evidence_text=text,
                    confidence=sig["confidence"],
                    risk_weight=2,
                ))

        # Scan fluid balance for dehydration/malnutrition
        from app.models.fluid_balance import FluidBalance
        fluid_result = await self.db.execute(
            select(FluidBalance).where(
                FluidBalance.resident_id == str(resident_id),
                FluidBalance.recorded_at >= window_start,
            )
        )
        for entry in fluid_result.scalars().all():
            text = f"Fluid balance: intake {entry.intake_ml}ml, output {entry.output_ml}ml"
            for sig in _extract_signals("fluid_nutrition", text):
                signals.append(PatternSignal(
                    care_home_id=str(care_home_id),
                    resident_id=str(resident_id),
                    source_type="fluid_balance",
                    source_id=str(entry.id),
                    signal_type=sig["signal_type"],
                    detected_at=entry.recorded_at or now,
                    evidence_text=text,
                    confidence=sig["confidence"],
                    risk_weight=1,
                ))

        # Scan nutrition screening
        from app.models.nutrition_screening import NutritionScreening
        nutrition_result = await self.db.execute(
            select(NutritionScreening).where(
                NutritionScreening.resident_id == str(resident_id),
                NutritionScreening.screened_at >= window_start,
            )
        )
        for screening in nutrition_result.scalars().all():
            text = f"Nutrition screening: MUST score {screening.must_score}, weight {screening.weight_kg}kg"
            for sig in _extract_signals("fluid_nutrition", text):
                signals.append(PatternSignal(
                    care_home_id=str(care_home_id),
                    resident_id=str(resident_id),
                    source_type="nutrition_screening",
                    source_id=str(screening.id),
                    signal_type=sig["signal_type"],
                    detected_at=screening.screened_at or now,
                    evidence_text=text,
                    confidence=sig["confidence"],
                    risk_weight=1,
                ))

        # Scan MAR records for medication issues
        from app.models.mar_record import MARRecord
        mar_result = await self.db.execute(
            select(MARRecord).where(
                MARRecord.resident_id == str(resident_id),
                MARRecord.administered_at >= window_start,
            )
        )
        for mar in mar_result.scalars().all():
            if mar.status in {"refused", "missed", "omitted"}:
                text = f"MAR record: {mar.status}"
                for sig in _extract_signals("controlled_drug", text):
                    signals.append(PatternSignal(
                        care_home_id=str(care_home_id),
                        resident_id=str(resident_id),
                        source_type="mar_record",
                        source_id=str(mar.id),
                        signal_type=sig["signal_type"],
                        detected_at=mar.administered_at or now,
                        evidence_text=text,
                        confidence=sig["confidence"],
                        risk_weight=2,
                    ))

        for signal in signals:
            self.db.add(signal)
        await self.db.flush()

        if not signals:
            return None

        prompt = _build_pattern_prompt(resident, signals, pattern_type, time_window_days)
        try:
            llm_text = await complete(TaskType.PATTERN_DETECTION if pattern_type != "sar_evidence_synthesis" else TaskType.SAR_EVIDENCE_SYNTHESIS, prompt)
            parsed = _parse_json_from_llm(llm_text)
        except Exception as exc:
            logger.warning("Pattern detection LLM failed for resident %s: %s", resident_id, exc)
            parsed = {}

        if pattern_type == "sar_evidence_synthesis":
            risk_pattern = RiskPattern(
                care_home_id=str(care_home_id),
                resident_id=str(resident_id),
                pattern_type="sar_evidence_synthesis",
                category="none",
                severity="low",
                confidence=0.5,
                time_window_days=time_window_days,
                window_start=window_start,
                window_end=now,
                summary=parsed.get("summary") or "SAR evidence synthesis completed.",
                contributing_evidence=json.dumps(parsed.get("evidence_categories", [])),
                recommended_actions=json.dumps({"gaps": parsed.get("gaps", ""), "presentation": parsed.get("recommended_presentation", "")}),
                fallback_used=not bool(parsed),
            )
        else:
            detected = parsed.get("pattern_detected", False)
            category = parsed.get("category", "physical")
            severity = parsed.get("severity", "medium")
            risk_pattern = RiskPattern(
                care_home_id=str(care_home_id),
                resident_id=str(resident_id),
                pattern_type="longitudinal_risk",
                category=category,
                severity=severity,
                confidence=parsed.get("confidence", 0.5),
                time_window_days=time_window_days,
                window_start=window_start,
                window_end=now,
                summary=parsed.get("summary") or "Longitudinal risk assessment completed.",
                contributing_evidence=json.dumps(parsed.get("contributing_evidence", [])),
                recommended_actions=json.dumps(parsed.get("recommended_actions", [])),
                fallback_used=not bool(parsed),
            )
            if detected and severity in {"high", "critical"}:
                case_result = await self.db.execute(
                    select(SafeguardingCase).where(
                        SafeguardingCase.care_home_id == str(care_home_id),
                        SafeguardingCase.resident_id == str(resident_id),
                        SafeguardingCase.status.in_(["open", "section42_enquiry", "review"]),
                    )
                )
                case = case_result.scalar_one_or_none()
                if case:
                    risk_pattern.safeguarding_case_id = case.id

        self.db.add(risk_pattern)
        await self.db.flush()
        return risk_pattern
