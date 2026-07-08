from __future__ import annotations

import io
import json
import logging
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_note import CareNote
from app.models.incident import Incident
from app.models.resident import Resident
from app.models.safeguarding import (
    EvidencePack,
    EvidencePackItem,
    RiskPattern,
    SafeguardingAlert,
    SafeguardingCase,
    Section42Enquiry,
)
from app.services.s3_service import upload_bytes
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

logger = logging.getLogger(__name__)


def _build_pdf(pack: EvidencePack, items: list[EvidencePackItem]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=18, spaceAfter=12)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], fontSize=14, spaceAfter=10)
    body_style = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=10, spaceAfter=8)
    small_style = ParagraphStyle("Small", parent=styles["BodyText"], fontSize=9, textColor=colors.grey)

    story: list[Any] = []
    story.append(Paragraph(f"Evidence Pack: {pack.reference}", title_style))
    story.append(Paragraph(f"Type: {pack.pack_type}", body_style))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).isoformat()}", small_style))
    story.append(Spacer(1, 12))

    # Index table
    index_data = [["#", "Type", "Reference", "Occurred"]]
    for idx, item in enumerate(items, 1):
        occurred = item.occurred_at.isoformat() if item.occurred_at else ""
        index_data.append([str(idx), item.item_type, item.source_reference or item.source_id, occurred])

    index_table = Table(index_data, colWidths=[30, 80, 200, 140])
    index_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5E7EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(index_table)
    story.append(Spacer(1, 20))

    # Item details
    for idx, item in enumerate(items, 1):
        story.append(PageBreak())
        story.append(Paragraph(f"Item {idx}: {item.title}", heading_style))
        story.append(Paragraph(f"Type: {item.item_type} | Reference: {item.source_reference or item.source_id}", body_style))
        if item.occurred_at:
            story.append(Paragraph(f"Occurred: {item.occurred_at.isoformat()}", body_style))
        story.append(Spacer(1, 8))
        content = item.content_summary or "No summary available."
        story.append(Paragraph(content.replace("\n", "<br/>"), body_style))

    doc.build(story)
    return buffer.getvalue()


def _build_zip(pack: EvidencePack, items: list[EvidencePackItem], pdf_bytes: bytes) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{pack.reference}_index.pdf", pdf_bytes)
        for item in items:
            filename = f"{item.item_type}_{item.source_reference or item.source_id}.txt"
            content = f"Title: {item.title}\nType: {item.item_type}\nReference: {item.source_reference or item.source_id}\n\n{item.content_summary or ''}"
            zf.writestr(filename, content)
    return buffer.getvalue()


