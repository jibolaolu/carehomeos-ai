from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import SessionLocal
from app.models.care_note import CareNote
from app.models.incident import Incident
from app.services.safeguarding.incident_logger import IncidentLogger

logger = logging.getLogger(__name__)


async def _async_run() -> dict[str, int]:
    async with SessionLocal() as session:
        session: AsyncSession
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(hours=1)

        logger.info("[SafeguardingScan] Starting scan since %s", window_start.isoformat())

        incidents_result = await session.execute(
            select(Incident).where(
                Incident.reported_at >= window_start,
                Incident.is_safeguarding == False,
            )
        )
        incidents = list(incidents_result.scalars().all())

        notes_result = await session.execute(
            select(CareNote).where(
                CareNote.created_at >= window_start,
                CareNote.safeguarding_flags.is_(None),
            )
        )
        notes = list(notes_result.scalars().all())

        logger = IncidentLogger(session)
        alerts_created = 0

        for incident in incidents:
            alert = await logger._screen_and_alert(incident, incident.reported_by_id or "system")
            if alert:
                alerts_created += 1

        for note in notes:
            alert = await logger.screen_care_note(note, note.author_id or "system")
            if alert:
                alerts_created += 1

        await session.commit()
        logger.info("[SafeguardingScan] Created %s alerts from %s incidents and %s notes", alerts_created, len(incidents), len(notes))
        return {"incidents_scanned": len(incidents), "notes_scanned": len(notes), "alerts_created": alerts_created}


def run() -> dict[str, int]:
    import asyncio
    return asyncio.run(_async_run())
