from pydantic import BaseModel, Field


class CareNoteCreate(BaseModel):
    resident_id: str
    transcript: str
    note_type: str = "general"


class CareNoteOut(BaseModel):
    resident_id: str
    summary: str
    route: str
    cqc_tags: list[str] = Field(default_factory=list)