class EvidencePackService:
    """Assembles evidence packs for safeguarding cases."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_pack(
        self,
        care_home_id: str,
        safeguarding_case_id: str,
        user_id: str,
        data: dict[str, Any],
    ) -> EvidencePack:
        case_result = await self.db.execute(
            select(SafeguardingCase).where(
                SafeguardingCase.id == safeguarding_case_id,
                SafeguardingCase.care_home_id == care_home_id,
            )
        )
        case = case_result.scalar_one_or_none()
        if not case:
            raise ValueError("Safeguarding case not found")

        reference = f"EP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        pack = EvidencePack(
            id=str(uuid.uuid4()),
            care_home_id=care_home_id,
            safeguarding_case_id=safeguarding_case_id,
            resident_id=case.resident_id,
            reference=reference,
            status="pending",
            pack_type=data.get("pack_type", "safeguarding_review"),
            date_from=data["date_from"],
            date_to=data["date_to"],
            include_incidents=data.get("include_incidents", True),
            include_care_notes=data.get("include_care_notes", True),
            include_section42=data.get("include_section42", True),
            include_alerts=data.get("include_alerts", True),
            include_patterns=data.get("include_patterns", True),
            generated_by_user_id=user_id,
        )
        self.db.add(pack)
        await self.db.flush()
        return pack

    async def generate_pack(self, pack: EvidencePack) -> EvidencePack:
        pack.status = "generating"
        await self.db.flush()

        try:
            items: list[EvidencePackItem] = []

            if pack.include_incidents:
                incidents_result = await self.db.execute(
                    select(Incident).where(
                        Incident.care_home_id == pack.care_home_id,
                        Incident.resident_id == pack.resident_id,
                        Incident.incident_date >= pack.date_from,
                        Incident.incident_date <= pack.date_to,
                    ).order_by(Incident.incident_date.desc())
                )
                for incident in incidents_result.scalars().all():
                    items.append(EvidencePackItem(
                        id=str(uuid.uuid4()),
                        evidence_pack_id=pack.id,
                        item_type="incident",
                        source_id=incident.id,
                        source_reference=incident.title,
                        title=f"Incident: {incident.title}",
                        occurred_at=incident.incident_date,
                        content_summary=f"{incident.description}\n\nImmediate action: {incident.immediate_action_taken}",
                        sort_order=10,
                    ))

            if pack.include_care_notes and pack.resident_id:
                notes_result = await self.db.execute(
                    select(CareNote).where(
                        CareNote.resident_id == pack.resident_id,
                        CareNote.recorded_at >= pack.date_from,
                        CareNote.recorded_at <= pack.date_to,
                    ).order_by(CareNote.recorded_at.desc())
                )
                for note in notes_result.scalars().all():
                    items.append(EvidencePackItem(
                        id=str(uuid.uuid4()),
                        evidence_pack_id=pack.id,
                        item_type="care_note",
                        source_id=note.id,
                        source_reference=note.note_type,
                        title=f"Care note: {note.note_type}",
                        occurred_at=note.recorded_at if isinstance(note.recorded_at, datetime) else None,
                        content_summary=note.content or "",
                        sort_order=20,
                    ))

            if pack.include_alerts:
                alerts_result = await self.db.execute(
                    select(SafeguardingAlert).where(
                        SafeguardingAlert.safeguarding_case_id == pack.safeguarding_case_id,
                        SafeguardingAlert.created_at >= pack.date_from,
                        SafeguardingAlert.created_at <= pack.date_to,
                    ).order_by(SafeguardingAlert.created_at.desc())
                )
                for alert in alerts_result.scalars().all():
                    items.append(EvidencePackItem(
                        id=str(uuid.uuid4()),
                        evidence_pack_id=pack.id,
                        item_type="alert",
                        source_id=alert.id,
                        source_reference=alert.category,
                        title=f"Alert: {alert.title}",
                        occurred_at=alert.created_at,
                        content_summary=f"{alert.description}\nSeverity: {alert.severity}",
                        sort_order=30,
                    ))

            if pack.include_section42:
                section42_result = await self.db.execute(
                    select(Section42Enquiry).where(
                        Section42Enquiry.safeguarding_case_id == pack.safeguarding_case_id,
                    ).order_by(Section42Enquiry.generated_at.desc())
                )
                for enquiry in section42_result.scalars().all():
                    items.append(EvidencePackItem(
                        id=str(uuid.uuid4()),
                        evidence_pack_id=pack.id,
                        item_type="section42",
                        source_id=enquiry.id,
                        source_reference=enquiry.reference,
                        title=f"Section 42: {enquiry.reference}",
                        occurred_at=enquiry.generated_at,
                        content_summary=f"{enquiry.summary}\n\nRisks:\n{enquiry.risks}\n\nRecommended outcomes:\n{enquiry.recommended_outcomes}",
                        sort_order=40,
                    ))

            if pack.include_patterns and pack.resident_id:
                patterns_result = await self.db.execute(
                    select(RiskPattern).where(
                        RiskPattern.resident_id == pack.resident_id,
                        RiskPattern.created_at >= pack.date_from,
                        RiskPattern.created_at <= pack.date_to,
                    ).order_by(RiskPattern.created_at.desc())
                )
                for pattern in patterns_result.scalars().all():
                    items.append(EvidencePackItem(
                        id=str(uuid.uuid4()),
                        evidence_pack_id=pack.id,
                        item_type="pattern",
                        source_id=pattern.id,
                        source_reference=pattern.pattern_type,
                        title=f"Pattern: {pattern.pattern_type}",
                        occurred_at=pattern.created_at,
                        content_summary=f"{pattern.summary}\nCategory: {pattern.category}, Severity: {pattern.severity}, Confidence: {pattern.confidence}",
                        sort_order=50,
                    ))

            for item in items:
                self.db.add(item)
            await self.db.flush()

            pdf_bytes = _build_pdf(pack, items)
            zip_bytes = _build_zip(pack, items, pdf_bytes)

            pdf_key = f"evidence-packs/{pack.care_home_id}/{pack.reference}_index.pdf"
            zip_key = f"evidence-packs/{pack.care_home_id}/{pack.reference}_bundle.zip"

            try:
                from app.config import get_settings
                settings = get_settings()
                upload_bytes(settings.s3_bucket_clinical, pdf_key, pdf_bytes, content_type="application/pdf")
                upload_bytes(settings.s3_bucket_clinical, zip_key, zip_bytes, content_type="application/zip")
                pack.s3_bucket = settings.s3_bucket_clinical
                pack.s3_key_pdf = pdf_key
                pack.s3_key_zip = zip_key
                pack.file_size_bytes = len(zip_bytes)
            except Exception as exc:
                logger.warning("Evidence pack S3 upload failed for %s: %s", pack.reference, exc)
                pack.error_message = f"S3 upload failed: {exc}"

            pack.status = "completed"
            pack.generated_at = datetime.now(timezone.utc)
            await self.db.flush()

        except Exception as exc:
            logger.exception("Evidence pack generation failed for %s", pack.reference)
            pack.status = "failed"
            pack.error_message = str(exc)
            await self.db.flush()
            raise

        return pack

    async def get_pack(self, pack_id: str, care_home_id: str) -> EvidencePack | None:
        result = await self.db.execute(
            select(EvidencePack).where(
                EvidencePack.id == pack_id,
                EvidencePack.care_home_id == care_home_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_packs(
        self,
        care_home_id: str,
        *,
        case_id: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[EvidencePack], int]:
        query = select(EvidencePack).where(EvidencePack.care_home_id == care_home_id)
        count_query = select(EvidencePack).where(EvidencePack.care_home_id == care_home_id)

        if case_id:
            query = query.where(EvidencePack.safeguarding_case_id == case_id)
            count_query = count_query.where(EvidencePack.safeguarding_case_id == case_id)
        if status:
            query = query.where(EvidencePack.status == status)
            count_query = count_query.where(EvidencePack.status == status)

        query = query.order_by(EvidencePack.created_at.desc()).limit(limit).offset(offset)

        items = await self.db.execute(query)
        count = await self.db.execute(count_query)
        return list(items.scalars().all()), len(count.scalars().all())
