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
from app.models.resident import Resident
from app.models.safeguarding import SafeguardingAlert, SafeguardingCase, Section42Enquiry
from app.services.llm_router import TaskType, complete
from app.services.phi_filter import deidentify

logger = logging.getLogger(__name__)


def _build_section42_prompt(
    resident: Resident,
    incidents: list[Incident],
    care_notes: list[CareNote],
    alerts: list[SafeguardingAlert],
    case: SafeguardingCase,
) -> str:
    resident_name = f"{resident.first_name} {resident.last_name}" if resident else "Unknown resident"
    resident_dob = resident.date_of_birth.isoformat() if resident and resident.date_of_birth else "Unknown"
    resident_room = resident.room if resident else "Unknown"

    incident_summaries = []
    for inc in incidents:
        text = deidentify(f"{inc.incident_date.isoformat() if inc.incident_date else ''}: {inc.title}\n{inc.description}\nAction: {inc.immediate_action_taken}").text
        incident_summaries.append(text)

    note_summaries = []
    for note in care_notes:
        text = deidentify(f"{note.recorded_at}: {note.content[:500]}").text
        note_summaries.append(text)

    alert_summaries = []
    for alert in alerts:
        text = deidentify(f"{alert.created_at.isoformat() if alert.created_at else ''}: [{alert.severity}] {alert.category}\n{alert.description}").text
        alert_summaries.append(text)

    return (
        "You are a UK adult safeguarding specialist drafting a Section 42 enquiry record under the Care Act 2014. "
        "Use the de-identified evidence below to produce a structured draft.\n\n"
        f"Resident: {resident_name} (DOB {resident_dob}, Room {resident_room})\n"
        f"Case reference: {case.reference}\n"
        f"Case opened: {case.opened_at.isoformat() if case.opened_at else ''}\n\n"
        "Incidents:\n" + ("\n---\n".join(incident_summaries) if incident_summaries else "None") + "\n\n"
        "Care notes:\n" + ("\n---\n".join(note_summaries) if note_summaries else "None") + "\n\n"
        "Safeguarding alerts:\n" + ("\n---\n".join(alert_summaries) if alert_summaries else "None") + "\n\n"
        "Respond ONLY with a valid JSON object containing these keys:\n"
        '- "summary": string (concise overview of the concern)\n'
        '- "risks": string (bullet list of risks)\n'
        '- "evidence": string (bullet list of evidence)\n'
        '- "capacity_considerations": string (Mental Capacity Act considerations)\n'
        '- "recommended_outcomes": string (bullet list of recommended outcomes)\n'
        '- "narrative": string (formal narrative suitable for a local authority referral)\n\n'
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


class Section42Generator:
    """Generates structured Section 42 enquiry drafts from case evidence."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def generate(
        self,
        care_home_id: str,
        case_id: str,
        user_id: str,
    ) -> Section42Enquiry:
        case_result = await self.db.execute(
            select(SafeguardingCase).where(
                SafeguardingCase.id == case_id,
                SafeguardingCase.care_home_id == care_home_id,
            )
        )
        case = case_result.scalar_one_or_none()
        if not case:
            raise ValueError("Safeguarding case not found")

        resident = None
        if case.resident_id:
            resident_result = await self.db.execute(
                select(Resident).where(
                    Resident.id == case.resident_id,
                    Resident.care_home_id == care_home_id,
                )
            )
            resident = resident_result.scalar_one_or_none()

        incidents_result = await self.db.execute(
            select(Incident).where(
                Incident.care_home_id == care_home_id,
                Incident.resident_id == case.resident_id,
                Incident.is_safeguarding == True,
            ).order_by(Incident.incident_date.desc())
        )
        incidents = list(incidents_result.scalars().all())

        notes_result = await self.db.execute(
            select(CareNote).where(
                CareNote.resident_id == case.resident_id,
                CareNote.safeguarding_flags.isnot(None),
            ).order_by(CareNote.recorded_at.desc()).limit(20)
        )
        care_notes = list(notes_result.scalars().all())

        alerts_result = await self.db.execute(
            select(SafeguardingAlert).where(
                SafeguardingAlert.safeguarding_case_id == case_id,
            ).order_by(SafeguardingAlert.created_at.desc())
        )
        alerts = list(alerts_result.scalars().all())

        prompt = _build_section42_prompt(resident, incidents, care_notes, alerts, case)

        try:
            llm_result = await complete(TaskType.SECTION42, prompt)
            parsed = _parse_json_from_llm(llm_result.text)
        except Exception as exc:
            logger.warning("Section 42 LLM generation failed for case %s: %s", case_id, exc)
            llm_result = None
            parsed = {}

        reference = f"S42-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        enquiry = Section42Enquiry(
            id=str(uuid.uuid4()),
            care_home_id=care_home_id,
            safeguarding_case_id=case_id,
            resident_id=case.resident_id,
            reference=reference,
            status="draft",
            generated_by_user_id=user_id,
            summary=parsed.get("summary") or "Section 42 enquiry summary pending review.",
            risks=parsed.get("risks") or "Risks to be confirmed through multi-agency enquiry.",
            evidence=parsed.get("evidence") or "Evidence collated from incident reports and care notes.",
            capacity_considerations=parsed.get("capacity_considerations") or "Capacity assessment to be completed under the Mental Capacity Act 2005.",
            recommended_outcomes=parsed.get("recommended_outcomes") or "Recommended outcomes to be agreed at safeguarding enquiry.",
            narrative=parsed.get("narrative") or "Formal narrative pending generation review.",
            model_provider=llm_result.provider if llm_result else "deterministic-fallback",
            model_name=llm_result.model if llm_result else "local-carehomeos-template",
            fallback_used=llm_result.fallback_used if llm_result else True,
        )
        self.db.add(enquiry)

        case.status = "section42_enquiry"
        await self.db.flush()
        return enquiry

    async def get_enquiry(self, enquiry_id: str, care_home_id: str) -> Section42Enquiry | None:
        result = await self.db.execute(
            select(Section42Enquiry).where(
                Section42Enquiry.id == enquiry_id,
                Section42Enquiry.care_home_id == care_home_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_enquiries(
        self,
        care_home_id: str,
        *,
        case_id: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Section42Enquiry], int]:
        query = select(Section42Enquiry).where(Section42Enquiry.care_home_id == care_home_id)
        count_query = select(Section42Enquiry).where(Section42Enquiry.care_home_id == care_home_id)

        if case_id:
            query = query.where(Section42Enquiry.safeguarding_case_id == case_id)
            count_query = count_query.where(Section42Enquiry.safeguarding_case_id == case_id)
        if status:
            query = query.where(Section42Enquiry.status == status)
            count_query = count_query.where(Section42Enquiry.status == status)

        query = query.order_by(Section42Enquiry.generated_at.desc()).limit(limit).offset(offset)

        items = await self.db.execute(query)
        count = await self.db.execute(count_query)
        return list(items.scalars().all()), len(count.scalars().all())

    async def update_enquiry(
        self,
        enquiry: Section42Enquiry,
        data: dict[str, Any],
    ) -> Section42Enquiry:
        for field in {
            "summary",
            "risks",
            "evidence",
            "capacity_considerations",
            "recommended_outcomes",
            "narrative",
            "status",
            "conclusion_outcome",
        }:
            if field in data:
                setattr(enquiry, field, data[field])

        if data.get("status") == "submitted" and not enquiry.submitted_at:
            enquiry.submitted_at = datetime.now(timezone.utc)
        if data.get("status") == "concluded" and not enquiry.concluded_at:
            enquiry.concluded_at = datetime.now(timezone.utc)

        await self.db.flush()
        return enquiry
