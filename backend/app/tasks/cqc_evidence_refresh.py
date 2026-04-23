from app.services.cqc_service import get_cqc_snapshot


def run() -> dict[str, object]:
    return get_cqc_snapshot()
