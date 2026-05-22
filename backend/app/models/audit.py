from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Audit(Base):
    __tablename__ = "audits"

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
    audit_type: Mapped[str] = mapped_column(String(100), nullable=False)
    template_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cqc_quality_statement: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cqc_regulation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="in_progress", nullable=False)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    conducted_by: Mapped[str] = mapped_column(String(200), nullable=False)
    reviewer_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_percentage: Mapped[float | None] = mapped_column(String(10), nullable=True)
    findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    actions_required: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    improvement_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_references: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_mock_inspection: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_mock_assessment: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)
    policy_references: Mapped[str | None] = mapped_column(Text, nullable=True)
    staff_interviewed: Mapped[str | None] = mapped_column(Text, nullable=True)
    resident_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_audit_due: Mapped[date | None] = mapped_column(Date, nullable=True)

    care_home: Mapped["CareHome"] = relationship("CareHome", back_populates="audits")
