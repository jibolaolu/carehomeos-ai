from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.care_home import CareHome
from app.models.care_note import CareNote
from app.models.incident import Incident
from app.models.resident import Resident
from app.models.staff import Staff
from app.models.vital_signs import VitalSigns

router = APIRouter(prefix="/reports", tags=["reports"])


class CustomReportRequest(BaseModel):
    care_home_ids: list[str] | None = None
    metrics: list[str] = Field(default_factory=list)
    date_from: date | None = None
    date_to: date | None = None
    group_by: str | None = None


@router.get("/group-dashboard")
async def group_dashboard(
    group_parent_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Cross-home KPIs for group operators."""
    stmt = select(CareHome)
    if group_parent_id:
        stmt = stmt.where(CareHome.group_parent_id == group_parent_id)
    result = await db.execute(stmt)
    homes = result.scalars().all()

    home_ids = [h.id for h in homes]
    total_beds = sum(h.total_beds for h in homes)
    occupied_beds = sum(h.occupied_beds for h in homes)
    occupancy_rate = (occupied_beds / total_beds * 100) if total_beds else 0.0

    # Count residents
    resident_result = await db.execute(
        select(func.count(Resident.id)).where(Resident.care_home_id.in_(home_ids))
    )
    total_residents = resident_result.scalar() or 0

    # Count incidents (last 30 days)
    from datetime import timedelta
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    incident_result = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.care_home_id.in_(home_ids),
            Incident.incident_date >= thirty_days_ago,
        )
    )
    incidents_30d = incident_result.scalar() or 0

    # Average NEWS2 score
    news2_result = await db.execute(
        select(func.avg(VitalSigns.news2_score)).where(
            VitalSigns.resident_id.in_(
                select(Resident.id).where(Resident.care_home_id.in_(home_ids))
            )
        )
    )
    avg_news2 = news2_result.scalar()

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "homes_count": len(homes),
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "occupancy_rate": round(occupancy_rate, 2),
        "total_residents": total_residents,
        "incidents_30d": incidents_30d,
        "avg_news2_score": round(float(avg_news2), 2) if avg_news2 else None,
        "homes": [
            {
                "id": h.id,
                "name": h.name,
                "total_beds": h.total_beds,
                "occupied_beds": h.occupied_beds,
                "cqc_rating": h.cqc_rating,
            }
            for h in homes
        ],
    }


@router.get("/cqc-pir")
async def cqc_pir(
    care_home_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Pre-populate CQC Provider Information Return (PIR) data."""
    home_result = await db.execute(select(CareHome).where(CareHome.id == care_home_id))
    home = home_result.scalar_one_or_none()
    if home is None:
        raise HTTPException(status_code=404, detail="Care home not found")

    resident_count_result = await db.execute(
        select(func.count(Resident.id)).where(Resident.care_home_id == care_home_id)
    )
    resident_count = resident_count_result.scalar() or 0

    staff_result = await db.execute(
        select(func.count(Staff.id)).where(Staff.care_home_id == care_home_id)
    )
    staff_count = staff_result.scalar() or 0

    incident_result = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.care_home_id == care_home_id,
            Incident.is_safeguarding == True,
        )
    )
    safeguarding_count = incident_result.scalar() or 0

    return {
        "care_home_id": care_home_id,
        "care_home_name": home.name,
        "registration_number": home.registration_number,
        "total_beds": home.total_beds,
        "occupied_beds": home.occupied_beds,
        "resident_count": resident_count,
        "staff_count": staff_count,
        "safeguarding_incidents": safeguarding_count,
        "cqc_rating": home.cqc_rating,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pir_sections": {
            "safe": {
                "safeguarding_incidents": safeguarding_count,
                "notes": "Auto-populated from incident records",
            },
            "effective": {
                "resident_count": resident_count,
                "staff_count": staff_count,
                "notes": "Auto-populated from resident and staff records",
            },
            "caring": {
                "notes": "Requires manual review and resident feedback",
            },
            "responsive": {
                "notes": "Requires manual review",
            },
            "well_led": {
                "notes": "Requires manual review",
            },
        },
    }


