from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_home import CareHome
from app.models.incident import Incident
from app.models.resident import Resident
from app.models.safeguarding import SafeguardingAlert
from app.models.user import User
from app.services.safeguarding.incident_logger import IncidentLogger


@pytest.mark.asyncio
async def test_create_incident_auto_flags_safeguarding(
    db_session: AsyncSession,
    test_care_home: CareHome,
    test_resident: Resident,
    test_user: User,
) -> None:
    logger = IncidentLogger(db_session)
    incident = await logger.create_incident(
        care_home_id=test_care_home.id,
        reported_by_id=test_user.id,
        data={
            "resident_id": test_resident.id,
            "title": "Bruising observed",
            "description": "Staff noticed unexplained bruising on resident's arm during personal care.",
            "immediate_action_taken": "Photographed, senior notified, GP called.",
            "severity": "high",
        },
    )

    assert incident.is_safeguarding is True
    assert incident.safeguarding_category is not None

    alerts = await db_session.execute(
        __import__("sqlalchemy", fromlist=["select"]).select(SafeguardingAlert).where(SafeguardingAlert.incident_id == incident.id)
    )
    alert = alerts.scalar_one_or_none()
    assert alert is not None
    assert alert.category == "physical"
    assert alert.severity == "high"


@pytest.mark.asyncio
async def test_create_incident_no_safeguarding(
    db_session: AsyncSession,
    test_care_home: CareHome,
    test_resident: Resident,
    test_user: User,
) -> None:
    logger = IncidentLogger(db_session)
    incident = await logger.create_incident(
        care_home_id=test_care_home.id,
        reported_by_id=test_user.id,
        data={
            "resident_id": test_resident.id,
            "title": "Routine check",
            "description": "Weather was pleasant. Resident enjoyed breakfast in the garden. No concerns.",
            "immediate_action_taken": "Continued observation.",
            "severity": "low",
        },
    )

    assert incident.is_safeguarding is False


@pytest.mark.asyncio
async def test_list_incidents_filters(
    db_session: AsyncSession,
    test_care_home: CareHome,
    test_resident: Resident,
    test_user: User,
) -> None:
    logger = IncidentLogger(db_session)
    for title, desc, is_sg in [
        ("Fall", "Resident fell but no injury", False),
        ("Bruise", "Unexplained bruising", True),
    ]:
        await logger.create_incident(
            care_home_id=test_care_home.id,
            reported_by_id=test_user.id,
            data={
                "resident_id": test_resident.id,
                "title": title,
                "description": desc,
                "immediate_action_taken": "Action",
            },
        )

    items, total = await logger.list_incidents(test_care_home.id, is_safeguarding=True)
    assert total >= 1
    assert all(i.is_safeguarding for i in items)
