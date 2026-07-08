from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_home import CareHome
from app.models.incident import Incident
from app.models.resident import Resident
from app.models.safeguarding import RiskPattern
from app.models.user import User
from app.services.safeguarding.pattern_detector import PatternDetector


@pytest.mark.asyncio
async def test_detect_pattern_from_incident(
    db_session: AsyncSession,
    test_care_home: CareHome,
    test_resident: Resident,
    test_user: User,
) -> None:
    incident = Incident(
        care_home_id=test_care_home.id,
        resident_id=test_resident.id,
        reported_by_id=test_user.id,
        incident_type="safeguarding_concern",
        category="safeguarding",
        severity="high",
        status="open",
        title="Bruising incident",
        description="Resident presented with bruising on upper arm after morning care.",
        immediate_action_taken="Photographed and reported to senior.",
        incident_date=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        reported_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        is_safeguarding=True,
    )
    db_session.add(incident)
    await db_session.flush()

    detector = PatternDetector(db_session)
    pattern = await detector.scan_resident(
        care_home_id=test_care_home.id,
        resident_id=test_resident.id,
        user_id=test_user.id,
        time_window_days=30,
    )

    assert pattern is not None
    assert isinstance(pattern, RiskPattern)
    assert pattern.resident_id == test_resident.id
    assert pattern.summary is not None
