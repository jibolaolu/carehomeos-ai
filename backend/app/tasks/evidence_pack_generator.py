from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import SessionLocal
from app.models.safeguarding import EvidencePack
from app.services.safeguarding.evidence_pack import EvidencePackService

logger = logging.getLogger(__name__)


async def _async_run(pack_id: str) -> dict[str, str]:
    async with SessionLocal() as session:
        session: AsyncSession
        pack_result = await session.execute(select(EvidencePack).where(EvidencePack.id == pack_id))
        pack = pack_result.scalar_one_or_none()
        if not pack:
            raise ValueError(f"Evidence pack {pack_id} not found")

        service = EvidencePackService(session)
        await service.generate_pack(pack)
        await session.commit()
        return {"pack_id": pack_id, "status": pack.status}


def run(pack_id: str) -> dict[str, str]:
    import asyncio
    return asyncio.run(_async_run(pack_id))
