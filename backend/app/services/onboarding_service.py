from __future__ import annotations

from app.models.onboarding_progress import OnboardingProgress


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
