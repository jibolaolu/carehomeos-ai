from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_note import CareNote
from app.models.incident import Incident
from app.models.safeguarding import SafeguardingAlert, SafeguardingCase
from app.services.llm_router import TaskType, complete
from app.services.phi_filter import deidentify

logger = logging.getLogger(__name__)

SAFEGUARDING_CATEGORIES = [
    "physical",
    "emotional",
    "financial",
    "neglect",
    "organisational",
    "self_neglect",
    "sexual",
    "discriminatory",
    "domestic_abuse",
    "modern_slavery",
]

KEYWORD_TRIGGERS: dict[str, list[str]] = {
    "physical": ["hit", "slap", "push", "bruise", "bruising", "pain", "mark", "burn", "fracture", "assault"],
    "emotional": ["shout", "threaten", "intimidate", "frightened", "upset", "distressed", "humiliate"],
    "financial": ["theft", "stolen", "missing money", "forced signature", "will changed", "debt"],
    "neglect": ["hungry", "thirsty", "dirty", "soiled", "cold", "untreated", "missed care"],
    "organisational": ["understaffed", "shortage", "policy breach", "unsafe"],
    "self_neglect": ["refusing food", "refusing medication", "hoarding", "unclean", "isolated"],
    "sexual": ["inappropriate touching", "sexual assault", "exposure", "rape", "indecent"],
    "discriminatory": ["racist", "sexist", "homophobic", "discrimination", "prejudice"],
    "domestic_abuse": ["family violence", "coercive", "controlling behaviour"],
    "modern_slavery": ["exploited", "forced labour", "trafficked", "passport taken", "no pay"],
}


def _keyword_screen(text: str) -> dict[str, Any]:
    lower = text.lower()
    hits: dict[str, list[str]] = {}
    for category, keywords in KEYWORD_TRIGGERS.items():
        matched = [kw for kw in keywords if kw in lower]
        if matched:
            hits[category] = matched
    return {
        "flagged": bool(hits),
        "categories": list(hits.keys()),
        "keywords": hits,
    }


