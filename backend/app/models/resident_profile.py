from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class ResidentProfile(Base):
    __tablename__ = "resident_profiles"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    resident_id: Mapped[str] = mapped_column(
        ForeignKey("residents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    life_history: Mapped[str | None] = mapped_column(Text, nullable=True)
    family_background: Mapped[str | None] = mapped_column(Text, nullable=True)
    career_history: Mapped[str | None] = mapped_column(Text, nullable=True)
    hobbies_interests: Mapped[str | None] = mapped_column(Text, nullable=True)
    likes: Mapped[str | None] = mapped_column(Text, nullable=True)
    dislikes: Mapped[str | None] = mapped_column(Text, nullable=True)
    routines_preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    sleep_pattern: Mapped[str | None] = mapped_column(Text, nullable=True)
    bathing_preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    dressing_preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    meal_preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    drink_preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    religious_needs: Mapped[str | None] = mapped_column(Text, nullable=True)
    cultural_needs: Mapped[str | None] = mapped_column(Text, nullable=True)
    spiritual_needs: Mapped[str | None] = mapped_column(Text, nullable=True)
    communication_preferences: Mapped[str | None] = mapped_column(Text, nullable=True)
    mobility_aids: Mapped[str | None] = mapped_column(Text, nullable=True)
    hearing_aids: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    glasses: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dentures: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pressure_cushion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    call_bell_preference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    preferred_staff_gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    photo_urls: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_generated_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="profile")
