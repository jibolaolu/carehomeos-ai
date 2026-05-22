from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_home import CareHome
from app.models.care_note import CareNote
from app.models.incident import Incident
from app.models.resident import Resident
from app.models.shift import Shift
from app.models.staff import Staff


async def generate_group_dashboard(
    db: AsyncSession,
    care_home_ids: list[str],
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, Any]:
    """Generate cross-home KPI dashboard data."""
    if end_date is None:
        end_date = date.today()
    if start_date is None:
        start_date = end_date - timedelta(days=30)

    result = {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "homes": [],
        "aggregates": {},
    }

    for home_id in care_home_ids:
        home_data = await _get_home_kpis(db, home_id, start_date, end_date)
        result["homes"].append(home_data)

    # Calculate aggregates
    result["aggregates"] = _calculate_aggregates(result["homes"])
    return result


async def _get_home_kpis(
    db: AsyncSession,
    home_id: str,
    start_date: date,
    end_date: date,
) -> dict[str, Any]:
    """Get KPIs for a single care home."""
    # Occupancy
    resident_count = await db.scalar(
        select(func.count(Resident.id))
        .where(Resident.care_home_id == home_id)
        .where(Resident.status == "active")
    )

    home = await db.get(CareHome, home_id)
    total_beds = home.total_beds if home else 0
    occupancy_rate = (resident_count / total_beds * 100) if total_beds > 0 else 0

    # Care notes count
    care_notes_count = await db.scalar(
        select(func.count(CareNote.id))
        .where(CareNote.created_at >= datetime.combine(start_date, datetime.min.time()))
        .where(CareNote.created_at <= datetime.combine(end_date, datetime.max.time()))
    )

    # Incidents
    incidents_count = await db.scalar(
        select(func.count(Incident.id))
        .where(Incident.care_home_id == home_id)
        .where(Incident.incident_date >= datetime.combine(start_date, datetime.min.time()))
        .where(Incident.incident_date <= datetime.combine(end_date, datetime.max.time()))
    )

    high_severity_incidents = await db.scalar(
        select(func.count(Incident.id))
        .where(Incident.care_home_id == home_id)
        .where(Incident.severity == "High")
        .where(Incident.incident_date >= datetime.combine(start_date, datetime.min.time()))
    )

    # Staff
    staff_count = await db.scalar(
        select(func.count(Staff.id))
        .where(Staff.care_home_id == home_id)
        .where(Staff.is_active == True)
    )

    agency_staff = await db.scalar(
        select(func.count(Staff.id))
        .where(Staff.care_home_id == home_id)
        .where(Staff.is_agency == True)
        .where(Staff.is_active == True)
    )

    return {
        "home_id": home_id,
        "home_name": home.name if home else "Unknown",
        "residents": {
            "total": resident_count,
            "occupied_beds": home.occupied_beds if home else 0,
            "total_beds": total_beds,
            "occupancy_rate": round(occupancy_rate, 1),
        },
        "care_notes": {
            "count": care_notes_count,
            "per_resident_per_day": round(care_notes_count / (resident_count * 30), 1) if resident_count > 0 else 0,
        },
        "incidents": {
            "total": incidents_count,
            "high_severity": high_severity_incidents,
            "rate_per_1000_bed_days": round(incidents_count / (total_beds * 30) * 1000, 1) if total_beds > 0 else 0,
        },
        "staff": {
            "total": staff_count,
            "agency": agency_staff,
            "agency_percentage": round(agency_staff / staff_count * 100, 1) if staff_count > 0 else 0,
        },
    }


