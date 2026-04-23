from celery import Celery

from app.config import get_settings


settings = get_settings()
celery_app = Celery("carehomeos", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.beat_schedule = {
    "emar-monitor-30-min": {"task": "app.tasks.emar_monitor.run", "schedule": 1800},
    "deterioration-nightly": {"task": "app.tasks.deterioration_scan.run", "schedule": 86400},
    "falls-daily": {"task": "app.tasks.falls_scoring.run", "schedule": 86400},
}
