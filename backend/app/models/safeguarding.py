from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class SafeguardingAlert(Base):
    __tablename__ = "safeguarding_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    care_home_id: Mapped[str] = mapped_column(ForeignKey("care_homes.id", ondelete="CASCADE"), nullable=False, index=True)
    resident_id: Mapped[str | None] = mapped_column(ForeignKey("residents.id", ondelete="SET NULL"), nullable=True, index=True)
    incident_id: Mapped[str | None] = mapped_column(ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    care_note_id: Mapped[str | None] = mapped_column(ForeignKey("care_notes.id", ondelete="SET NULL"), nullable=True, index=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # incident, care_note, pattern_detector, manual
    source_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # physical, emotional, financial, neglect, organisational, self-neglect
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")  # low, medium, high, critical
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")  # open, acknowledged, escalated, closed
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    triggered_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledged_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    safeguarding_case_id: Mapped[str | None] = mapped_column(ForeignKey("safeguarding_cases.id", ondelete="SET NULL"), nullable=True, index=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="safeguarding_alerts")
    resident: Mapped["Resident"] = relationship("Resident", back_populates="safeguarding_alerts")
    incident: Mapped["Incident"] = relationship("Incident", back_populates="safeguarding_alerts")
    care_note: Mapped["CareNote"] = relationship("CareNote", back_populates="safeguarding_alerts")
    safeguarding_case: Mapped["SafeguardingCase"] = relationship("SafeguardingCase", back_populates="alerts")
    triggered_by: Mapped["User"] = relationship("User", foreign_keys="SafeguardingAlert.triggered_by_user_id", back_populates="safeguarding_alerts_triggered")
    acknowledged_by: Mapped["User"] = relationship("User", foreign_keys="SafeguardingAlert.acknowledged_by_user_id")
    pattern_reports: Mapped[list["PatternReport"]] = relationship(
        "PatternReport", back_populates="safeguarding_alert"
    )


class SafeguardingCase(Base):
    __tablename__ = "safeguarding_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    care_home_id: Mapped[str] = mapped_column(ForeignKey("care_homes.id", ondelete="CASCADE"), nullable=False, index=True)
    resident_id: Mapped[str | None] = mapped_column(ForeignKey("residents.id", ondelete="SET NULL"), nullable=True, index=True)
    reference: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open")  # open, section42_enquiry, referral_made, closed, review
    risk_level: Mapped[str | None] = mapped_column(String(20), nullable=True)  # low, medium, high, critical
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.now)
    opened_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    assigned_to_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    closure_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    referral_made: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    referral_authority: Mapped[str | None] = mapped_column(String(255), nullable=True)
    referral_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    referral_made_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="safeguarding_cases")
    resident: Mapped["Resident"] = relationship("Resident", back_populates="safeguarding_cases")
    alerts: Mapped[list["SafeguardingAlert"]] = relationship("SafeguardingAlert", back_populates="safeguarding_case")
    section42_enquiries: Mapped[list["Section42Enquiry"]] = relationship("Section42Enquiry", back_populates="safeguarding_case")
    evidence_packs: Mapped[list["EvidencePack"]] = relationship("EvidencePack", back_populates="safeguarding_case")
    risk_patterns: Mapped[list["RiskPattern"]] = relationship("RiskPattern", back_populates="safeguarding_case")


class Section42Enquiry(Base):
    __tablename__ = "section42_enquiries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    care_home_id: Mapped[str] = mapped_column(ForeignKey("care_homes.id", ondelete="CASCADE"), nullable=False, index=True)
    safeguarding_case_id: Mapped[str] = mapped_column(ForeignKey("safeguarding_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    resident_id: Mapped[str | None] = mapped_column(ForeignKey("residents.id", ondelete="SET NULL"), nullable=True, index=True)
    reference: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")  # draft, submitted, acknowledged, concluded
    generated_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.now)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    concluded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    conclusion_outcome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Structured generated content
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    risks: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    capacity_considerations: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_outcomes: Mapped[str | None] = mapped_column(Text, nullable=True)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Metadata
    model_provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="section42_enquiries")
    safeguarding_case: Mapped["SafeguardingCase"] = relationship("SafeguardingCase", back_populates="section42_enquiries")
    resident: Mapped["Resident"] = relationship("Resident", back_populates="section42_enquiries")


