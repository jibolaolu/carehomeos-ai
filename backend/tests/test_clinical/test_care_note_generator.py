from app.services.ai.care_note_generator import DOMAINS, generate_structured_note


def test_generator_populates_all_domains_and_family_update():
    note = generate_structured_note(
        "Margaret Ellis ate breakfast, used her frame, and seemed brighter after music group.",
        "nutrition",
    )

    for domain in DOMAINS:
        assert note[domain]
    assert note["family_update"]
    assert "Margaret Ellis" not in note["transcript"]
    assert note["concern_flag"] is False


def test_generator_sets_concern_flag_for_clinical_language():
    note = generate_structured_note("Resident had a fall and reported pain in her hip.", "mobility")

    assert note["concern_flag"] is True
    assert "Senior review" in note["concerns"]
