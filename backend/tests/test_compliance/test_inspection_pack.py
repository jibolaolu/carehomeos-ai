from app.services.ai.cqc_pack_generator import build_inspection_pack


def test_inspection_pack_contains_all_key_questions_and_actions():
    pack = build_inspection_pack()

    assert pack["overall_readiness"] >= 0
    assert {section["name"] for section in pack["sections"]} == {
        "Safe",
        "Effective",
        "Caring",
        "Responsive",
        "Well-led",
    }
    assert pack["priority_actions"]
    assert "PDF" in pack["export_formats"]
