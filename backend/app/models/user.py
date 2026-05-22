from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    auth0_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="carer")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    care_home_id: Mapped[str | None] = mapped_column(
        ForeignKey("care_homes.id", ondelete="SET NULL"),
        nullable=True,
    )
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    language_preference: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    notification_preferences: Mapped[str | None] = mapped_column(Text, nullable=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="users")
    care_notes: Mapped[list["CareNote"]] = relationship("CareNote", back_populates="author")
    shifts: Mapped[list["Shift"]] = relationship("Shift", back_populates="staff_member")
    incidents_reported: Mapped[list["Incident"]] = relationship(
        "Incident", foreign_keys="Incident.reported_by_id", back_populates="reporter"
    )
    api_keys: Mapped[list["ApiKey"]] = relationship("ApiKey", back_populates="user")
    onboarding: Mapped["OnboardingProgress"] = relationship(
        "OnboardingProgress", back_populates="user", uselist=False
    )
