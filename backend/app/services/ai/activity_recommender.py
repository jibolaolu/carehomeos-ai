def recommend_activities(profile: dict[str, object]) -> list[str]:
    interests = {str(item).lower() for item in profile.get("interests", [])}
    recommendations = []
    if "music" in interests:
        recommendations.append("Small-group music session")
    if "gardening" in interests:
        recommendations.append("Supervised garden walk or herb planting")
    return recommendations or ["One-to-one reminiscence conversation"]
