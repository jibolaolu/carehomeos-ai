"""Seed minimal reference data for local development and dashboard API flows."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_home import CareHome
from app.models.resident import Resident
from app.models.user import User

HOME_ID = "home-oakfield"
USER_ID = "user-manager"


async def ensure_reference_data(session: AsyncSession) -> None:
    existing = await session.execute(select(CareHome).where(CareHome.id == HOME_ID))
    if existing.scalar_one_or_none() is not None:
        return

    session.add(
        CareHome(
            id=HOME_ID,
            name="Oakfield House",
            registration_number="1-1234567890",
            address_line_1="12 Meadow Lane",
            city="Bristol",
            postcode="BS1 4QT",
            phone="0117 496 0000",
            email="manager@oakfield.local",
            nation="england",
            cqc_rating="Good",
            total_beds=42,
            occupied_beds=38,
            subscription_tier="professional",
            subscription_status="active",
        )
    )

    session.add(
        User(
            id=USER_ID,
            email="manager@oakfield.local",
            first_name="Ruth",
            last_name="Manager",
            role="care_home_admin",
            care_home_id=HOME_ID,
        )
    )

    residents = [
        ("res-001", "Margaret", "Ellis", "12A", "Dementia support and mobility assistance"),
        ("res-002", "George", "Patel", "14B", "Diabetes management and falls prevention"),
        ("res-003", "Evelyn", "Morgan", "16C", "End-of-life comfort care and pain management"),
    ]
    for resident_id, first, last, room, primary_need in residents:
        session.add(
            Resident(
                id=resident_id,
                care_home_id=HOME_ID,
                first_name=first,
                last_name=last,
                date_of_birth=date(1938, 4, 12),
                gender="female" if first in {"Margaret", "Evelyn"} else "male",
                room=room,
                admission_date=date(2024, 1, 15),
                primary_need=primary_need,
            )
        )

    await session.commit()
