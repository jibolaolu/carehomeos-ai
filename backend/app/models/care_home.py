from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class CareHome(Base):
    __tablename__ = "care_homes"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    registration_number: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    address_line_1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line_2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    postcode: Mapped[str] = mapped_column(String(20), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    nation: Mapped[str] = mapped_column(String(20), default="england", nullable=False)
    cqc_rating: Mapped[str | None] = mapped_column(String(20), nullable=True)
    total_beds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    occupied_beds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_nursing_home: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    subscription_tier: Mapped[str] = mapped_column(String(50), default="free", nullable=False)
    subscription_status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    trial_ends_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    billing_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    group_parent_id: Mapped[str | None] = mapped_column(
        ForeignKey("care_homes.id", ondelete="SET NULL"),
        nullable=True,
    )
    settings: Mapped[str | None] = mapped_column(Text, nullable=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="care_home")
    residents: Mapped[list["Resident"]] = relationship("Resident", back_populates="care_home")
    staff: Mapped[list["Staff"]] = relationship("Staff", back_populates="care_home")
    shifts: Mapped[list["Shift"]] = relationship("Shift", back_populates="care_home")
    incidents: Mapped[list["Incident"]] = relationship("Incident", back_populates="care_home")
    audits: Mapped[list["Audit"]] = relationship("Audit", back_populates="care_home")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="care_home")
    api_keys: Mapped[list["ApiKey"]] = relationship("ApiKey", back_populates="care_home")
    webhook_subscriptions: Mapped[list["WebhookSubscription"]] = relationship(
        "WebhookSubscription", back_populates="care_home"
    )
    pharmacy_integrations: Mapped[list["PharmacyIntegration"]] = relationship(
        "PharmacyIntegration", back_populates="care_home"
    )
    onboarding: Mapped["OnboardingProgress"] = relationship(
        "OnboardingProgress", back_populates="care_home", uselist=False
    )
    safeguarding_alerts: Mapped[list["SafeguardingAlert"]] = relationship(
        "SafeguardingAlert", back_populates="care_home"
    )
    safeguarding_cases: Mapped[list["SafeguardingCase"]] = relationship(
        "SafeguardingCase", back_populates="care_home"
    )
    section42_enquiries: Mapped[list["Section42Enquiry"]] = relationship(
        "Section42Enquiry", back_populates="care_home"
    )
    pattern_signals: Mapped[list["PatternSignal"]] = relationship(
        "PatternSignal", back_populates="care_home"
    )
    risk_patterns: Mapped[list["RiskPattern"]] = relationship(
        "RiskPattern", back_populates="care_home"
    )
    ai_feedback_entries: Mapped[list["AIFeedback"]] = relationship(
        "AIFeedback", back_populates="care_home"
    )
    cqc_snapshots: Mapped[list["CQCSnapshot"]] = relationship(
        "CQCSnapshot", back_populates="care_home"
    )
    pattern_reports: Mapped[list["PatternReport"]] = relationship(
        "PatternReport", back_populates="care_home"
    )
    predictive_risk_scores: Mapped[list["PredictiveRiskScore"]] = relationship(
        "PredictiveRiskScore", back_populates="care_home"
    )