def _calculate_aggregates(homes: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate aggregate KPIs across all homes."""
    if not homes:
        return {}

    total_beds = sum(h["residents"]["total_beds"] for h in homes)
    occupied_beds = sum(h["residents"]["occupied_beds"] for h in homes)
    total_incidents = sum(h["incidents"]["total"] for h in homes)
    total_staff = sum(h["staff"]["total"] for h in homes)
    total_agency = sum(h["staff"]["agency"] for h in homes)

    return {
        "homes_count": len(homes),
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "overall_occupancy": round(occupied_beds / total_beds * 100, 1) if total_beds > 0 else 0,
        "total_incidents": total_incidents,
        "incident_rate_per_1000": round(total_incidents / (total_beds * 30) * 1000, 1) if total_beds > 0 else 0,
        "total_staff": total_staff,
        "agency_staff": total_agency,
        "agency_percentage": round(total_agency / total_staff * 100, 1) if total_staff > 0 else 0,
    }


async def generate_cqc_pir_data(
    db: AsyncSession,
    care_home_id: str,
) -> dict[str, Any]:
    """Generate CQC Provider Information Return pre-populated data."""
    home = await db.get(CareHome, care_home_id)
    if not home:
        return {"error": "Care home not found"}

    resident_count = await db.scalar(
        select(func.count(Resident.id))
        .where(Resident.care_home_id == care_home_id)
        .where(Resident.status == "active")
    )

    staff_count = await db.scalar(
        select(func.count(Staff.id))
        .where(Staff.care_home_id == care_home_id)
        .where(Staff.is_active == True)
    )

    return {
        "provider_name": home.name,
        "registration_number": home.registration_number,
        "address": {
            "line_1": home.address_line_1,
            "line_2": home.address_line_2,
            "city": home.city,
            "postcode": home.postcode,
        },
        "capacity": {
            "total_beds": home.total_beds,
            "occupied_beds": home.occupied_beds,
            "vacant_beds": home.total_beds - home.occupied_beds,
        },
        "residents": {
            "total": resident_count,
            "nursing_care": 0,  # Would need nursing care flag on resident
            "dementia_care": 0,
            "mental_health": 0,
            "learning_disability": 0,
            "physical_disability": 0,
            "sensory_impairment": 0,
            "substance_misuse": 0,
            " palliative_care": 0,
        },
        "staff": {
            "total": staff_count,
            "registered_nurses": 0,
            "care_workers": 0,
            "senior_care_workers": 0,
            "manager": 0,
            "admin": 0,
            "maintenance": 0,
            "catering": 0,
            "agency_usage_percentage": 0,
        },
        "quality_indicators": {
            "cqc_rating": home.cqc_rating,
            "complaints_received": 0,
            "complaints_upheld": 0,
            "enforcement_actions": 0,
            "safeguarding_alerts": 0,
            "safeguarding_concerns": 0,
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


async def generate_staffing_analytics(
    db: AsyncSession,
    care_home_id: str,
    months: int = 6,
) -> dict[str, Any]:
    """Generate staffing analytics report."""
    end_date = date.today()
    start_date = end_date - timedelta(days=30 * months)

    staff_list = await db.execute(
        select(Staff)
        .where(Staff.care_home_id == care_home_id)
        .where(Staff.is_active == True)
    )
    staff = staff_list.scalars().all()

    shifts_data = await db.execute(
        select(Shift)
        .where(Shift.care_home_id == care_home_id)
        .where(Shift.shift_date >= start_date)
        .where(Shift.shift_date <= end_date)
    )
    shifts = shifts_data.scalars().all()

    agency_shifts = [s for s in shifts if s.is_agency_cover]
    overtime_shifts = [s for s in shifts if s.overtime_minutes > 0]

    return {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "workforce": {
            "total_staff": len(staff),
            "permanent_staff": len([s for s in staff if not s.is_agency]),
            "agency_staff": len([s for s in staff if s.is_agency]),
            "nurses": len([s for s in staff if s.nurse_pin]),
            "care_workers": len([s for s in staff if s.role == "carer"]),
        },
        "shift_coverage": {
            "total_shifts": len(shifts),
            "agency_shifts": len(agency_shifts),
            "agency_percentage": round(len(agency_shifts) / len(shifts) * 100, 1) if shifts else 0,
            "overtime_instances": len(overtime_shifts),
            "total_overtime_minutes": sum(s.overtime_minutes for s in overtime_shifts),
        },
        "sickness": {
            "total_absences_ytd": sum(s.sickness_absences_ytd for s in staff),
            "staff_with_absences": len([s for s in staff if s.sickness_absences_ytd > 0]),
        },
        "training": {
            "staff_with_expired_training": len([
                s for s in staff
                if s.training_expiry_dates and any(
                    date.fromisoformat(t.split(":")[1]) < date.today()
                    for t in s.training_expiry_dates.split(",")
                    if ":" in t
                )
            ]),
        },
    }
