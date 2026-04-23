from app.demo_data import MEDICATION_ROUND
from app.services.emar_service import check_missed_doses


def run() -> dict[str, object]:
    return {"missed_or_due": check_missed_doses(MEDICATION_ROUND)}
