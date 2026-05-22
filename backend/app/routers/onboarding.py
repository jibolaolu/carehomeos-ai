from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class OnboardingProgressUpdate(BaseModel):
    home_details_configured: bool | None = None
    residents_imported: bool | None = None
    staff_setup_complete: bool | None = None
    care_plan_templates_loaded: bool | None = None
    mar_configured: bool | None = None
    first_care_note_recorded: bool | None = None
    first_incident_recorded: bool | None = None
    cqc_evidence_linked: bool | None = None
    training_completed: bool | None = None
    go_live_date: str | None = None
    data_migration_source: str | None = None
    data_migration_status: str | None = None
    champion_identified: bool | None = None
    champion_name: str | None = None
    champion_email: str | None = None
    notes: str | None = None


class MigrationStartRequest(BaseModel):
    source_system: str
    migration_type: str = "full"
    file_name: str | None = None
    file_url: str | None = None


@router.get("/progress")
async def get_onboarding_progress(
    care_home_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    progress = await OnboardingService.get_progress(db, care_home_id)
    if progress is None:
        return {
            "care_home_id": care_home_id,
            "phase": "not_started",
            "milestones": {
                "day_30_completed": False,
                "day_60_completed": False,
                "day_90_completed": False,
            },
            "checklist": {},
        }

    training = await OnboardingService.get_training_progress(db, care_home_id)

    return {
        "care_home_id": progress.care_home_id,
        "phase": progress.phase,
        "started_at": progress.started_at.isoformat() if progress.started_at else None,
        "milestones": {
            "day_30_completed": progress.day_30_completed,
            "day_30_completed_at": progress.day_30_completed_at.isoformat() if progress.day_30_completed_at else None,
            "day_60_completed": progress.day_60_completed,
            "day_60_completed_at": progress.day_60_completed_at.isoformat() if progress.day_60_completed_at else None,
            "day_90_completed": progress.day_90_completed,
            "day_90_completed_at": progress.day_90_completed_at.isoformat() if progress.day_90_completed_at else None,
        },
        "checklist": {
            "home_details_configured": progress.home_details_configured,
            "residents_imported": progress.residents_imported,
            "staff_setup_complete": progress.staff_setup_complete,
            "care_plan_templates_loaded": progress.care_plan_templates_loaded,
            "mar_configured": progress.mar_configured,
            "first_care_note_recorded": progress.first_care_note_recorded,
            "first_incident_recorded": progress.first_incident_recorded,
            "cqc_evidence_linked": progress.cqc_evidence_linked,
            "training_completed": progress.training_completed,
            "go_live_checklist_complete": progress.go_live_checklist_complete,
            "go_live_date": progress.go_live_date.isoformat() if progress.go_live_date else None,
        },
        "training": training,
        "champion": {
            "identified": progress.champion_identified,
            "name": progress.champion_name,
            "email": progress.champion_email,
        },
        "success_calls": {
            "day_7": progress.success_call_7_day_completed,
            "day_30": progress.success_call_30_day_completed,
            "day_90": progress.success_call_90_day_completed,
        },
    }


@router.post("/progress")
async def update_onboarding_progress(
    care_home_id: str,
    payload: OnboardingProgressUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    updates = payload.model_dump(exclude_unset=True)
    if "go_live_date" in updates and updates["go_live_date"]:
        from datetime import date as _date
        updates["go_live_date"] = _date.fromisoformat(updates["go_live_date"])

    progress = await OnboardingService.update_progress(db, care_home_id, updates)
    return {
        "care_home_id": progress.care_home_id,
        "phase": progress.phase,
        "day_30_completed": progress.day_30_completed,
        "day_60_completed": progress.day_60_completed,
        "day_90_completed": progress.day_90_completed,
        "go_live_checklist_complete": progress.go_live_checklist_complete,
        "updated_at": progress.updated_at.isoformat() if progress.updated_at else None,
    }


@router.post("/migrate", status_code=status.HTTP_202_ACCEPTED)
async def start_migration(
    care_home_id: str,
    payload: MigrationStartRequest,
    created_by_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    job = await OnboardingService.start_migration(
        db=db,
        care_home_id=care_home_id,
        source_system=payload.source_system,
        migration_type=payload.migration_type,
        file_name=payload.file_name,
        file_url=payload.file_url,
        created_by_id=created_by_id,
    )
    return {
        "job_id": job.id,
        "care_home_id": job.care_home_id,
        "source_system": job.source_system,
        "migration_type": job.migration_type,
        "status": job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


@router.get("/migrate/{job_id}")
async def get_migration_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    job = await OnboardingService.get_migration_status(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Migration job not found")
    return {
        "job_id": job.id,
        "care_home_id": job.care_home_id,
        "source_system": job.source_system,
        "migration_type": job.migration_type,
        "status": job.status,
        "total_records": job.total_records,
        "processed_records": job.processed_records,
        "success_count": job.success_count,
        "error_count": job.error_count,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "error_log": job.error_log,
    }
