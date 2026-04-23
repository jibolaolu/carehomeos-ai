def optimise_rota(staff: list[dict[str, object]], required_roles: list[str]) -> dict[str, object]:
    covered = {str(member.get("role")) for member in staff}
    gaps = [role for role in required_roles if role not in covered]
    return {"coverage": "safe" if not gaps else "gap", "gaps": gaps}
