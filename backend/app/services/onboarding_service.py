from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.migration_job import MigrationJob
from app.models.onboarding_progress import OnboardingProgress


class OnboardingService:
    """Service for managing onboarding progress and data migration."""

    @staticmethod
    async def get_progress(db: AsyncSession, care_home_id: str) -> OnboardingProgress | None:
        """Get onboarding progress for a care home."""
        result = await db.execute(
            select(OnboardingProgress).where(OnboardingProgress.care_home_id == care_home_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_training_progress(db: AsyncSession, care_home_id: str) -> dict[str, object]:
        """Get training progress for a care home."""
        progress = await OnboardingService.get_progress(db, care_home_id)
        if progress is None:
            return {
                "training_completed": False,
                "modules_completed": 0,
                "total_modules": 5,
            }
        return {
            "training_completed": progress.training_completed,
            "modules_completed": sum([
                progress.home_details_configured,
                progress.residents_imported,
                progress.staff_setup_complete,
                progress.care_plan_templates_loaded,
                progress.mar_configured,
            ]),
            "total_modules": 5,
        }

    @staticmethod
    async def update_progress(
        db: AsyncSession, care_home_id: str, updates: dict[str, object]
    ) -> OnboardingProgress:
        """Update onboarding progress for a care home."""
        progress = await OnboardingService.get_progress(db, care_home_id)
        if progress is None:
            progress = OnboardingProgress(
                care_home_id=care_home_id,
                started_at=datetime.now(timezone.utc),
            )
            db.add(progress)

        for key, value in updates.items():
            if hasattr(progress, key):
                setattr(progress, key, value)

        await db.commit()
        await db.refresh(progress)
        return progress

    @staticmethod
    async def start_migration(
        db: AsyncSession,
        care_home_id: str,
        source_system: str,
        migration_type: str = "full",
        file_name: str | None = None,
        file_url: str | None = None,
        created_by_id: str | None = None,
    ) -> MigrationJob:
        """Start a new data migration job."""
        job = MigrationJob(
            care_home_id=care_home_id,
            source_system=source_system,
            migration_type=migration_type,
            file_name=file_name,
            file_url=file_url,
            created_by_id=created_by_id,
            status="pending",
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    @staticmethod
    async def get_migration_status(db: AsyncSession, job_id: str) -> MigrationJob | None:
        """Get migration job status."""
        result = await db.execute(select(MigrationJob).where(MigrationJob.id == job_id))
        return result.scalar_one_or_none()


def verify_go_live_readiness(progress: OnboardingProgress) -> bool:
    """Verify that all critical go-live steps are complete."""
    required_steps = [
        progress.home_details_configured,
        progress.residents_imported,
        progress.staff_setup_complete,
        progress.care_plan_templates_loaded,
        progress.mar_configured,
        progress.training_completed,
    ]
    return all(required_steps)


def get_onboarding_milestones(progress: OnboardingProgress) -> dict[str, dict[str, object]]:
    """Get structured onboarding milestones for UI display."""
    return {
        "setup": {
            "title": "Initial Setup",
            "completed": progress.home_details_configured,
            "steps": [
                {"name": "Home details configured", "completed": progress.home_details_configured},
                {"name": "Residents imported", "completed": progress.residents_imported},
                {"name": "Staff setup complete", "completed": progress.staff_setup_complete},
            ],
        },
        "configuration": {
            "title": "System Configuration",
            "completed": progress.care_plan_templates_loaded and progress.mar_configured,
            "steps": [
                {"name": "Care plan templates loaded", "completed": progress.care_plan_templates_loaded},
                {"name": "MAR configured", "completed": progress.mar_configured},
                {"name": "CQC evidence linked", "completed": progress.cqc_evidence_linked},
            ],
        },
        "training": {
            "title": "Training & Go-Live",
            "completed": progress.training_completed and progress.go_live_checklist_complete,
            "steps": [
                {"name": "Training completed", "completed": progress.training_completed},
                {"name": "First care note recorded", "completed": progress.first_care_note_recorded},
                {"name": "Go-live checklist complete", "completed": progress.go_live_checklist_complete},
            ],
        },
        "success_calls": {
            "title": "Success Calls",
            "completed": progress.success_call_90_day_completed,
            "steps": [
                {"name": "Day 7 success call", "completed": progress.success_call_7_day_completed},
                {"name": "Day 30 success call", "completed": progress.success_call_30_day_completed},
                {"name": "Day 90 success call", "completed": progress.success_call_90_day_completed},
            ],
        },
    }
