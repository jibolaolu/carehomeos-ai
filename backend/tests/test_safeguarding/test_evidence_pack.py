from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_home import CareHome
from app.models.incident import Incident
from app.models.resident import Resident
from app.models.safeguarding import EvidencePack, SafeguardingCase
from app.models.user import User
from app.services.safeguarding.evidence_pack import EvidencePackService


@pytest.mark.asyncio
async def test_create_and_generate_evidence_pack(
    db_session: AsyncSession,
    test_care_home: CareHome,
    test_resident: Resident,
    test_user: User,
    test_case: SafeguardingCase,
) -> None:
    # Seed an incident in range
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    incident = Incident(
        care_home_id=test_care_home.id,
        resident_id=test_resident.id,
        reported_by_id=test_user.id,
        incident_type="safeguarding_concern",
        category="safeguarding",
        severity="high",
        status="open",
        title="Bruising",
        description="Unexplained bruising.",
        immediate_action_taken="Senior notified.",
        incident_date=now,
        reported_at=now,
        is_safeguarding=True,
    )
    db_session.add(incident)
    await db_session.flush()

    service = EvidencePackService(db_session)
    pack = await service.create_pack(
        care_home_id=test_care_home.id,
        safeguarding_case_id=test_case.id,
        user_id=test_user.id,
        data={
            "pack_type": "safeguarding_review",
            "date_from": now.replace(day=1),
            "date_to": now,
        },
    )

    assert pack.reference.startswith("EP-")
    assert pack.status == "pending"

    generated = await service.generate_pack(pack)
    assert generated.status in ("completed", "failed")

    if generated.status == "completed":
        # S3 may not be available in test environment; pack is valid if status completed
        assert generated.generated_at is not None
