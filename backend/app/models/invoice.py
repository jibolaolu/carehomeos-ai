from dataclasses import dataclass


@dataclass
class Invoice:
    id: str
    resident_id: str
    amount_pence: int
    status: str
    due_date: str
