from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    resident_id: str | None = None
    incident_type: str = "safeguarding_concern"
    category: str = "safeguarding"
    severity: str = "medium"
    title: str
    description: str
    immediate_action_taken: str
    location: str | None = None
    incident_date: datetime | None = None
    is_safeguarding: bool = False
    safeguarding_category: str | None = None
    duty_of_candour_triggered: bool = False
    family_notified: bool = False
    gp_notified: bool = False
    cqc_relevant: bool = True


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    immediate_action_taken: str | None = None
    location: str | None = None
    severity: str | None = None
    status: str | None = None
    is_safeguarding: bool | None = None
    safeguarding_category: str | None = None
    duty_of_candour_triggered: bool | None = None
    family_notified: bool | None = None
    gp_notified: bool | None = None
    resolution_notes: str | None = None
    root_cause_analysis: str | None = None
    lessons_learned: str | None = None
    action_items: str | None = None


class IncidentOut(BaseModel):
    id: str
    care_home_id: str
    resident_id: str | None
    reported_by_id: str
    incident_type: str
    category: str
    severity: str
    status: str
    title: str
    description: str
    immediate_action_taken: str
    location: str | None
    incident_date: datetime | None
    reported_at: datetime
    resolved_at: datetime | None
    is_safeguarding: bool
    safeguarding_category: str | None
    duty_of_candour_triggered: bool
    family_notified: bool
    gp_notified: bool
    cqc_relevant: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertOut(BaseModel):
    id: str
    care_home_id: str
    resident_id: str | None
    incident_id: str | None
    care_note_id: str | None
    source_type: str
    source_id: str | None
    category: str
    severity: str
    status: str
    title: str
    description: str
    evidence_summary: str | None
    triggered_by_user_id: str | None
    acknowledged_by_user_id: str | None
    acknowledged_at: datetime | None
    safeguarding_case_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CaseCreate(BaseModel):
    resident_id: str | None = None
    risk_level: str | None = None


class CaseUpdate(BaseModel):
    status: str | None = None
    risk_level: str | None = None
    assigned_to_user_id: str | None = None
    closure_summary: str | None = None
    referral_made: bool | None = None
    referral_authority: str | None = None
    referral_reference: str | None = None


class CaseOut(BaseModel):
    id: str
    care_home_id: str
    resident_id: str | None
    reference: str
    status: str
    risk_level: str | None
    opened_at: datetime
    opened_by_user_id: str
    assigned_to_user_id: str | None
    closed_at: datetime | None
    closed_by_user_id: str | None
    closure_summary: str | None
    referral_made: bool
    referral_authority: str | None
    referral_reference: str | None
    referral_made_at: datetime | None
    review_due_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class Section42Generate(BaseModel):
    safeguarding_case_id: str


class Section42Update(BaseModel):
    summary: str | None = None
    risks: str | None = None
    evidence: str | None = None
    capacity_considerations: str | None = None
    recommended_outcomes: str | None = None
    narrative: str | None = None
    status: str | None = None
    conclusion_outcome: str | None = None


class Section42Out(BaseModel):
    id: str
    care_home_id: str
    safeguarding_case_id: str
    resident_id: str | None
    reference: str
    status: str
    generated_by_user_id: str
    generated_at: datetime
    submitted_at: datetime | None
    concluded_at: datetime | None
    conclusion_outcome: str | None
    summary: str | None
    risks: str | None
    evidence: str | None
    capacity_considerations: str | None
    recommended_outcomes: str | None
    narrative: str | None
    model_provider: str | None
    model_name: str | None
    fallback_used: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PatternDetect(BaseModel):
    resident_id: str
    time_window_days: int = Field(default=30, ge=1, le=365)
    pattern_type: str = "longitudinal_risk"


class PatternSignalOut(BaseModel):
    id: str
    care_home_id: str
    resident_id: str
    source_type: str
    source_id: str
    signal_type: str
    detected_at: datetime
    evidence_text: str | None
    confidence: float
    risk_weight: int
    contributing_data: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RiskPatternOut(BaseModel):
    id: str
    care_home_id: str
    resident_id: str
    safeguarding_case_id: str | None
    pattern_type: str
    category: str
    severity: str
    confidence: float
    time_window_days: int
    window_start: datetime
    window_end: datetime
    summary: str
    contributing_evidence: str | None
    recommended_actions: str | None
    model_provider: str | None
    model_name: str | None
    fallback_used: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EvidencePackCreate(BaseModel):
    safeguarding_case_id: str
    pack_type: str = "safeguarding_review"
    date_from: datetime
    date_to: datetime
    include_incidents: bool = True
    include_care_notes: bool = True
    include_section42: bool = True
    include_alerts: bool = True
    include_patterns: bool = True


class EvidencePackOut(BaseModel):
    id: str
    care_home_id: str
    safeguarding_case_id: str
    resident_id: str | None
    reference: str
    status: str
    pack_type: str
    date_from: datetime
    date_to: datetime
    include_incidents: bool
    include_care_notes: bool
    include_section42: bool
    include_alerts: bool
    include_patterns: bool
    generated_by_user_id: str
    generated_at: datetime | None
    s3_bucket: str | None
    s3_key_pdf: str | None
    s3_key_zip: str | None
    file_size_bytes: int | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
