from app.services.phi_filter import deidentify, reidentify


def test_deidentify_removes_care_home_phi_categories():
    text = (
        "Margaret Ellis DOB 12/02/1939 NHS 123 456 7890 lives at 14 Garden Road "
        "in room 12A. NOK Daniel Ellis. GP Dr Helen Brown. carer Amelia Williams."
    )

    result = deidentify(text)

    assert "Margaret Ellis" not in result.text
    assert "12/02/1939" not in result.text
    assert "123 456 7890" not in result.text
    assert "14 Garden Road" not in result.text
    assert "room 12A" not in result.text.lower()
    assert "Daniel Ellis" not in result.text
    assert "Dr Helen Brown" not in result.text
    assert "Amelia Williams" not in result.text
    assert reidentify(result.text, result.replacements) == text