class PatternSignal(Base):
    __tablename__ = "pattern_signals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    care_home_id: Mapped[str] = mapped_column(ForeignKey("care_homes.id", ondelete="CASCADE"), nullable=False, index=True)
    resident_id: Mapped[str] = mapped_column(ForeignKey("residents.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # care_note, incident, vital_signs, fluid_balance, mar_record, wound, nutrition
    source_id: Mapped[str] = mapped_column(String(36), nullable=False)
    signal_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. bruising, weight_loss, falls_cluster, medication_error
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    evidence_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0.0 - 1.0
    risk_weight: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1-10
    contributing_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON summary

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="pattern_signals")
    resident: Mapped["Resident"] = relationship("Resident", back_populates="pattern_signals")


class RiskPattern(Base):
    __tablename__ = "risk_patterns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    care_home_id: Mapped[str] = mapped_column(ForeignKey("care_homes.id", ondelete="CASCADE"), nullable=False, index=True)
    resident_id: Mapped[str] = mapped_column(ForeignKey("residents.id", ondelete="CASCADE"), nullable=False, index=True)
    safeguarding_case_id: Mapped[str | None] = mapped_column(ForeignKey("safeguarding_cases.id", ondelete="SET NULL"), nullable=True, index=True)
    pattern_type: Mapped[str] = mapped_column(String(100), nullable=False)  # longitudinal_risk, sar_evidence_synthesis
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # physical, emotional, financial, neglect, organisational, self-neglect
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    time_window_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    contributing_evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_actions: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.now)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="risk_patterns")
    resident: Mapped["Resident"] = relationship("Resident", back_populates="risk_patterns")
    safeguarding_case: Mapped["SafeguardingCase"] = relationship("SafeguardingCase", back_populates="risk_patterns")
    pattern_reports: Mapped[list["PatternReport"]] = relationship(
        "PatternReport", back_populates="risk_pattern"
    )


class EvidencePack(Base):
    __tablename__ = "evidence_packs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    care_home_id: Mapped[str] = mapped_column(ForeignKey("care_homes.id", ondelete="CASCADE"), nullable=False, index=True)
    safeguarding_case_id: Mapped[str] = mapped_column(ForeignKey("safeguarding_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    resident_id: Mapped[str | None] = mapped_column(ForeignKey("residents.id", ondelete="SET NULL"), nullable=True, index=True)
    reference: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")  # pending, generating, completed, failed
    pack_type: Mapped[str] = mapped_column(String(100), nullable=False)  # section42, safeguarding_review, sar, cqc_inspection
    date_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    date_to: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    include_incidents: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_care_notes: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_section42: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_patterns: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    generated_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    s3_bucket: Mapped[str | None] = mapped_column(String(255), nullable=True)
    s3_key_pdf: Mapped[str | None] = mapped_column(String(500), nullable=True)
    s3_key_zip: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="evidence_packs")
    resident: Mapped["Resident"] = relationship("Resident", back_populates="evidence_packs")
    safeguarding_case: Mapped["SafeguardingCase"] = relationship("SafeguardingCase", back_populates="evidence_packs")
    items: Mapped[list["EvidencePackItem"]] = relationship("EvidencePackItem", back_populates="evidence_pack", cascade="all, delete-orphan")


class EvidencePackItem(Base):
    __tablename__ = "evidence_pack_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_pack_id: Mapped[str] = mapped_column(ForeignKey("evidence_packs.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type: Mapped[str] = mapped_column(String(50), nullable=False)  # incident, care_note, alert, section42, pattern
    source_id: Mapped[str] = mapped_column(String(36), nullable=False)
    source_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    content_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    included_in_pdf: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    included_in_zip: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    evidence_pack: Mapped["EvidencePack"] = relationship("EvidencePack", back_populates="items")
