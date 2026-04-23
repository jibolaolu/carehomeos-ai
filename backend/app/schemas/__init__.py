from app.schemas.care_notes import CareNoteCreate, CareNoteOut
from app.schemas.clinical import ClinicalRiskOut
from app.schemas.cqc import CQCKeyQuestion
from app.schemas.finance import FinanceSummary
from app.schemas.mar import AdministrationCreate
from app.schemas.residents import ResidentOut

__all__ = [
    "AdministrationCreate",
    "CQCKeyQuestion",
    "CareNoteCreate",
    "CareNoteOut",
    "ClinicalRiskOut",
    "FinanceSummary",
    "ResidentOut",
]
