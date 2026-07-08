from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_home import CareHome
from app.models.resident import Resident
from app.models.safeguarding import SafeguardingAlert, SafeguardingCase
from app.models.user import User


@pytest.mark.asyncio
async def test_create_case(
    db_session: AsyncSession,
    test_care_home: CareHome,
    test_resident: Resident,
    test_user: User,
) -> None:
    case = SafeguardingCase(
        care_home_id=test_care_home.id,
        resident_id=test_resident.id,
        reference="SG-TEST-001",
        status="open",
        opened_by_user_id=test_user.id,
    )
    db_session.add(case)
    await db_session.flush()

    result = await db_session.execute(select(SafeguardingCase).where(SafeguardingCase.id == case.id))
    fetched = result.scalar_one()
    assert fetched.reference == "SG-TEST-001"
    assert fetched.status == "open"


@pytest.mark.asyncio
async def test_alert_linked_to_case(
    db_session: AsyncSession,
    test_care_home: CareHome,
    test_resident: Resident,
    test_user: User,
    test_case: SafeguardingCase,
) -> None:
    alert = SafeguardingAlert(
        care_home_id=test_care_home.id,
        resident_id=test_resident.id,
        source_type="manual",
        category="physical",
        severity="high",
        title="Test alert",
        description="Test description",
        safeguarding_case_id=test_case.id,
        triggered_by_user_id=test_user.id,
    )
    db_session.add(alert)
    await db_session.flush()

    result = await db_session.execute(select(SafeguardingAlert).where(SafeguardingAlert.id == alert.id))
    fetched = result.scalar_one()
    assert fetched.safeguarding_case_id == test_case.id
