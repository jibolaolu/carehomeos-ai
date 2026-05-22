from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class OnboardingProgress(Base):
    __tablename__ = "onboarding_progress"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    care_home_id: Mapped[str] = mapped_column(
        ForeignKey("care_homes.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    phase: Mapped[str] = mapped_column(String(50), default="setup", nullable=False)
    day_30_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    day_60_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    day_90_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    day_30_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    day_60_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    day_90_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    home_details_configured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    residents_imported: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    staff_setup_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    care_plan_templates_loaded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mar_configured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    first_care_note_recorded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    first_incident_recorded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cqc_evidence_linked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    training_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    go_live_checklist_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    go_live_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_migration_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    data_migration_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    champion_identified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    champion_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    champion_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    success_call_7_day_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    success_call_30_day_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    success_call_90_day_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="onboarding")
    user: Mapped["User"] = relationship("User", back_populates="onboarding")
