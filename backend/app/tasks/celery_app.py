from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()
celery_app = Celery("carehomeos", broker=settings.redis_url, backend=settings.redis_url)

# Import tasks so Celery can discover them
from app.tasks.celery_tasks import (  # noqa: E402,F401
    run_nightly_deterioration,
    run_daily_falls_scoring,
    check_missed_doses,
    send_daily_family_updates,
    generate_shift_handovers,
    check_training_expiry,
    refresh_cqc_evidence_cache,
    generate_monthly_payroll,
    run_safeguarding_scan,
    run_pattern_detection,
)

celery_app.conf.beat_schedule = {
    # 1. Nightly deterioration scan — 02:00 UTC
    "deterioration-nightly": {
        "task": "app.tasks.celery_tasks.run_nightly_deterioration",
        "schedule": crontab(hour=2, minute=0),
    },
    # 2. Daily falls risk scoring — 05:00 UTC
    "falls-daily": {
        "task": "app.tasks.celery_tasks.run_daily_falls_scoring",
        "schedule": crontab(hour=5, minute=0),
    },
    # 3. eMAR missed-dose monitor — every 30 minutes
    "emar-monitor-30-min": {
        "task": "app.tasks.celery_tasks.check_missed_doses",
        "schedule": 1800.0,  # 30 minutes in seconds
    },
    # 4. Daily family updates — 18:30 UTC
    "family-updates-daily": {
        "task": "app.tasks.celery_tasks.send_daily_family_updates",
        "schedule": crontab(hour=18, minute=30),
    },
    # 5. Shift handovers — 07:00, 14:00, 21:00 UTC
    "handover-morning": {
        "task": "app.tasks.celery_tasks.generate_shift_handovers",
        "schedule": crontab(hour=7, minute=0),
    },
    "handover-afternoon": {
        "task": "app.tasks.celery_tasks.generate_shift_handovers",
        "schedule": crontab(hour=14, minute=0),
    },
    "handover-night": {
        "task": "app.tasks.celery_tasks.generate_shift_handovers",
        "schedule": crontab(hour=21, minute=0),
    },
    # 6. Training compliance check — Monday 08:00 UTC
    "training-compliance-monday": {
        "task": "app.tasks.celery_tasks.check_training_expiry",
        "schedule": crontab(hour=8, minute=0, day_of_week=1),
    },
    # 7. CQC evidence cache refresh — Sunday 03:00 UTC
    "cqc-refresh-sunday": {
        "task": "app.tasks.celery_tasks.refresh_cqc_evidence_cache",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),
    },
    # 8. Monthly payroll export — 1st of month 06:00 UTC
    "payroll-monthly": {
        "task": "app.tasks.celery_tasks.generate_monthly_payroll",
        "schedule": crontab(hour=6, minute=0, day_of_month=1),
    },
    # 9. Safeguarding scan — hourly
    "safeguarding-hourly": {
        "task": "app.tasks.celery_tasks.run_safeguarding_scan",
        "schedule": crontab(minute=0),  # every hour
    },
    # 10. Pattern detection — nightly 02:30 UTC
    "pattern-detector-nightly": {
        "task": "app.tasks.celery_tasks.run_pattern_detection",
        "schedule": crontab(hour=2, minute=30),
    },
}

# Ensure Celery discovers tasks in the correct package
celery_app.autodiscover_tasks(["app.tasks"])
