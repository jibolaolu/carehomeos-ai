SAFEGUARDING_KEYWORDS = {"abuse", "neglect", "rough handling", "fearful", "unexplained injury"}


def screen_for_safeguarding(text: str) -> dict[str, object]:
    lower = text.lower()
    hits = sorted(keyword for keyword in SAFEGUARDING_KEYWORDS if keyword in lower)
    return {"flagged": bool(hits), "keywords": hits}
