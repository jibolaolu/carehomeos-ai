from app.services.ai.care_note_generator import generate_structured_note
from app.services.quality_gate import evaluate_note


def test_quality_gate_routes_auto_file_for_complete_note():
    note = generate_structured_note("Resident settled and accepted all planned support.", "general")

    result = evaluate_note(note)

    assert result.route == "AUTO_FILE"
    assert result.safeguarding is False


def test_quality_gate_routes_safeguarding_first():
    note = generate_structured_note("Resident was fearful and disclosed rough handling.", "personal_care")

    result = evaluate_note(note)

    assert result.route == "SAFEGUARDING"
    assert result.safeguarding is True
