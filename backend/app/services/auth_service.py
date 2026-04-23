def local_user() -> dict[str, object]:
    return {"id": "local-manager", "roles": ["registered_manager", "clinical_lead"]}


def has_role(user: dict[str, object], role: str) -> bool:
    return role in set(user.get("roles", []))
