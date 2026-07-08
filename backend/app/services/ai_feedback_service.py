"""
AI Feedback Loop Service
========================
Tracks staff feedback on AI-generated content to enable continuous improvement,
prompt refinement, and accuracy measurement.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session_maker

logger = logging.getLogger(__name__)


class AIFeedbackService:
    """Service for collecting and analysing feedback on AI outputs."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def record_feedback(
        self,
        task_type: str,
        resident_id: str,
        original_output: str,
        staff_id: str,
        edited_output: str | None = None,
        was_accepted: bool = True,
        was_edited: bool = False,
        edit_reason: str | None = None,
        rating: int | None = None,
        ai_provider: str | None = None,
        ai_model: str | None = None,
        prompt_version: str | None = None,
    ) -> dict[str, Any]:
        """Record staff feedback on an AI-generated output.
        
        Args:
            task_type: Type of AI task (care_note, deterioration, family_update, etc.)
            resident_id: Resident identifier
            original_output: What the AI generated
            staff_id: Staff member providing feedback
            edited_output: What staff changed it to (if edited)
            was_accepted: Whether staff accepted the output
            was_edited: Whether staff made changes
            edit_reason: Why it was edited (clinical_inaccuracy, tone, missing_domain, etc.)
            rating: 1-5 star rating
            ai_provider: Which LLM provider was used
            ai_model: Which model was used
            prompt_version: Version of prompt template used
        
        Returns:
            Feedback record with ID
        """
        try:
            from app.models.ai_feedback import AIFeedback
            
            feedback = AIFeedback(
                id=uuid4(),
                task_type=task_type,
                resident_id=resident_id,
                original_output=original_output,
                edited_output=edited_output,
                staff_id=staff_id,
                was_accepted=was_accepted,
                was_edited=was_edited,
                edit_reason=edit_reason,
                rating=rating,
                ai_provider=ai_provider,
                ai_model=ai_model,
                prompt_version=prompt_version or "1.0",
                created_at=datetime.now(timezone.utc),
            )
            
            self.db.add(feedback)
            await self.db.commit()
            
            return {
                "feedback_id": str(feedback.id),
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Failed to record AI feedback: {e}")
            await self.db.rollback()
            return {
                "success": False,
                "error": str(e),
            }
    
    async def get_accuracy_metrics(
        self,
        task_type: str | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        """Get accuracy metrics for AI outputs.
        
        Args:
            task_type: Filter by task type (optional)
            days: Lookback period in days
        
        Returns:
            Metrics including acceptance rate, edit rate, average rating
        """
        try:
            from app.models.ai_feedback import AIFeedback
            
            cutoff = datetime.now(timezone.utc) - __import__('datetime').timedelta(days=days)
            
            query = select(AIFeedback).where(AIFeedback.created_at >= cutoff)
            
            if task_type:
                query = query.where(AIFeedback.task_type == task_type)
            
            result = await self.db.execute(query)
            feedbacks = result.scalars().all()
            
            if not feedbacks:
                return {
                    "total_feedback": 0,
                    "acceptance_rate": 0.0,
                    "edit_rate": 0.0,
                    "average_rating": 0.0,
                    "by_task_type": {},
                }
            
            total = len(feedbacks)
            accepted = sum(1 for f in feedbacks if f.was_accepted)
            edited = sum(1 for f in feedbacks if f.was_edited)
            ratings = [f.rating for f in feedbacks if f.rating is not None]
            
            # By task type
            by_type = {}
            for f in feedbacks:
                tt = f.task_type
                if tt not in by_type:
                    by_type[tt] = {"total": 0, "accepted": 0, "edited": 0, "ratings": []}
                by_type[tt]["total"] += 1
                if f.was_accepted:
                    by_type[tt]["accepted"] += 1
                if f.was_edited:
                    by_type[tt]["edited"] += 1
                if f.rating:
                    by_type[tt]["ratings"].append(f.rating)
            
            # Calculate per-type metrics
            for tt in by_type:
                by_type[tt]["acceptance_rate"] = by_type[tt]["accepted"] / by_type[tt]["total"]
                by_type[tt]["edit_rate"] = by_type[tt]["edited"] / by_type[tt]["total"]
                by_type[tt]["average_rating"] = sum(by_type[tt]["ratings"]) / len(by_type[tt]["ratings"]) if by_type[tt]["ratings"] else 0
            
            return {
                "total_feedback": total,
                "acceptance_rate": accepted / total,
                "edit_rate": edited / total,
                "average_rating": sum(ratings) / len(ratings) if ratings else 0,
                "by_task_type": by_type,
                "lookback_days": days,
            }
            
        except Exception as e:
            logger.error(f"Failed to get accuracy metrics: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def get_common_edit_reasons(
        self,
        task_type: str | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        """Get most common reasons for editing AI outputs.
        
        Args:
            task_type: Filter by task type
            days: Lookback period
        
        Returns:
            Ranked list of edit reasons with counts
        """
        try:
            from app.models.ai_feedback import AIFeedback
            from sqlalchemy import func
            
            cutoff = datetime.now(timezone.utc) - __import__('datetime').timedelta(days=days)
            
            query = (
                select(AIFeedback.edit_reason, func.count(AIFeedback.id))
                .where(AIFeedback.created_at >= cutoff)
                .where(AIFeedback.was_edited == True)
                .where(AIFeedback.edit_reason.isnot(None))
                .group_by(AIFeedback.edit_reason)
                .order_by(func.count(AIFeedback.id).desc())
            )
            
            if task_type:
                query = query.where(AIFeedback.task_type == task_type)
            
            result = await self.db.execute(query)
            reasons = result.all()
            
            return {
                "common_reasons": [
                    {"reason": r[0], "count": r[1]}
                    for r in reasons
                ],
                "lookback_days": days,
            }
            
        except Exception as e:
            logger.error(f"Failed to get edit reasons: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def get_prompt_improvement_suggestions(
        self,
        days: int = 30,
    ) -> list[dict[str, Any]]:
        """Analyse feedback to suggest prompt improvements.
        
        Args:
            days: Lookback period
        
        Returns:
            List of suggested prompt improvements
        """
        metrics = await self.get_accuracy_metrics(days=days)
        
        suggestions = []
        
        for task_type, task_metrics in metrics.get("by_task_type", {}).items():
            acceptance_rate = task_metrics.get("acceptance_rate", 0)
            edit_rate = task_metrics.get("edit_rate", 0)
            avg_rating = task_metrics.get("average_rating", 0)
            
            if acceptance_rate < 0.7:
                suggestions.append({
                    "task_type": task_type,
                    "issue": "Low acceptance rate",
                    "metric": acceptance_rate,
                    "suggestion": f"Review and refine {task_type} prompt. Consider adding more few-shot examples.",
                    "priority": "high",
                })
            
            if edit_rate > 0.3:
                suggestions.append({
                    "task_type": task_type,
                    "issue": "High edit rate",
                    "metric": edit_rate,
                    "suggestion": f"Staff frequently edit {task_type} outputs. Review common edit reasons and update prompt.",
                    "priority": "high",
                })
            
            if avg_rating < 3.0:
                suggestions.append({
                    "task_type": task_type,
                    "issue": "Low average rating",
                    "metric": avg_rating,
                    "suggestion": f"Consider switching to a more capable model for {task_type}.",
                    "priority": "medium",
                })
        
        return suggestions


# Model definition (to be added to models/)
"""
# app/models/ai_feedback.py

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Boolean, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AIFeedback(Base):
    __tablename__ = "ai_feedback"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    task_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resident_id: Mapped[str] = mapped_column(String(36), ForeignKey("residents.id"), nullable=False, index=True)
    original_output: Mapped[str] = mapped_column(Text, nullable=False)
    edited_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    staff_id: Mapped[str] = mapped_column(String(36), ForeignKey("staff.id"), nullable=False)
    was_accepted: Mapped[bool] = mapped_column(Boolean, default=True)
    was_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    edit_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prompt_version: Mapped[str] = mapped_column(String(20), default="1.0")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
"""
