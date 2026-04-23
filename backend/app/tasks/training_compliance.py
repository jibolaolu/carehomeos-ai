from app.demo_data import STAFF


def run() -> dict[str, object]:
    average = round(sum(int(member["training"]) for member in STAFF) / len(STAFF))
    return {"average_training_compliance": average, "below_90": [member for member in STAFF if int(member["training"]) < 90]}