@router.get("/staffing-analytics")
async def staffing_analytics(
    care_home_id: str,
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Staffing analytics and ratios."""
    resident_count_result = await db.execute(
        select(func.count(Resident.id)).where(Resident.care_home_id == care_home_id)
    )
    resident_count = resident_count_result.scalar() or 0

    staff_result = await db.execute(
        select(Staff).where(Staff.care_home_id == care_home_id)
    )
    staff = staff_result.scalars().all()

    total_staff = len(staff)
    ratio = round(resident_count / total_staff, 2) if total_staff else 0.0

    return {
        "care_home_id": care_home_id,
        "date_from": date_from.isoformat() if date_from else None,
        "date_to": date_to.isoformat() if date_to else None,
        "resident_count": resident_count,
        "total_staff": total_staff,
        "resident_to_staff_ratio": ratio,
        "staff_breakdown": {
            "registered_nurses": sum(1 for s in staff if s.role == "registered_nurse"),
            "care_assistants": sum(1 for s in staff if s.role == "care_assistant"),
            "senior_carers": sum(1 for s in staff if s.role == "senior_carer"),
            "others": sum(1 for s in staff if s.role not in ("registered_nurse", "care_assistant", "senior_carer")),
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/financial-benchmarking")
async def financial_benchmarking(
    care_home_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Financial benchmarking data."""
    home_result = await db.execute(select(CareHome).where(CareHome.id == care_home_id))
    home = home_result.scalar_one_or_none()
    if home is None:
        raise HTTPException(status_code=404, detail="Care home not found")

    resident_count_result = await db.execute(
        select(func.count(Resident.id)).where(Resident.care_home_id == care_home_id)
    )
    resident_count = resident_count_result.scalar() or 0

    # Stub financial data
    weekly_rate = 850.0
    total_weekly_revenue = resident_count * weekly_rate
    estimated_annual_revenue = total_weekly_revenue * 52

    return {
        "care_home_id": care_home_id,
        "care_home_name": home.name,
        "resident_count": resident_count,
        "total_beds": home.total_beds,
        "occupancy_rate": round(home.occupied_beds / home.total_beds * 100, 2) if home.total_beds else 0.0,
        "estimated_weekly_revenue": total_weekly_revenue,
        "estimated_annual_revenue": estimated_annual_revenue,
        "average_weekly_rate_per_resident": weekly_rate,
        "benchmarks": {
            "national_avg_weekly_rate": 950.0,
            "regional_avg_weekly_rate": 900.0,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/custom")
async def custom_report(
    payload: CustomReportRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Dynamic report builder."""
    care_home_ids = payload.care_home_ids or []
    metrics = payload.metrics or ["resident_count", "incident_count"]
    results: dict[str, Any] = {"metrics": {}}

    if "resident_count" in metrics:
        stmt = select(func.count(Resident.id))
        if care_home_ids:
            stmt = stmt.where(Resident.care_home_id.in_(care_home_ids))
        count_result = await db.execute(stmt)
        results["metrics"]["resident_count"] = count_result.scalar() or 0

    if "incident_count" in metrics:
        stmt = select(func.count(Incident.id))
        if care_home_ids:
            stmt = stmt.where(Incident.care_home_id.in_(care_home_ids))
        if payload.date_from and payload.date_to:
            from datetime import datetime as _dt
            date_from_dt = _dt.combine(payload.date_from, _dt.min.time())
            date_to_dt = _dt.combine(payload.date_to, _dt.min.time())
            stmt = stmt.where(Incident.incident_date >= date_from_dt, Incident.incident_date <= date_to_dt)
        count_result = await db.execute(stmt)
        results["metrics"]["incident_count"] = count_result.scalar() or 0

    if "care_note_count" in metrics:
        stmt = select(func.count(CareNote.id))
        if care_home_ids:
            stmt = stmt.join(Resident).where(Resident.care_home_id.in_(care_home_ids))
        count_result = await db.execute(stmt)
        results["metrics"]["care_note_count"] = count_result.scalar() or 0

    results["generated_at"] = datetime.now(timezone.utc).isoformat()
    results["parameters"] = payload.model_dump()
    return results