def _build_screen_prompt(source_type: str, source_text: str, resident_context: str) -> str:
    deidentified = deidentify(source_text)
    return (
        f"You are a UK adult safeguarding screening assistant. Analyse the following {source_type} "
        "and determine whether it raises a safeguarding concern under the Care Act 2014. "
        "Respond ONLY with a valid JSON object containing:\n"
        '- "flagged": boolean\n'
        '- "category": one of physical, emotional, financial, neglect, organisational, self_neglect, sexual, discriminatory, domestic_abuse, modern_slavery, or none\n'
        '- "severity": one of low, medium, high, critical\n'
        '- "confidence": float 0.0-1.0\n'
        '- "reasoning": concise string\n'
        '- "recommended_action": concise string\n\n'
        f"Resident context: {resident_context}\n\n"
        f"Text to screen:\n{deidentified.text}\n\n"
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
        # Try to extract first JSON object
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return {}


class IncidentLogger:
    """Production-grade incident logging with safeguarding auto-screening."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_incident(
        self,
        care_home_id: str,
        reported_by_id: str,
        data: dict[str, Any],
        auto_screen: bool = True,
    ) -> Incident:
        now = datetime.now(timezone.utc)
        incident = Incident(
            id=str(uuid.uuid4()),
            care_home_id=care_home_id,
            resident_id=data.get("resident_id"),
            reported_by_id=reported_by_id,
            incident_type=data.get("incident_type", "safeguarding_concern"),
            category=data.get("category", "safeguarding"),
            severity=data.get("severity", "medium"),
            status=data.get("status", "open"),
            title=data.get("title", "Untitled incident"),
            description=data.get("description", ""),
            immediate_action_taken=data.get("immediate_action_taken", ""),
            location=data.get("location"),
            incident_date=data.get("incident_date", now),
            reported_at=now,
            is_safeguarding=data.get("is_safeguarding", False),
            safeguarding_category=data.get("safeguarding_category"),
            duty_of_candour_triggered=data.get("duty_of_candour_triggered", False),
            family_notified=data.get("family_notified", False),
            gp_notified=data.get("gp_notified", False),
            cqc_relevant=data.get("cqc_relevant", True),
        )
        self.db.add(incident)
        await self.db.flush()

        if auto_screen:
            await self._screen_and_alert(incident, reported_by_id)

        return incident

    async def update_incident(
        self,
        incident: Incident,
        data: dict[str, Any],
        user_id: str,
    ) -> Incident:
        for field in {
            "title",
            "description",
            "immediate_action_taken",
            "location",
            "severity",
            "status",
            "is_safeguarding",
            "safeguarding_category",
            "duty_of_candour_triggered",
            "family_notified",
            "gp_notified",
            "resolution_notes",
            "root_cause_analysis",
            "lessons_learned",
            "action_items",
        }:
            if field in data:
                setattr(incident, field, data[field])

        if data.get("status") == "resolved" and not incident.resolved_at:
            incident.resolved_at = datetime.now(timezone.utc)
            incident.resolved_by_id = user_id

        await self.db.flush()
        return incident

    async def get_incident(self, incident_id: str, care_home_id: str) -> Incident | None:
        result = await self.db.execute(
            select(Incident).where(
                Incident.id == incident_id,
                Incident.care_home_id == care_home_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_incidents(
        self,
        care_home_id: str,
        *,
        resident_id: str | None = None,
        status: str | None = None,
        is_safeguarding: bool | None = None,
        severity: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Incident], int]:
        query = select(Incident).where(Incident.care_home_id == care_home_id)
        count_query = select(Incident).where(Incident.care_home_id == care_home_id)

        if resident_id:
            query = query.where(Incident.resident_id == resident_id)
            count_query = count_query.where(Incident.resident_id == resident_id)
        if status:
            query = query.where(Incident.status == status)
            count_query = count_query.where(Incident.status == status)
        if is_safeguarding is not None:
            query = query.where(Incident.is_safeguarding == is_safeguarding)
            count_query = count_query.where(Incident.is_safeguarding == is_safeguarding)
        if severity:
            query = query.where(Incident.severity == severity)
            count_query = count_query.where(Incident.severity == severity)

        query = query.order_by(Incident.incident_date.desc()).limit(limit).offset(offset)

        items_result = await self.db.execute(query)
        count_result = await self.db.execute(count_query)
        return list(items_result.scalars().all()), len(count_result.scalars().all())

    async def _screen_and_alert(self, incident: Incident, user_id: str) -> SafeguardingAlert | None:
        text_to_screen = f"{incident.title}\n{incident.description}\n{incident.immediate_action_taken}"

        keyword_result = _keyword_screen(text_to_screen)
        llm_result = None
        try:
            prompt = _build_screen_prompt(
                source_type="incident report",
                source_text=text_to_screen,
                resident_context=f"Resident ID: {incident.resident_id or 'unknown'}",
            )
            llm_result = await complete(TaskType.SAFEGUARDING_SCREEN, prompt)
            parsed = _parse_json_from_llm(llm_result.text)
        except Exception as exc:
            logger.warning("Safeguarding LLM screen failed for incident %s: %s", incident.id, exc)
            parsed = {}

        flagged = keyword_result["flagged"] or parsed.get("flagged", False)
        if not flagged:
            return None

        category = parsed.get("category") or (keyword_result["categories"][0] if keyword_result["categories"] else "physical")
        category = category if category in SAFEGUARDING_CATEGORIES else "physical"
        severity = parsed.get("severity", incident.severity if incident.severity in {"low", "medium", "high", "critical"} else "medium")

        incident.is_safeguarding = True
        incident.safeguarding_category = category

        alert = SafeguardingAlert(
            id=str(uuid.uuid4()),
            care_home_id=incident.care_home_id,
            resident_id=incident.resident_id,
            incident_id=incident.id,
            source_type="incident",
            source_id=incident.id,
            category=category,
            severity=severity,
            status="open",
            title=f"Safeguarding concern from incident: {incident.title}",
            description=incident.description,
            evidence_summary=json.dumps({
                "keyword_result": keyword_result,
                "llm_result": {
                    "provider": llm_result.provider if llm_result else None,
                    "model": llm_result.model if llm_result else None,
                    "fallback_used": llm_result.fallback_used if llm_result else None,
                    "parsed": parsed,
                },
            }),
            triggered_by_user_id=user_id,
        )
        self.db.add(alert)
        await self.db.flush()

        # Auto-escalate to a case if high/critical
        if severity in {"high", "critical"}:
            case = await self._ensure_case_for_alert(alert, user_id)
            alert.safeguarding_case_id = case.id

        return alert

    async def _ensure_case_for_alert(self, alert: SafeguardingAlert, user_id: str) -> SafeguardingCase:
        if alert.resident_id:
            existing = await self.db.execute(
                select(SafeguardingCase).where(
                    SafeguardingCase.care_home_id == alert.care_home_id,
                    SafeguardingCase.resident_id == alert.resident_id,
                    SafeguardingCase.status.in_(["open", "section42_enquiry", "review"]),
                )
            )
            case = existing.scalar_one_or_none()
            if case:
                return case

        reference = f"SG-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        case = SafeguardingCase(
            id=str(uuid.uuid4()),
            care_home_id=alert.care_home_id,
            resident_id=alert.resident_id,
            reference=reference,
            status="open",
            risk_level=alert.severity,
            opened_by_user_id=user_id,
        )
        self.db.add(case)
        await self.db.flush()
        return case

    async def screen_care_note(self, care_note: CareNote, user_id: str) -> SafeguardingAlert | None:
        text_to_screen = care_note.content or ""
        keyword_result = _keyword_screen(text_to_screen)

        try:
            prompt = _build_screen_prompt(
                source_type="care note",
                source_text=text_to_screen,
                resident_context=f"Resident ID: {care_note.resident_id}",
            )
            llm_result = await complete(TaskType.SAFEGUARDING_SCREEN, prompt)
            parsed = _parse_json_from_llm(llm_result.text)
        except Exception as exc:
            logger.warning("Safeguarding LLM screen failed for care note %s: %s", care_note.id, exc)
            parsed = {}

        flagged = keyword_result["flagged"] or parsed.get("flagged", False)
        if not flagged:
            return None

        category = parsed.get("category") or (keyword_result["categories"][0] if keyword_result["categories"] else "physical")
        category = category if category in SAFEGUARDING_CATEGORIES else "physical"
        severity = parsed.get("severity", "medium")

        care_note.safeguarding_flags = json.dumps({"category": category, "severity": severity})

        alert = SafeguardingAlert(
            id=str(uuid.uuid4()),
            care_home_id=care_note.resident.care_home_id if care_note.resident else "",
            resident_id=care_note.resident_id,
            care_note_id=care_note.id,
            source_type="care_note",
            source_id=care_note.id,
            category=category,
            severity=severity,
            status="open",
            title=f"Safeguarding concern from care note",
            description=text_to_screen[:2000],
            evidence_summary=json.dumps({"keyword_result": keyword_result, "llm_parsed": parsed}),
            triggered_by_user_id=user_id,
        )
        self.db.add(alert)
        await self.db.flush()

        if severity in {"high", "critical"}:
            case = await self._ensure_case_for_alert(alert, user_id)
            alert.safeguarding_case_id = case.id

        return alert
