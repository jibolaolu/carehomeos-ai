from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from starlette.requests import Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.api_key import ApiKey
from app.models.care_note import CareNote
from app.models.incident import Incident
from app.models.medication import Medication
from app.models.resident import Resident
from app.services.rate_limiter import RateLimitExceeded, hash_api_key, rate_limiter

router = APIRouter(tags=["public api"])

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class ApiKeyAuth:
    def __init__(self) -> None:
        pass

    async def __call__(
        self,
        request: Request,
        x_api_key: str = Header(..., alias="X-API-Key"),
        db: AsyncSession = Depends(get_db),
    ) -> ApiKey:
        if not x_api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing X-API-Key header",
            )

        key_hash = hash_api_key(x_api_key)
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active == True,
            )
        )
        api_key = result.scalar_one_or_none()

        if api_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked API key",
            )

        # Simple rate limiting per API key
        allowed, headers = await rate_limiter.is_allowed(
            identifier=api_key.id,
            limit=api_key.rate_limit_per_hour,
        )
        if not allowed:
            retry_after = int(headers.get("Retry-After", 3600))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={"Retry-After": str(retry_after), **headers},
            )

        # Attach headers to response
        request.state.rate_limit_headers = headers
        return api_key


get_api_key = ApiKeyAuth()


def _paginated_response(
    items: list[dict[str, Any]],
    total: int,
    page: int,
    page_size: int,
    request: Request,
) -> dict[str, Any]:
    base_url = str(request.url).split("?")[0]
    pages = (total + page_size - 1) // page_size
    response = {
        "data": items,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
        },
        "links": {
            "self": f"{base_url}?page={page}&page_size={page_size}",
            "first": f"{base_url}?page=1&page_size={page_size}",
            "last": f"{base_url}?page={max(1, pages)}&page_size={page_size}",
        },
    }
    if page > 1:
        response["links"]["prev"] = f"{base_url}?page={page - 1}&page_size={page_size}"
    if page < pages:
        response["links"]["next"] = f"{base_url}?page={page + 1}&page_size={page_size}"
    return response


