from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import SessionLocal
from app.models.resident import Resident
from app.services.safeguarding.pattern_detector import PatternDetector

logger = logging.getLogger(__name__)


async def _async_run() -> dict[str, int]:
    async with SessionLocal() as session:
        session: AsyncSession
        residents_result = await session.execute(select(Resident.id, Resident.care_home_id))
        residents = list(residents_result.all())

        detector = PatternDetector(session)
        patterns_created = 0
        for resident_id, care_home_id in residents:
            try:
                pattern = await detector.scan_resident(
                    care_home_id=care_home_id,
                    resident_id=resident_id,
                    user_id="system",
                    time_window_days=30,
                )
                if pattern:
                    patterns_created += 1
            except Exception as exc:
                logger.warning("Pattern detection failed for resident %s: %s", resident_id, exc)

        await session.commit()
        logger.info("[PatternDetector] Scanned %s residents, created %s patterns", len(residents), patterns_created)
        return {"residents_scanned": len(residents), "patterns_created": patterns_created}


def run() -> dict[str, int]:
    import asyncio
    return asyncio.run(_async_run())
