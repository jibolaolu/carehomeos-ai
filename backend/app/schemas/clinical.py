from pydantic import BaseModel, Field


class ClinicalRiskOut(BaseModel):
    resident_id: str
    level: str
    score: float
    actions: list[str] = Field(default_factory=list)