@router.get("/residents")
async def list_residents(
    request: Request,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    status_filter: str | None = None,
    api_key: ApiKey = Depends(get_api_key),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    page_size = min(page_size, MAX_PAGE_SIZE)

    care_home_id = api_key.care_home_id
    stmt = select(Resident).where(Resident.care_home_id == care_home_id)
    if status_filter:
        stmt = stmt.where(Resident.status == status_filter.lower())

    count_result = await db.execute(select(Resident).where(Resident.care_home_id == care_home_id))
    total = len(count_result.scalars().all())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    residents = result.scalars().all()

    items = [
        {
            "id": r.id,
            "nhs_number": r.nhs_number,
            "title": r.title,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "preferred_name": r.preferred_name,
            "date_of_birth": r.date_of_birth.isoformat() if r.date_of_birth else None,
            "gender": r.gender,
            "room": r.room,
            "admission_date": r.admission_date.isoformat() if r.admission_date else None,
            "status": r.status,
            "primary_need": r.primary_need,
            "mobility": r.mobility,
            "falls_risk": r.falls_risk,
            "hydration_status": r.hydration_status,
            "nutrition_status": r.nutrition_status,
            "allergies": r.allergies,
            "dietary_requirements": r.dietary_requirements,
            "family_contact_name": r.family_contact_name,
            "family_contact_phone": r.family_contact_phone,
            "next_of_kin_name": r.next_of_kin_name,
            "next_of_kin_phone": r.next_of_kin_phone,
        }
        for r in residents
    ]
    return _paginated_response(items, total, page, page_size, request)


@router.get("/residents/{resident_id}")
async def get_resident(
    resident_id: str,
    api_key: ApiKey = Depends(get_api_key),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(
        select(Resident).where(
            Resident.id == resident_id,
            Resident.care_home_id == api_key.care_home_id,
        )
    )
    resident = result.scalar_one_or_none()
    if resident is None:
        raise HTTPException(status_code=404, detail="Resident not found")

    return {
        "id": resident.id,
        "nhs_number": resident.nhs_number,
        "title": resident.title,
        "first_name": resident.first_name,
        "last_name": resident.last_name,
        "preferred_name": resident.preferred_name,
        "date_of_birth": resident.date_of_birth.isoformat() if resident.date_of_birth else None,
        "gender": resident.gender,
        "room": resident.room,
        "admission_date": resident.admission_date.isoformat() if resident.admission_date else None,
        "status": resident.status,
        "primary_need": resident.primary_need,
        "secondary_needs": resident.secondary_needs,
        "mobility": resident.mobility,
        "falls_risk": resident.falls_risk,
        "deterioration_risk": resident.deterioration_risk,
        "hydration_status": resident.hydration_status,
        "nutrition_status": resident.nutrition_status,
        "skin_condition": resident.skin_condition,
        "continence_status": resident.continence_status,
        "communication_needs": resident.communication_needs,
        "cognitive_status": resident.cognitive_status,
        "dnar_status": resident.dnar_status,
        "allergies": resident.allergies,
        "dietary_requirements": resident.dietary_requirements,
        "weight_kg": resident.weight_kg,
        "height_cm": resident.height_cm,
        "bmi": resident.bmi,
        "family_contact_name": resident.family_contact_name,
        "family_contact_phone": resident.family_contact_phone,
        "family_contact_email": resident.family_contact_email,
        "family_contact_relationship": resident.family_contact_relationship,
        "next_of_kin_name": resident.next_of_kin_name,
        "next_of_kin_phone": resident.next_of_kin_phone,
        "lpa_health_welfare": resident.lpa_health_welfare,
    }


@router.get("/care-notes")
async def list_care_notes(
    request: Request,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    resident_id: str | None = None,
    note_type: str | None = None,
    api_key: ApiKey = Depends(get_api_key),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    page_size = min(page_size, MAX_PAGE_SIZE)
    care_home_id = api_key.care_home_id

    # Join via resident to filter by care_home
    stmt = select(CareNote).join(Resident).where(Resident.care_home_id == care_home_id)
    if resident_id:
        stmt = stmt.where(CareNote.resident_id == resident_id)
    if note_type:
        stmt = stmt.where(CareNote.note_type == note_type)

    count_result = await db.execute(stmt)
    total = len(count_result.scalars().all())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    notes = result.scalars().all()

    items = [
        {
            "id": n.id,
            "resident_id": n.resident_id,
            "note_type": n.note_type,
            "content": n.content,
            "recorded_at": n.recorded_at.isoformat() if n.recorded_at else None,
            "ai_generated": n.ai_generated,
            "quality_gate_passed": n.quality_gate_passed,
            "cqc_tags": n.cqc_tags,
            "safeguarding_flags": n.safeguarding_flags,
            "mood_assessment": n.mood_assessment,
            "pain_score": n.pain_score,
        }
        for n in notes
    ]
    return _paginated_response(items, total, page, page_size, request)


@router.get("/incidents")
async def list_incidents(
    request: Request,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    status_filter: str | None = None,
    severity: str | None = None,
    api_key: ApiKey = Depends(get_api_key),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    page_size = min(page_size, MAX_PAGE_SIZE)
    care_home_id = api_key.care_home_id

    stmt = select(Incident).where(Incident.care_home_id == care_home_id)
    if status_filter:
        stmt = stmt.where(Incident.status == status_filter)
    if severity:
        stmt = stmt.where(Incident.severity == severity)

    count_result = await db.execute(stmt)
    total = len(count_result.scalars().all())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    incidents = result.scalars().all()

    items = [
        {
            "id": i.id,
            "resident_id": i.resident_id,
            "incident_type": i.incident_type,
            "category": i.category,
            "severity": i.severity,
            "status": i.status,
            "title": i.title,
            "description": i.description,
            "location": i.location,
            "incident_date": i.incident_date.isoformat() if i.incident_date else None,
            "is_safeguarding": i.is_safeguarding,
            "is_riddor": i.is_riddor,
            "duty_of_candour_triggered": i.duty_of_candour_triggered,
            "family_notified": i.family_notified,
        }
        for i in incidents
    ]
    return _paginated_response(items, total, page, page_size, request)


@router.get("/medications")
async def list_medications(
    request: Request,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    resident_id: str | None = None,
    status_filter: str | None = None,
    api_key: ApiKey = Depends(get_api_key),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    page_size = min(page_size, MAX_PAGE_SIZE)
    care_home_id = api_key.care_home_id

    stmt = select(Medication).join(Resident).where(Resident.care_home_id == care_home_id)
    if resident_id:
        stmt = stmt.where(Medication.resident_id == resident_id)
    if status_filter:
        stmt = stmt.where(Medication.status == status_filter)

    count_result = await db.execute(stmt)
    total = len(count_result.scalars().all())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    medications = result.scalars().all()

    items = [
        {
            "id": m.id,
            "resident_id": m.resident_id,
            "name": m.name,
            "generic_name": m.generic_name,
            "strength": m.strength,
            "form": m.form,
            "route": m.route,
            "frequency": m.frequency,
            "prescribed_dose": m.prescribed_dose,
            "is_controlled_drug": m.is_controlled_drug,
            "is_prn": m.is_prn,
            "status": m.status,
            "prescribed_by": m.prescribed_by,
            "prescribed_date": m.prescribed_date.isoformat() if m.prescribed_date else None,
            "review_date": m.review_date.isoformat() if m.review_date else None,
            "pharmacy_name": m.pharmacy_name,
            "instructions": m.instructions,
        }
        for m in medications
    ]
    return _paginated_response(items, total, page, page_size, request)
