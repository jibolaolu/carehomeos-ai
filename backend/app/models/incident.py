from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Incident(Base):
    __tablename__ = "incidents"

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
    reported_by_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    incident_type: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    immediate_action_taken: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    incident_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    injuries_sustained: Mapped[str | None] = mapped_column(Text, nullable=True)
    medical_attention_given: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    medical_attention_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    witnesses: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_safeguarding: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    safeguarding_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_riddor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    riddor_reported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duty_of_candour_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duty_of_candour_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    family_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    family_notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    family_notification_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gp_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    gp_notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_pattern_detected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)
    root_cause_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    lessons_learned: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_items: Mapped[str | None] = mapped_column(Text, nullable=True)
    cqc_relevant: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    cqc_quality_statements: Mapped[str | None] = mapped_column(Text, nullable=True)
    photos: Mapped[str | None] = mapped_column(Text, nullable=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="incidents")
    resident: Mapped["Resident"] = relationship("Resident", back_populates="incidents")
    reporter: Mapped["User"] = relationship(
        "User", foreign_keys="Incident.reported_by_id", back_populates="incidents_reported"
    )
