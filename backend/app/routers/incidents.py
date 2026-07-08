from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.safeguarding import IncidentCreate, IncidentOut, IncidentUpdate, PaginatedResponse
from app.services.ai.incident_analyser import analyse_incident
from app.services.safeguarding.incident_logger import IncidentLogger

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _get_user(request: Request) -> dict[str, Any]:
    user = request.scope.get("state", {}).get("user") or {}
    if not user.get("care_home_id"):
        raise HTTPException(status_code=401, detail="Authenticated user required")
    return user


@router.get("", response_model=PaginatedResponse)
async def list_incidents(
    request: Request,
    resident_id: str | None = None,
    status: str | None = None,
    is_safeguarding: bool | None = None,
    severity: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user = _get_user(request)
    logger = IncidentLogger(db)
    items, total = await logger.list_incidents(
        care_home_id=str(user["care_home_id"]),
        resident_id=resident_id,
        status=status,
        is_safeguarding=is_safeguarding,
        severity=severity,
        limit=limit,
        offset=offset,
    )
    return {"items": [IncidentOut.model_validate(i) for i in items], "total": total}


@router.post("", response_model=IncidentOut, status_code=201)
async def create_incident(
    request: Request,
    payload: IncidentCreate,
    db: AsyncSession = Depends(get_db),
) -> IncidentOut:
    user = _get_user(request)
    logger = IncidentLogger(db)
    incident = await logger.create_incident(
        care_home_id=str(user["care_home_id"]),
        reported_by_id=str(user.get("id", "local-manager")),
        data=payload.model_dump(),
    )
    return IncidentOut.model_validate(incident)


@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(
    incident_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> IncidentOut:
    user = _get_user(request)
    logger = IncidentLogger(db)
    incident = await logger.get_incident(incident_id, str(user["care_home_id"]))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return IncidentOut.model_validate(incident)


@router.patch("/{incident_id}", response_model=IncidentOut)
async def update_incident(
    incident_id: str,
    request: Request,
    payload: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
) -> IncidentOut:
    user = _get_user(request)
    logger = IncidentLogger(db)
    incident = await logger.get_incident(incident_id, str(user["care_home_id"]))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    updated = await logger.update_incident(
        incident=incident,
        data=payload.model_dump(exclude_unset=True),
        user_id=str(user.get("id", "local-manager")),
    )
    return IncidentOut.model_validate(updated)


@router.post("/{incident_id}/analyse")
async def analyse_incident_endpoint(
    incident_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Run AI incident analysis using Claude Opus."""
    user = _get_user(request)
    logger = IncidentLogger(db)
    incident = await logger.get_incident(incident_id, str(user["care_home_id"]))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident_dict = {
        "id": str(incident.id),
        "type": incident.incident_type,
        "severity": incident.severity,
        "occurred_at": incident.occurred_at.isoformat() if incident.occurred_at else None,
        "location": incident.location,
        "description": incident.description,
        "immediate_action": incident.immediate_action_taken,
        "staff_involved": incident.witnesses,
        "resident_condition_after": incident.injuries_sustained,
        "witnesses": incident.witnesses,
    }

    analysis = await analyse_incident(incident=incident_dict)
    return analysis
