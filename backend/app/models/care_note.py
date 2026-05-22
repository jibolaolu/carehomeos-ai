from __future__ import annotations

import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class CareNote(Base):
    __tablename__ = "care_notes"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    resident_id: Mapped[str] = mapped_column(
        ForeignKey("residents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
    )
    note_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    structured_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    original_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    translation_applied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    translation_engine: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quality_gate_passed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    quality_gate_score: Mapped[float | None] = mapped_column(String(10), nullable=True)
    cqc_tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    safeguarding_flags: Mapped[str | None] = mapped_column(Text, nullable=True)
    mood_assessment: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pain_score: Mapped[int | None] = mapped_column(String(10), nullable=True)
    is_offline_synced: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    offline_job_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    recorded_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)

    resident: Mapped["Resident"] = relationship("Resident", back_populates="care_notes")
    author: Mapped["User"] = relationship("User", back_populates="care_notes")
