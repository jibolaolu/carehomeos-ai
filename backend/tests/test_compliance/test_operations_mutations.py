import asyncio

from app.routers.residents import ResidentWrite, create_resident, update_resident
from app.routers.rota import RotaShiftWrite, create_rota_shift
from app.routers.staff import StaffWrite, create_staff


def test_admin_can_create_and_update_resident_record():
    resident = asyncio.run(
        create_resident(
            ResidentWrite(
                name="E2E Resident",
                room="3B",
                age=84,
                primary_need="Residential care",
                care_plan_review="2026-05-15",
            )
        )
    )
    updated = asyncio.run(
        update_resident(
            resident["id"],
            ResidentWrite(
                name="E2E Resident Updated",
                room="3B",
                age=84,
                primary_need="Residential care with mobility support",
                falls_risk="high",
                hydration="watch",
                care_plan_review="2026-05-20",
            ),
        )
    )

    assert updated["name"] == "E2E Resident Updated"
    assert updated["falls_risk"] == "high"


def test_admin_can_create_staff_and_rota_shift():
    member = asyncio.run(create_staff(StaffWrite(name="E2E Carer", role="Carer", shift="07:30-15:30", training=92)))
    shift = asyncio.run(create_rota_shift(RotaShiftWrite(day="Tuesday", time="07:30-15:30", staff=member["name"], role=member["role"])))

    assert member["training"] == 92
    assert shift["staff"] == "E2E Carer"
