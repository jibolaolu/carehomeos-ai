from app.services.cqc_service import build_regulation_17_trail


def test_regulation_17_trail_records_action_owner_and_deadline():
    trail = build_regulation_17_trail("Audit action overdue", "Deputy manager", "2026-04-30")

    assert trail["regulation"] == "Regulation 17: Good governance"
    assert trail["owner"] == "Deputy manager"
    assert trail["due"] == "2026-04-30"
    assert trail["evidence_chain"] == ["audit finding", "action owner assigned", "deadline recorded"]
