from dataclasses import dataclass


@dataclass
class MARRecord:
    id: str
    medication_id: str
    due_at: str
    status: str
    recorded_by: str | None = None
