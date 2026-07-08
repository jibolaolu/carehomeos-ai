"""
AIPipeline - End-to-End AI Orchestration for CareHomeOS
=========================================================
Orchestrates the complete voice note → care note → family update pipeline
with proper error handling, retry logic, audit logging, and clinical safety checks.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.core_ai_services import (
    generate_structured_note,
    generate_family_update,
    detect_deterioration,
    score_falls_risk,
)
from app.services.cqc_service import tag_quality_statement
from app.services.llm_router import TaskType, complete
from app.services.phi_filter import deidentify, reidentify
from app.services.quality_gate import evaluate_note
from app.services.transcriber import transcribe_audio
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class AIPipeline:
    """End-to-end AI pipeline for processing care home voice notes and generating
    structured clinical records, family updates, and compliance evidence.
    
    Usage:
        pipeline = AIPipeline(db)
        result = await pipeline.process_voice_note(
            audio_bytes=b"...",
            resident_id="res-001",
            note_type="nutrition",
            recorded_by="staff-001",
        )
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notification_service = NotificationService()
    
    async def process_voice_note(
        self,
        audio_bytes: bytes | None,
        resident_id: str,
        note_type: str,
        recorded_by: str,
        s3_key: str | None = None,
        simulated_transcript: str | None = None,
    ) -> dict[str, Any]:
        """Process a voice note through the complete AI pipeline.
        
        Pipeline steps:
        1. Transcribe audio (Whisper API)
        2. Detect language
        3. De-identify PHI
        4. Structure with Claude Sonnet
        5. Quality gate evaluation
        6. Re-identify
        7. CQC auto-tagging
        8. Generate family update
        9. Persist to database
        10. Dispatch notifications
        11. Clean up audio
        
        Args:
            audio_bytes: Raw audio data (optional if s3_key provided)
            resident_id: Resident identifier
            note_type: Type of care note
            recorded_by: Staff member ID who recorded
            s3_key: Pre-uploaded S3 key (optional)
            simulated_transcript: For testing without audio (optional)
        
        Returns:
            Complete pipeline result with care note, family update, alerts
        """
        pipeline_result = {
            "pipeline_id": f"pipe-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{resident_id}",
            "resident_id": resident_id,
            "note_type": note_type,
            "recorded_by": recorded_by,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "steps": {},
            "errors": [],
        }
        
        try:
            # Step 1: Transcribe audio
            transcript_result = await self._step_transcribe(
                audio_bytes=audio_bytes,
                s3_key=s3_key,
                simulated_transcript=simulated_transcript,
            )
            pipeline_result["steps"]["transcribe"] = transcript_result
            
            if transcript_result.get("error"):
                pipeline_result["errors"].append(f"Transcription failed: {transcript_result['error']}")
                return pipeline_result
            
            transcript = transcript_result["transcript"]
            
            # Step 2: Gather resident context
            context = await self._step_gather_context(resident_id)
            pipeline_result["steps"]["gather_context"] = {
                "resident_found": context.get("resident") is not None,
                "care_plan_found": context.get("care_plan") is not None,
                "recent_notes_count": len(context.get("recent_notes", [])),
            }
            
            # Step 3: De-identify
            phi_result = self._step_deidentify(transcript)
            pipeline_result["steps"]["deidentify"] = {
                "phi_tokens_count": len(phi_result["replacements"]),
                "success": True,
            }
            
            # Step 4: Generate structured note with AI
            note_result = await self._step_generate_note(
                transcript=phi_result["text"],
                note_type=note_type,
                resident=context.get("resident"),
                care_plan=context.get("care_plan"),
                recent_notes=context.get("recent_notes"),
                phi_replacements=phi_result["replacements"],
            )
            pipeline_result["steps"]["generate_note"] = note_result
            
            if note_result.get("error"):
                pipeline_result["errors"].append(f"Note generation failed: {note_result['error']}")
                return pipeline_result
            
            structured_note = note_result["note"]
            
            # Step 5: Quality gate
            gate_result = self._step_quality_gate(structured_note)
            pipeline_result["steps"]["quality_gate"] = gate_result
            
            # Step 6: CQC tagging
            cqc_result = await self._step_cqc_tag(structured_note)
            pipeline_result["steps"]["cqc_tag"] = cqc_result
            
            # Step 7: Generate family update
            family_result = await self._step_family_update(
                resident=context.get("resident"),
                note_summary=structured_note.get("concerns", ""),
                recent_activities=context.get("recent_activities"),
                mood=structured_note.get("mood", ""),
            )
            pipeline_result["steps"]["family_update"] = family_result
            
            # Step 8: Persist to database
            persist_result = await self._step_persist(
                resident_id=resident_id,
                transcript=transcript,
                structured_note=structured_note,
                quality_gate=gate_result,
                cqc_tags=cqc_result.get("tags", []),
                family_update=family_result.get("update", {}),
                recorded_by=recorded_by,
            )
            pipeline_result["steps"]["persist"] = persist_result
            
            # Step 9: Check for deterioration
            if structured_note.get("concern_flag"):
                deterioration_result = await self._step_check_deterioration(
                    resident_id=resident_id,
                    resident=context.get("resident"),
                )
                pipeline_result["steps"]["deterioration_check"] = deterioration_result
            
            # Step 10: Dispatch notifications
            notification_result = await self._step_notify(
                quality_gate=gate_result,
                resident_id=resident_id,
                resident=context.get("resident"),
                care_note_id=persist_result.get("care_note_id"),
            )
            pipeline_result["steps"]["notifications"] = notification_result
            
            # Step 11: Clean up audio
            if s3_key:
                cleanup_result = await self._step_cleanup_audio(s3_key)
                pipeline_result["steps"]["audio_cleanup"] = cleanup_result
            
            pipeline_result["completed_at"] = datetime.now(timezone.utc).isoformat()
            pipeline_result["status"] = "success" if not pipeline_result["errors"] else "partial"
            
        except Exception as e:
            logger.exception(f"Pipeline failed for resident {resident_id}")
            pipeline_result["errors"].append(f"Pipeline exception: {str(e)}")
            pipeline_result["status"] = "failed"
            pipeline_result["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        return pipeline_result
    
    async def _step_transcribe(
        self,
        audio_bytes: bytes | None,
        s3_key: str | None,
        simulated_transcript: str | None,
    ) -> dict[str, Any]:
        """Step 1: Transcribe audio using Whisper API."""
        try:
            if simulated_transcript:
                return {
                    "transcript": simulated_transcript,
                    "engine": "simulated",
                    "detected_language": "en",
                    "success": True,
                }
            
            # Real Whisper transcription
            result = transcribe_audio(
                s3_key=s3_key,
                simulated_transcript=None,
            )
            
            return {
                "transcript": result["transcript"],
                "engine": result["engine"],
                "detected_language": result.get("detected_language", "en"),
                "audio_cleanup": result.get("audio_cleanup"),
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return {
                "transcript": "",
                "error": str(e),
                "success": False,
            }
    
    async def _step_gather_context(self, resident_id: str) -> dict[str, Any]:
        """Step 2: Gather resident context from database."""
        context = {
            "resident": None,
            "care_plan": None,
            "recent_notes": [],
            "recent_activities": [],
            "medications": [],
            "vitals": [],
        }
        
        try:
            # Query resident
            from app.models.resident import Resident
            from sqlalchemy import select
            
            result = await self.db.execute(select(Resident).where(Resident.id == resident_id))
            resident = result.scalar_one_or_none()
            
            if resident:
                context["resident"] = {
                    "id": str(resident.id),
                    "name": resident.name,
                    "age": resident.age,
                    "primary_need": resident.primary_need,
                    "mobility": resident.mobility,
                    "falls_risk": resident.falls_risk,
                    "deterioration": resident.deterioration,
                    "hydration": resident.hydration,
                    "preferences": resident.preferences,
                }
            
            # Query care plan
            from app.models.care_plan import CarePlan
            result = await self.db.execute(
                select(CarePlan).where(CarePlan.resident_id == resident_id).order_by(CarePlan.created_at.desc())
            )
            care_plan = result.scalar_one_or_none()
            
            if care_plan:
                context["care_plan"] = {
                    "goals": care_plan.goals,
                    "interventions": care_plan.interventions,
                    "preferences": care_plan.preferences,
                    "last_reviewed": care_plan.last_reviewed.isoformat() if care_plan.last_reviewed else None,
                }
            
            # Query recent notes
            from app.models.care_note import CareNote
            result = await self.db.execute(
                select(CareNote)
                .where(CareNote.resident_id == resident_id)
                .order_by(CareNote.created_at.desc())
                .limit(10)
            )
            notes = result.scalars().all()
            context["recent_notes"] = [
                {
                    "id": str(n.id),
                    "type": n.note_type,
                    "summary": n.summary,
                    "created_at": n.created_at.isoformat() if n.created_at else None,
                }
                for n in notes
            ]
            
        except Exception as e:
            logger.warning(f"Failed to gather full context for {resident_id}: {e}")
        
        return context
    
    def _step_deidentify(self, transcript: str) -> dict[str, Any]:
        """Step 3: De-identify PHI before LLM processing."""
        filtered = deidentify(transcript)
        return {
            "text": filtered.text,
            "replacements": filtered.replacements,
            "success": True,
        }
    
    async def _step_generate_note(
        self,
        transcript: str,
        note_type: str,
        resident: dict[str, Any] | None,
        care_plan: dict[str, Any] | None,
        recent_notes: list[dict[str, Any]],
        phi_replacements: dict[str, str],
    ) -> dict[str, Any]:
        """Step 4: Generate structured note with Claude Sonnet."""
        try:
            note = await generate_structured_note(
                transcript=transcript,
                note_type=note_type,
                resident=resident,
                care_plan=care_plan,
                recent_notes=recent_notes,
            )
            
            return {
                "note": note,
                "ai_provider": note.get("ai_provider"),
                "ai_model": note.get("ai_model"),
                "fallback_used": note.get("fallback_used"),
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Note generation failed: {e}")
            return {
                "note": None,
                "error": str(e),
                "success": False,
            }
    
    def _step_quality_gate(self, note: dict[str, Any]) -> dict[str, Any]:
        """Step 5: Evaluate note through quality gate."""
        try:
            gate_result = evaluate_note(note)
            return {
                "route": gate_result.route,
                "confidence": gate_result.confidence,
                "reasons": gate_result.reasons,
                "safeguarding": gate_result.safeguarding,
                "success": True,
            }
        except Exception as e:
            logger.error(f"Quality gate failed: {e}")
            return {
                "route": "HARD_FLAG",
                "confidence": 0.0,
                "reasons": [f"Quality gate error: {str(e)}"],
                "safeguarding": False,
                "success": False,
            }
    
    async def _step_cqc_tag(self, note: dict[str, Any]) -> dict[str, Any]:
        """Step 6: Auto-tag CQC Quality Statements."""
        try:
            tags = tag_quality_statement(
                note_type=note.get("note_type", "general"),
                text=note.get("concerns", ""),
            )
            
            return {
                "tags": tags,
                "tag_count": len(tags),
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"CQC tagging failed: {e}")
            return {
                "tags": [],
                "tag_count": 0,
                "error": str(e),
                "success": False,
            }
    
    async def _step_family_update(
        self,
        resident: dict[str, Any] | None,
        note_summary: str,
        recent_activities: list[str] | None,
        mood: str | None,
    ) -> dict[str, Any]:
        """Step 7: Generate family update."""
        try:
            if not resident:
                return {
                    "update": None,
                    "error": "No resident context available",
                    "success": False,
                }
            
            update = await generate_family_update(
                resident=resident,
                note_summary=note_summary,
                recent_activities=recent_activities,
                mood=mood,
            )
            
            return {
                "update": update,
                "ai_provider": update.get("ai_provider"),
                "ai_model": update.get("ai_model"),
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Family update generation failed: {e}")
            return {
                "update": None,
                "error": str(e),
                "success": False,
            }
    
    async def _step_persist(
        self,
        resident_id: str,
        transcript: str,
        structured_note: dict[str, Any],
        quality_gate: dict[str, Any],
        cqc_tags: list[str],
        family_update: dict[str, Any] | None,
        recorded_by: str,
    ) -> dict[str, Any]:
        """Step 8: Persist care note to database."""
        try:
            from app.models.care_note import CareNote
            from uuid import uuid4
            
            care_note = CareNote(
                id=uuid4(),
                resident_id=resident_id,
                note_type=structured_note.get("note_type", "general"),
                transcript=transcript,
                summary=structured_note.get("concerns", ""),
                personal_care=structured_note.get("personal_care"),
                nutrition=structured_note.get("nutrition"),
                mobility=structured_note.get("mobility"),
                mood=structured_note.get("mood"),
                skin=structured_note.get("skin"),
                continence=structured_note.get("continence"),
                sleep=structured_note.get("sleep"),
                social=structured_note.get("social"),
                concerns=structured_note.get("concerns"),
                concern_flag=structured_note.get("concern_flag", False),
                family_update=family_update.get("update_text", "") if family_update else None,
                quality_gate_route=quality_gate.get("route"),
                quality_gate_confidence=quality_gate.get("confidence"),
                cqc_tags=cqc_tags,
                recorded_by=recorded_by,
                ai_provider=structured_note.get("ai_provider"),
                ai_model=structured_note.get("ai_model"),
                fallback_used=structured_note.get("fallback_used", False),
            )
            
            self.db.add(care_note)
            await self.db.commit()
            
            return {
                "care_note_id": str(care_note.id),
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Failed to persist care note: {e}")
            await self.db.rollback()
            return {
                "care_note_id": None,
                "error": str(e),
                "success": False,
            }
    
    async def _step_check_deterioration(
        self,
        resident_id: str,
        resident: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Step 9: Check for deterioration signals."""
        try:
            if not resident:
                return {"success": False, "error": "No resident context"}
            
            # Gather signals
            from app.models.care_note import CareNote
            from sqlalchemy import select
            
            result = await self.db.execute(
                select(CareNote)
                .where(CareNote.resident_id == resident_id)
                .order_by(CareNote.created_at.desc())
                .limit(30)
            )
            notes = result.scalars().all()
            
            note_dicts = [
                {
                    "id": str(n.id),
                    "type": n.note_type,
                    "summary": n.summary,
                    "created_at": n.created_at.isoformat() if n.created_at else None,
                }
                for n in notes
            ]
            
            deterioration = await detect_deterioration(
                resident=resident,
                notes=note_dicts,
            )
            
            return {
                "risk_score": deterioration.get("risk_score"),
                "alert_level": deterioration.get("alert_level"),
                "most_likely_pattern": deterioration.get("most_likely_pattern"),
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Deterioration check failed: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def _step_notify(
        self,
        quality_gate: dict[str, Any],
        resident_id: str,
        resident: dict[str, Any] | None,
        care_note_id: str | None,
    ) -> dict[str, Any]:
        """Step 10: Dispatch notifications based on quality gate."""
        notifications_sent = []
        
        try:
            route = quality_gate.get("route", "AUTO_FILE")
            
            if route == "SAFEGUARDING":
                # Immediate safeguarding alert
                await self.notification_service.send_safeguarding_alert(
                    resident_id=resident_id,
                    resident_name=resident.get("name", "Unknown") if resident else "Unknown",
                    care_note_id=care_note_id,
                )
                notifications_sent.append("safeguarding_alert")
                
            elif route == "HARD_FLAG":
                # Senior review alert
                await self.notification_service.send_senior_review_alert(
                    resident_id=resident_id,
                    resident_name=resident.get("name", "Unknown") if resident else "Unknown",
                    care_note_id=care_note_id,
                )
                notifications_sent.append("senior_review_alert")
                
            elif route == "SOFT_FLAG":
                # Note for handover
                await self.notification_service.send_handover_flag(
                    resident_id=resident_id,
                    care_note_id=care_note_id,
                )
                notifications_sent.append("handover_flag")
            
            return {
                "notifications_sent": notifications_sent,
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Notification dispatch failed: {e}")
            return {
                "notifications_sent": notifications_sent,
                "error": str(e),
                "success": False,
            }
    
    async def _step_cleanup_audio(self, s3_key: str) -> dict[str, Any]:
        """Step 11: Clean up audio from S3."""
        try:
            from app.services.s3_service import delete_object
            result = delete_object(s3_key)
            return {
                "deleted": result.get("deleted", False),
                "success": True,
            }
        except Exception as e:
            logger.error(f"Audio cleanup failed: {e}")
            return {
                "deleted": False,
                "error": str(e),
                "success": False,
            }
    
    # ── Additional Pipeline Methods ──
    
    async def process_deterioration_scan(
        self,
        resident_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        """Run deterioration scan for all active residents."""
        results = []
        
        try:
            if not resident_ids:
                # Get all active residents
                from app.models.resident import Resident
                from sqlalchemy import select
                
                result = await self.db.execute(select(Resident).where(Resident.status == "active"))
                residents = result.scalars().all()
                resident_ids = [str(r.id) for r in residents]
            
            for resident_id in resident_ids:
                context = await self._step_gather_context(resident_id)
                resident = context.get("resident")
                
                if not resident:
                    continue
                
                deterioration = await detect_deterioration(
                    resident=resident,
                    notes=context.get("recent_notes", []),
                )
                
                results.append({
                    "resident_id": resident_id,
                    "risk_score": deterioration.get("risk_score"),
                    "alert_level": deterioration.get("alert_level"),
                    "pattern": deterioration.get("most_likely_pattern"),
                })
            
            return {
                "residents_scanned": len(resident_ids),
                "results": results,
                "alerts_triggered": sum(1 for r in results if r.get("alert_level") not in ("none", "monitor")),
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Deterioration scan failed: {e}")
            return {
                "residents_scanned": 0,
                "results": [],
                "error": str(e),
                "success": False,
            }
    
    async def process_falls_scoring(
        self,
        resident_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        """Run falls risk scoring for all active residents."""
        results = []
        
        try:
            if not resident_ids:
                from app.models.resident import Resident
                from sqlalchemy import select
                
                result = await self.db.execute(select(Resident).where(Resident.status == "active"))
                residents = result.scalars().all()
                resident_ids = [str(r.id) for r in residents]
            
            for resident_id in resident_ids:
                context = await self._step_gather_context(resident_id)
                resident = context.get("resident")
                
                if not resident:
                    continue
                
                falls = await score_falls_risk(
                    resident=resident,
                    notes=context.get("recent_notes", []),
                )
                
                results.append({
                    "resident_id": resident_id,
                    "score": falls.get("score"),
                    "risk_level": falls.get("risk_level"),
                    "interventions": falls.get("preventive_interventions", []),
                })
            
            return {
                "residents_scored": len(resident_ids),
                "results": results,
                "high_risk_count": sum(1 for r in results if r.get("risk_level") in ("high", "very_high")),
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Falls scoring failed: {e}")
            return {
                "residents_scored": 0,
                "results": [],
                "error": str(e),
                "success": False,
            }
