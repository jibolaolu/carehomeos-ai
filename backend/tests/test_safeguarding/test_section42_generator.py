from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_home import CareHome
from app.models.incident import Incident
from app.models.resident import Resident
from app.models.safeguarding import SafeguardingCase
from app.models.user import User
from app.services.safeguarding.section42_generator import Section42Generator


@pytest.mark.asyncio
async def test_generate_section42(
    db_session: AsyncSession,
    test_care_home: CareHome,
    test_resident: Resident,
    test_user: User,
    test_case: SafeguardingCase,
) -> None:
    # Seed an incident to give the generator evidence
    incident = Incident(
        care_home_id=test_care_home.id,
        resident_id=test_resident.id,
        reported_by_id=test_user.id,
        incident_type="safeguarding_concern",
        category="safeguarding",
        severity="high",
        status="open",
        title="Bruising",
        description="Unexplained bruising on arm.",
        immediate_action_taken="Senior notified.",
        incident_date=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        reported_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        is_safeguarding=True,
    )
    db_session.add(incident)
    await db_session.flush()

    generator = Section42Generator(db_session)
    enquiry = await generator.generate(
        care_home_id=test_care_home.id,
        case_id=test_case.id,
        user_id=test_user.id,
    )

    assert enquiry.safeguarding_case_id == test_case.id
    assert enquiry.reference.startswith("S42-")
    assert enquiry.status == "draft"
    assert enquiry.summary is not None
    assert enquiry.narrative is not None

    # Case status should advance
    assert test_case.status == "section42_enquiry"
