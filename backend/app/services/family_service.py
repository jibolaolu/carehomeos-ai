def build_family_update(resident: str, note_summary: str) -> dict[str, object]:
    return {
        "resident": resident,
        "message": f"{resident} had a settled day. {note_summary}",
        "approved_for_family": True,
    }
