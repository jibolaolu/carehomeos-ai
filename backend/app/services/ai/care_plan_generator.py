def generate_care_plan(domain: str, risks: list[str]) -> dict[str, object]:
    return {
        "domain": domain,
        "goals": [f"Maintain safety and wellbeing in {domain}"],
        "interventions": [f"Review {risk} during each shift handover" for risk in risks],
        "review_cycle": "monthly",
    }
