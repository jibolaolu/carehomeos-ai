from app.services.cqc_service import tag_quality_statement


def test_note_types_map_to_cqc_quality_statements():
    assert "Effective: nutrition and hydration" in tag_quality_statement("nutrition")
    assert "Safe: managing risks" in tag_quality_statement("mobility fall prevention")
    assert "Caring: involving people" in tag_quality_statement("family feedback")


def test_safeguarding_note_maps_to_safe_key_question():
    tags = tag_quality_statement("safeguarding", "possible neglect concern")

    assert tags == ["Safe: safeguarding people from abuse"]
