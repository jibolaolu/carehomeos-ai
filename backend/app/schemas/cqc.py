from pydantic import BaseModel


class CQCKeyQuestion(BaseModel):
    name: str
    score: int
    evidence: int
    risk: str
