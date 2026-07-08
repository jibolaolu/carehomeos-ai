from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class AIFeedback(Base):
    """Tracks staff corrections and feedback on AI-generated content for continuous improvement."""

    __tablename__ = "ai_feedback"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    care_home_id: Mapped[str] = mapped_column(
        ForeignKey("care_homes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resident_id: Mapped[str | None] = mapped_column(
        ForeignKey("residents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    staff_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
    )
    # Source of the AI content being rated
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )  # care_note, family_update, handover, care_plan, cqc_pack, incident_analysis, medication_review, activity_recommendation, rota
    source_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )
    # AI model that generated the content
    ai_model: Mapped[str] = mapped_column(String(100), nullable=False)
    ai_provider: Mapped[str] = mapped_column(String(50), nullable=False)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Feedback data
    rating: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )  # 1-5 stars, or None if not rated
    was_edited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    edit_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    corrected_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    correction_summary: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # Clinical safety flag
    clinical_safety_concern: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    safety_concern_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Whether this feedback has been incorporated into model fine-tuning
    incorporated_into_training: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    incorporated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Metadata
    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="ai_feedback_entries")
    resident: Mapped["Resident | None"] = relationship("Resident", back_populates="ai_feedback_entries")
    staff_user: Mapped["User"] = relationship("User", back_populates="ai_feedback_given")


class CQCSnapshot(Base):
    """Weekly CQC readiness snapshot with per-Key-Question scores and evidence summary."""

    __tablename__ = "cqc_snapshots"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    care_home_id: Mapped[str] = mapped_column(
        ForeignKey("care_homes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    week_ending: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Overall readiness
    overall_readiness_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )  # 0-100
    estimated_rating: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )  # outstanding, good, requires_improvement, inadequate
    rating_confidence: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )  # high, medium, low

    # Per Key Question scores (0-100)
    safe_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    effective_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    caring_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    responsive_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    well_led_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Quality Statement coverage (how many of the 34 have evidence)
    qs_with_evidence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    qs_total: Mapped[int] = mapped_column(Integer, nullable=False, default=34)

    # Evidence summary (JSON)
    evidence_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    gaps_identified: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_actions: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI metadata
    ai_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    generation_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Whether this snapshot triggered any alerts
    alert_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    alert_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="cqc_snapshots")


class PatternReport(Base):
    """Longitudinal pattern detection results from nightly AI analysis."""

    __tablename__ = "pattern_reports"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    care_home_id: Mapped[str] = mapped_column(
        ForeignKey("care_homes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resident_id: Mapped[str | None] = mapped_column(
        ForeignKey("residents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    report_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )  # incident_cluster, behavioural_change, medication_pattern, falls_trend, nutrition_decline, social_withdrawal, sleep_disruption, pain_escalation, staffing_correlation
    analysis_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    analysis_period_end: Mapped[date] = mapped_column(Date, nullable=False)

    # Pattern findings
    pattern_detected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pattern_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0.0-1.0
    severity: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )  # low, medium, high, critical

    # Supporting evidence (JSON array of incident/note IDs)
    evidence_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Recommendations
    recommended_actions: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    action_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    action_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    action_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Safeguarding linkage
    safeguarding_alert_id: Mapped[str | None] = mapped_column(
        ForeignKey("safeguarding_alerts.id", ondelete="SET NULL"),
        nullable=True,
    )
    risk_pattern_id: Mapped[str | None] = mapped_column(
        ForeignKey("risk_patterns.id", ondelete="SET NULL"),
        nullable=True,
    )

    # AI metadata
    ai_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="pattern_reports")
    resident: Mapped["Resident | None"] = relationship("Resident", back_populates="pattern_reports")
    assigned_to: Mapped["User | None"] = relationship("User", back_populates="pattern_reports_assigned")
    safeguarding_alert: Mapped["SafeguardingAlert | None"] = relationship(
        "SafeguardingAlert",
        back_populates="pattern_reports",
    )
    risk_pattern: Mapped["RiskPattern | None"] = relationship(
        "RiskPattern",
        back_populates="pattern_reports",
    )


class PredictiveRiskScore(Base):
    """30-day forward risk predictions generated by AI for proactive care planning."""

    __tablename__ = "predictive_risk_scores"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    care_home_id: Mapped[str] = mapped_column(
        ForeignKey("care_homes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resident_id: Mapped[str] = mapped_column(
        ForeignKey("residents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prediction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    prediction_horizon_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=30,
    )

    # Risk categories (0-100, higher = more risk)
    falls_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    deterioration_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    hospitalisation_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    dehydration_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    malnutrition_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    pressure_ulcer_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    uti_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    social_isolation_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Overall composite score
    overall_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_risk_level: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )  # low, medium, high, critical

    # Contributing factors (JSON)
    contributing_factors: Mapped[str | None] = mapped_column(Text, nullable=True)
    protective_factors: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Recommended interventions
    recommended_interventions: Mapped[str | None] = mapped_column(Text, nullable=True)
    care_plan_updates_suggested: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Validation tracking
    actual_outcome: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )  # confirmed, false_positive, false_negative, pending
    outcome_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    outcome_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    prediction_accuracy: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )  # 0.0-1.0, backfilled when outcome known

    # AI metadata
    ai_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    features_used: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )  # JSON list of feature names used

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="predictive_risk_scores")
    resident: Mapped["Resident"] = relationship("Resident", back_populates="predictive_risk_scores")
