"""
Real Celery Tasks for CareHomeOS AI Automation
==============================================
Production-ready Celery tasks that query the database, call AI services,
and write results back to the database with proper error handling and idempotency.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import SessionLocal as async_session_maker
from app.models.care_home import CareHome
from app.models.deterioration_alert import DeteriorationAlert
from app.models.falls_risk import FallsRisk
from app.models.resident import Resident
from app.services.ai.core_ai_services import (
    detect_deterioration,
    score_falls_risk,
    generate_family_update,
    generate_handover,
)
from app.services.ai_pipeline import AIPipeline
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Helper: Database session context manager for Celery tasks
# ──────────────────────────────────────────────────────────────────────────────

async def get_db() -> AsyncSession:
    """Get async database session for Celery tasks."""
    async with async_session_maker() as session:
        return session


# ──────────────────────────────────────────────────────────────────────────────
# 1. Nightly Deterioration Scan (2:00 AM)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.deterioration_scan.run", bind=True, max_retries=3)
def run_nightly_deterioration(self) -> dict:
    """Run nightly deterioration scan for all active residents.
    
    Schedule: Every night at 02:00 UTC
    Task: Analyse 30 days of clinical data per resident using Claude Opus
    Output: Create deterioration alerts for residents with elevated risk
    """
    import asyncio
    return asyncio.run(_async_run_nightly_deterioration())


async def _async_run_nightly_deterioration() -> dict:
    """Async implementation of deterioration scan."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "deterioration_scan",
        "started_at": start_time.isoformat(),
        "residents_scanned": 0,
        "alerts_created": 0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            # Get all active residents
            residents_result = await db.execute(
                select(Resident).where(Resident.status == "active")
            )
            residents = residents_result.scalars().all()
            
            results["residents_scanned"] = len(residents)
            
            for resident in residents:
                try:
                    # Gather 30-day signals
                    from app.models.care_note import CareNote
                    from app.models.vital_signs import VitalSigns
                    from app.models.medication import Medication
                    from app.models.incident import Incident
                    from app.models.fluid_balance import FluidBalance
                    
                    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
                    
                    # Get recent notes
                    notes_result = await db.execute(
                        select(CareNote)
                        .where(CareNote.resident_id == str(resident.id))
                        .where(CareNote.created_at >= cutoff)
                        .order_by(CareNote.created_at.desc())
                    )
                    notes = notes_result.scalars().all()
                    
                    # Get recent vitals
                    vitals_result = await db.execute(
                        select(VitalSigns)
                        .where(VitalSigns.resident_id == str(resident.id))
                        .where(VitalSigns.recorded_at >= cutoff)
                        .order_by(VitalSigns.recorded_at.desc())
                    )
                    vitals = vitals_result.scalars().all()
                    
                    # Get current medications
                    meds_result = await db.execute(
                        select(Medication)
                        .where(Medication.resident_id == str(resident.id))
                        .where(Medication.active == True)
                    )
                    medications = meds_result.scalars().all()
                    
                    # Get recent incidents
                    incidents_result = await db.execute(
                        select(Incident)
                        .where(Incident.resident_id == str(resident.id))
                        .where(Incident.occurred_at >= cutoff)
                        .order_by(Incident.occurred_at.desc())
                    )
                    incidents = incidents_result.scalars().all()
                    
                    # Build resident dict
                    resident_dict = {
                        "id": str(resident.id),
                        "name": resident.name,
                        "age": resident.age,
                        "primary_need": resident.primary_need,
                        "mobility": resident.mobility,
                        "falls_risk": resident.falls_risk,
                        "deterioration": resident.deterioration,
                        "hydration": resident.hydration,
                    }
                    
                    # Convert to dicts
                    notes_dicts = [
                        {
                            "id": str(n.id),
                            "type": n.note_type,
                            "summary": n.summary,
                            "created_at": n.created_at.isoformat() if n.created_at else None,
                        }
                        for n in notes
                    ]
                    
                    vitals_dicts = [
                        {
                            "id": str(v.id),
                            "temperature": v.temperature,
                            "heart_rate": v.heart_rate,
                            "blood_pressure": v.blood_pressure,
                            "respiratory_rate": v.respiratory_rate,
                            "spo2": v.spo2,
                            "consciousness": v.consciousness,
                            "recorded_at": v.recorded_at.isoformat() if v.recorded_at else None,
                        }
                        for v in vitals
                    ]
                    
                    meds_dicts = [
                        {
                            "id": str(m.id),
                            "name": m.name,
                            "dose": m.dose,
                            "frequency": m.frequency,
                            "route": m.route,
                        }
                        for m in medications
                    ]
                    
                    incidents_dicts = [
                        {
                            "id": str(i.id),
                            "type": i.type,
                            "description": i.description,
                            "occurred_at": i.occurred_at.isoformat() if i.occurred_at else None,
                        }
                        for i in incidents
                    ]
                    
                    # Run AI analysis
                    analysis = await detect_deterioration(
                        resident=resident_dict,
                        notes=notes_dicts,
                        vitals=vitals_dicts,
                        medications=meds_dicts,
                        incidents=incidents_dicts,
                        days=30,
                    )
                    
                    # Create alert if warranted
                    alert_level = analysis.get("alert_level", "none")
                    if alert_level in ("review_today", "urgent_gp", "emergency"):
                        alert = DeteriorationAlert(
                            resident_id=str(resident.id),
                            risk_score=analysis.get("risk_score", 0),
                            alert_level=alert_level,
                            most_likely_pattern=analysis.get("most_likely_pattern", "none"),
                            confidence=analysis.get("confidence", 0.5),
                            key_signals=analysis.get("key_signals", []),
                            trend=analysis.get("trend", "stable"),
                            recommended_action=analysis.get("recommended_action", ""),
                            observations_needed=analysis.get("observations_needed", []),
                            gp_contact_recommended=analysis.get("gp_contact_recommended", False),
                            explanation=analysis.get("explanation", ""),
                            ai_provider=analysis.get("ai_provider"),
                            ai_model=analysis.get("ai_model"),
                            fallback_used=analysis.get("fallback_used", False),
                            acknowledged=False,
                        )
                        
                        db.add(alert)
                        await db.flush()
                        
                        # Send notification
                        notification_service = NotificationService()
                        await notification_service.send_deterioration_alert(alert)
                        
                        results["alerts_created"] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to analyse resident {resident.id}: {e}")
                    results["errors"].append(f"Resident {resident.id}: {str(e)}")
            
            await db.commit()
            
    except Exception as e:
        logger.exception("Deterioration scan failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"Deterioration scan complete: {results['residents_scanned']} residents, "
        f"{results['alerts_created']} alerts, {len(results['errors'])} errors"
    )
    
    return results


# ──────────────────────────────────────────────────────────────────────────────
# 2. Daily Falls Scoring (5:00 AM)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.falls_scoring.run", bind=True, max_retries=3)
def run_daily_falls_scoring(self) -> dict:
    """Run daily falls risk scoring for all active residents.
    
    Schedule: Every day at 05:00 UTC
    Task: Calculate falls risk score using GPT-4o mini
    Output: Update falls risk records, trigger care plan updates if threshold exceeded
    """
    import asyncio
    return asyncio.run(_async_run_daily_falls_scoring())


async def _async_run_daily_falls_scoring() -> dict:
    """Async implementation of falls scoring."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "falls_scoring",
        "started_at": start_time.isoformat(),
        "residents_scored": 0,
        "high_risk_count": 0,
        "care_plan_updates": 0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            residents_result = await db.execute(
                select(Resident).where(Resident.status == "active")
            )
            residents = residents_result.scalars().all()
            
            results["residents_scored"] = len(residents)
            
            for resident in residents:
                try:
                    # Gather context
                    from app.models.care_note import CareNote
                    from app.models.medication import Medication
                    from app.models.incident import Incident
                    
                    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
                    
                    notes_result = await db.execute(
                        select(CareNote)
                        .where(CareNote.resident_id == str(resident.id))
                        .where(CareNote.created_at >= cutoff)
                        .order_by(CareNote.created_at.desc())
                    )
                    notes = notes_result.scalars().all()
                    
                    meds_result = await db.execute(
                        select(Medication)
                        .where(Medication.resident_id == str(resident.id))
                        .where(Medication.active == True)
                    )
                    medications = meds_result.scalars().all()
                    
                    incidents_result = await db.execute(
                        select(Incident)
                        .where(Incident.resident_id == str(resident.id))
                        .where(Incident.occurred_at >= cutoff)
                        .order_by(Incident.occurred_at.desc())
                    )
                    incidents = incidents_result.scalars().all()
                    
                    resident_dict = {
                        "id": str(resident.id),
                        "name": resident.name,
                        "age": resident.age,
                        "primary_need": resident.primary_need,
                        "mobility": resident.mobility,
                        "falls_last_90_days": resident.falls_last_90_days or 0,
                        "confusion": resident.confusion or False,
                        "night_wandering": resident.night_wandering or False,
                    }
                    
                    notes_dicts = [
                        {
                            "id": str(n.id),
                            "type": n.note_type,
                            "summary": n.summary,
                            "created_at": n.created_at.isoformat() if n.created_at else None,
                        }
                        for n in notes
                    ]
                    
                    meds_dicts = [
                        {
                            "id": str(m.id),
                            "name": m.name,
                            "dose": m.dose,
                            "frequency": m.frequency,
                            "route": m.route,
                        }
                        for m in medications
                    ]
                    
                    incidents_dicts = [
                        {
                            "id": str(i.id),
                            "type": i.type,
                            "description": i.description,
                            "occurred_at": i.occurred_at.isoformat() if i.occurred_at else None,
                        }
                        for i in incidents
                    ]
                    
                    # Run AI scoring
                    falls = await score_falls_risk(
                        resident=resident_dict,
                        notes=notes_dicts,
                        medications=meds_dicts,
                        incidents=incidents_dicts,
                    )
                    
                    # Store result
                    falls_risk = FallsRisk(
                        resident_id=str(resident.id),
                        score=falls.get("score", 0),
                        risk_level=falls.get("risk_level", "low"),
                        confidence=falls.get("confidence", 0.5),
                        factors=falls.get("factors", []),
                        new_since_yesterday=falls.get("new_since_yesterday", False),
                        preventive_interventions=falls.get("preventive_interventions", []),
                        environmental_recommendations=falls.get("environmental_recommendations", []),
                        medication_review_needed=falls.get("medication_review_needed", False),
                        review_care_plan=falls.get("review_care_plan", False),
                        ai_provider=falls.get("ai_provider"),
                        ai_model=falls.get("ai_model"),
                        fallback_used=falls.get("fallback_used", False),
                    )
                    
                    db.add(falls_risk)
                    
                    if falls.get("risk_level") in ("high", "very_high"):
                        results["high_risk_count"] += 1
                        
                        # Trigger care plan update suggestion
                        if falls.get("review_care_plan"):
                            results["care_plan_updates"] += 1
                            # Create notification for manager
                            notification_service = NotificationService()
                            await notification_service.send_falls_risk_alert(
                                resident_id=str(resident.id),
                                resident_name=resident.name,
                                risk_level=falls.get("risk_level"),
                                score=falls.get("score"),
                            )
                    
                except Exception as e:
                    logger.error(f"Failed to score falls for resident {resident.id}: {e}")
                    results["errors"].append(f"Resident {resident.id}: {str(e)}")
            
            await db.commit()
            
    except Exception as e:
        logger.exception("Falls scoring failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"Falls scoring complete: {results['residents_scored']} residents, "
        f"{results['high_risk_count']} high risk, {len(results['errors'])} errors"
    )
    
    return results


# ──────────────────────────────────────────────────────────────────────────────
# 3. eMAR Missed Dose Monitor (Every 30 minutes)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.emar_monitor.run", bind=True, max_retries=3)
def check_missed_doses(self) -> dict:
    """Check for missed medication doses and alert senior staff.
    
    Schedule: Every 30 minutes
    Task: Compare scheduled medications vs administration records
    Output: Alert senior on duty if dose missed by >30 minutes
    """
    import asyncio
    return asyncio.run(_async_check_missed_doses())


async def _async_check_missed_doses() -> dict:
    """Async implementation of missed dose check."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "emar_monitor",
        "started_at": start_time.isoformat(),
        "medications_checked": 0,
        "missed_doses_found": 0,
        "alerts_sent": 0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            from app.models.medication import Medication
            from app.models.mar_record import MARRecord
            
            # Get all active medications scheduled for today
            today = datetime.now(timezone.utc).date()
            
            meds_result = await db.execute(
                select(Medication)
                .where(Medication.active == True)
            )
            medications = meds_result.scalars().all()
            
            results["medications_checked"] = len(medications)
            
            for med in medications:
                try:
                    # Check if administration recorded within 30 min of scheduled time
                    scheduled_time = datetime.combine(today, med.scheduled_time)
                    if scheduled_time.tzinfo is None:
                        scheduled_time = scheduled_time.replace(tzinfo=timezone.utc)
                    
                    window_start = scheduled_time - timedelta(minutes=30)
                    window_end = scheduled_time + timedelta(minutes=30)
                    
                    # Check for administration record
                    mar_result = await db.execute(
                        select(MARRecord)
                        .where(MARRecord.medication_id == str(med.id))
                        .where(MARRecord.administered_at >= window_start)
                        .where(MARRecord.administered_at <= window_end)
                    )
                    mar_record = mar_result.scalar_one_or_none()
                    
                    if not mar_record and datetime.now(timezone.utc) > window_end:
                        # Missed dose
                        results["missed_doses_found"] += 1
                        
                        # Check if already alerted
                        from app.models.notification import Notification
                        alert_result = await db.execute(
                            select(Notification)
                            .where(Notification.reference_type == "missed_dose")
                            .where(Notification.reference_id == str(med.id))
                            .where(Notification.created_at >= window_start)
                        )
                        existing_alert = alert_result.scalar_one_or_none()
                        
                        if not existing_alert:
                            # Send alert
                            notification_service = NotificationService()
                            await notification_service.send_missed_dose_alert(
                                medication_id=str(med.id),
                                resident_id=med.resident_id,
                                medication_name=med.name,
                                scheduled_time=scheduled_time.isoformat(),
                            )
                            results["alerts_sent"] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to check medication {med.id}: {e}")
                    results["errors"].append(f"Medication {med.id}: {str(e)}")
            
    except Exception as e:
        logger.exception("Missed dose check failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"Missed dose check complete: {results['medications_checked']} checked, "
        f"{results['missed_doses_found']} missed, {results['alerts_sent']} alerts sent"
    )
    
    return results


# ──────────────────────────────────────────────────────────────────────────────
# 4. Daily Family Updates (6:30 PM)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.family_updates.run", bind=True, max_retries=3)
def send_daily_family_updates(self) -> dict:
    """Send daily family updates for all residents with care notes today.
    
    Schedule: Every day at 18:30 UTC
    Task: Aggregate day's care notes and generate family updates
    Output: Send updates via email and push notification
    """
    import asyncio
    return asyncio.run(_async_send_daily_family_updates())


async def _async_send_daily_family_updates() -> dict:
    """Async implementation of family updates."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "family_updates",
        "started_at": start_time.isoformat(),
        "residents_processed": 0,
        "updates_sent": 0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            from app.models.care_note import CareNote
            from app.models.resident import Resident
            
            # Get residents with notes today
            today = datetime.now(timezone.utc).date()
            today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
            today_end = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
            
            notes_result = await db.execute(
                select(CareNote)
                .where(CareNote.created_at >= today_start)
                .where(CareNote.created_at <= today_end)
                .where(CareNote.concern_flag == False)  # Only non-concern notes for family
                .distinct(CareNote.resident_id)
            )
            notes = notes_result.scalars().all()
            
            resident_ids = set(n.resident_id for n in notes)
            
            for resident_id in resident_ids:
                try:
                    # Get resident
                    resident_result = await db.execute(
                        select(Resident).where(Resident.id == resident_id)
                    )
                    resident = resident_result.scalar_one_or_none()
                    
                    if not resident:
                        continue
                    
                    # Get today's notes for this resident
                    resident_notes_result = await db.execute(
                        select(CareNote)
                        .where(CareNote.resident_id == resident_id)
                        .where(CareNote.created_at >= today_start)
                        .where(CareNote.created_at <= today_end)
                        .where(CareNote.concern_flag == False)
                        .order_by(CareNote.created_at.desc())
                    )
                    resident_notes = resident_notes_result.scalars().all()
                    
                    if not resident_notes:
                        continue
                    
                    # Generate summary
                    note_summaries = [n.summary for n in resident_notes if n.summary]
                    summary_text = " ".join(note_summaries[:3])  # Last 3 notes
                    
                    resident_dict = {
                        "id": str(resident.id),
                        "name": resident.name,
                        "preferences": resident.preferences,
                    }
                    
                    # Generate family update
                    update = await generate_family_update(
                        resident=resident_dict,
                        note_summary=summary_text,
                    )
                    
                    # Send to family members
                    from app.models.resident import FamilyContact
                    family_result = await db.execute(
                        select(FamilyContact)
                        .where(FamilyContact.resident_id == resident_id)
                        .where(FamilyContact.active == True)
                    )
                    family_members = family_result.scalars().all()
                    
                    notification_service = NotificationService()
                    for family_member in family_members:
                        await notification_service.send_family_update(
                            recipient_email=family_member.email,
                            recipient_name=family_member.name,
                            resident_name=resident.name,
                            update_text=update.get("update_text", ""),
                        )
                        results["updates_sent"] += 1
                    
                    results["residents_processed"] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to send family update for resident {resident_id}: {e}")
                    results["errors"].append(f"Resident {resident_id}: {str(e)}")
            
    except Exception as e:
        logger.exception("Family updates failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"Family updates complete: {results['residents_processed']} residents, "
        f"{results['updates_sent']} updates sent, {len(results['errors'])} errors"
    )
    
    return results


# ──────────────────────────────────────────────────────────────────────────────
# 5. Shift Handover Delivery (7:00 AM, 2:00 PM, 9:00 PM)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.handover_delivery.run", bind=True, max_retries=3)
def generate_shift_handovers(self) -> dict:
    """Generate AI shift handovers at shift changeover times.
    
    Schedule: 07:00, 14:00, 21:00 UTC
    Task: Summarise outgoing shift notes into handover priorities
    Output: Deliver to incoming team via push notification
    """
    import asyncio
    return asyncio.run(_async_generate_shift_handovers())


async def _async_generate_shift_handovers() -> dict:
    """Async implementation of handover generation."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "handover_delivery",
        "started_at": start_time.isoformat(),
        "handovers_generated": 0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            from app.models.care_note import CareNote
            from app.models.care_home import CareHome
            
            # Get all care homes
            homes_result = await db.execute(select(CareHome))
            homes = homes_result.scalars().all()
            
            for home in homes:
                try:
                    # Determine shift period based on current time
                    current_hour = datetime.now(timezone.utc).hour
                    if 6 <= current_hour < 14:
                        shift_period = "morning"
                        shift_start = datetime.now(timezone.utc).replace(hour=6, minute=0, second=0)
                        shift_end = datetime.now(timezone.utc).replace(hour=14, minute=0, second=0)
                    elif 14 <= current_hour < 22:
                        shift_period = "afternoon"
                        shift_start = datetime.now(timezone.utc).replace(hour=14, minute=0, second=0)
                        shift_end = datetime.now(timezone.utc).replace(hour=22, minute=0, second=0)
                    else:
                        shift_period = "night"
                        shift_start = datetime.now(timezone.utc).replace(hour=22, minute=0, second=0)
                        shift_end = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=6, minute=0, second=0)
                    
                    # Get shift notes
                    notes_result = await db.execute(
                        select(CareNote)
                        .where(CareNote.home_id == str(home.id))
                        .where(CareNote.created_at >= shift_start)
                        .where(CareNote.created_at <= shift_end)
                        .order_by(CareNote.created_at.desc())
                    )
                    notes = notes_result.scalars().all()
                    
                    if not notes:
                        continue
                    
                    # Get active alerts
                    from app.models.deterioration_alert import DeteriorationAlert
                    alerts_result = await db.execute(
                        select(DeteriorationAlert)
                        .where(DeteriorationAlert.acknowledged == False)
                        .order_by(DeteriorationAlert.created_at.desc())
                    )
                    alerts = alerts_result.scalars().all()
                    
                    notes_dicts = [
                        {
                            "id": str(n.id),
                            "resident": n.resident.name if hasattr(n, 'resident') else "Unknown",
                            "type": n.note_type,
                            "summary": n.summary,
                            "route": n.quality_gate_route,
                            "created_at": n.created_at.isoformat() if n.created_at else None,
                        }
                        for n in notes
                    ]
                    
                    alerts_dicts = [
                        {
                            "id": str(a.id),
                            "resident_name": a.resident.name if hasattr(a, 'resident') else "Unknown",
                            "alert_type": "deterioration",
                            "message": f"Risk score: {a.risk_score}, Pattern: {a.most_likely_pattern}",
                        }
                        for a in alerts
                    ]
                    
                    # Generate handover
                    handover = await generate_handover(
                        outgoing_shift_notes=notes_dicts,
                        current_alerts=alerts_dicts,
                    )
                    
                    # Send to incoming team
                    notification_service = NotificationService()
                    await notification_service.send_handover(
                        home_id=str(home.id),
                        shift_period=shift_period,
                        handover_data=handover,
                    )
                    
                    results["handovers_generated"] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to generate handover for home {home.id}: {e}")
                    results["errors"].append(f"Home {home.id}: {str(e)}")
            
    except Exception as e:
        logger.exception("Handover generation failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"Handover generation complete: {results['handovers_generated']} handovers, "
        f"{len(results['errors'])} errors"
    )
    
    return results


# ──────────────────────────────────────────────────────────────────────────────
# 6. Training Compliance Check (Monday 8:00 AM)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.training_compliance.run", bind=True, max_retries=3)
def check_training_expiry(self) -> dict:
    """Check for training expiry and alert managers.
    
    Schedule: Every Monday at 08:00 UTC
    Task: Check all staff training expiry dates
    Output: Alert at 60/30/7 days before expiry, auto-suspend from rota if expired
    """
    import asyncio
    return asyncio.run(_async_check_training_expiry())


async def _async_check_training_expiry() -> dict:
    """Async implementation of training compliance check."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "training_compliance",
        "started_at": start_time.isoformat(),
        "staff_checked": 0,
        "expiring_soon": 0,
        "expired": 0,
        "alerts_sent": 0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            from app.models.staff import Staff, TrainingRecord
            
            staff_result = await db.execute(select(Staff).where(Staff.active == True))
            staff_members = staff_result.scalars().all()
            
            results["staff_checked"] = len(staff_members)
            
            for staff in staff_members:
                try:
                    # Get training records
                    training_result = await db.execute(
                        select(TrainingRecord)
                        .where(TrainingRecord.staff_id == str(staff.id))
                        .where(TrainingRecord.active == True)
                    )
                    trainings = training_result.scalars().all()
                    
                    for training in trainings:
                        if not training.expiry_date:
                            continue
                        
                        days_until_expiry = (training.expiry_date - datetime.now(timezone.utc).date()).days
                        
                        if days_until_expiry < 0:
                            # Expired
                            results["expired"] += 1
                            
                            # Auto-suspend from rota if mandatory
                            if training.mandatory:
                                staff.available_for_rota = False
                                db.add(staff)
                            
                            # Alert manager
                            notification_service = NotificationService()
                            await notification_service.send_training_expiry_alert(
                                staff_id=str(staff.id),
                                staff_name=staff.name,
                                training_name=training.name,
                                days_overdue=abs(days_until_expiry),
                                mandatory=training.mandatory,
                            )
                            results["alerts_sent"] += 1
                            
                        elif days_until_expiry in (60, 30, 7):
                            # Expiring soon
                            results["expiring_soon"] += 1
                            
                            notification_service = NotificationService()
                            await notification_service.send_training_expiry_alert(
                                staff_id=str(staff.id),
                                staff_name=staff.name,
                                training_name=training.name,
                                days_until_expiry=days_until_expiry,
                                mandatory=training.mandatory,
                            )
                            results["alerts_sent"] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to check training for staff {staff.id}: {e}")
                    results["errors"].append(f"Staff {staff.id}: {str(e)}")
            
            await db.commit()
            
    except Exception as e:
        logger.exception("Training compliance check failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"Training compliance check complete: {results['staff_checked']} staff, "
        f"{results['expiring_soon']} expiring soon, {results['expired']} expired, "
        f"{results['alerts_sent']} alerts sent"
    )
    
    return results


# ──────────────────────────────────────────────────────────────────────────────
# 7. Weekly CQC Evidence Cache Refresh (Sunday 3:00 AM)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.cqc_evidence_refresh.run", bind=True, max_retries=3)
def refresh_cqc_evidence_cache(self) -> dict:
    """Pre-build CQC inspection evidence pack for all homes.
    
    Schedule: Every Sunday at 03:00 UTC
    Task: Aggregate all evidence, generate inspection pack, cache in Redis/S3
    Output: Cached pack ready for instant one-click generation
    """
    import asyncio
    return asyncio.run(_async_refresh_cqc_evidence_cache())


async def _async_refresh_cqc_evidence_cache() -> dict:
    """Async implementation of CQC evidence refresh."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "cqc_evidence_refresh",
        "started_at": start_time.isoformat(),
        "homes_processed": 0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            from app.models.care_home import CareHome
            from app.services.ai.core_ai_services import generate_inspection_pack
            
            homes_result = await db.execute(select(CareHome))
            homes = homes_result.scalars().all()
            
            for home in homes:
                try:
                    # Gather evidence summary
                    evidence_summary = await _gather_cqc_evidence(db, str(home.id))
                    
                    # Generate inspection pack
                    pack = await generate_inspection_pack(
                        home_id=str(home.id),
                        home_name=home.name,
                        evidence_summary=evidence_summary,
                    )
                    
                    # Cache in Redis
                    from app.services.redis_cache import redis_cache
                    cache_key = f"cqc_pack:{home.id}"
                    await redis_cache.set(cache_key, pack, ttl=604800)  # 7 days
                    
                    # Store snapshot
                    from app.models.cqc_snapshot import CQCSnapshot
                    snapshot = CQCSnapshot(
                        home_id=str(home.id),
                        snapshot_date=datetime.now(timezone.utc).date(),
                        overall_score=pack.get("key_questions", {}).get("safe", {}).get("score", 0),
                        safe_score=pack.get("key_questions", {}).get("safe", {}).get("score", 0),
                        effective_score=pack.get("key_questions", {}).get("effective", {}).get("score", 0),
                        caring_score=pack.get("key_questions", {}).get("caring", {}).get("score", 0),
                        responsive_score=pack.get("key_questions", {}).get("responsive", {}).get("score", 0),
                        well_led_score=pack.get("key_questions", {}).get("well_led", {}).get("score", 0),
                        priority_actions=pack.get("priority_actions", []),
                        missing_evidence=pack.get("missing_evidence", []),
                    )
                    db.add(snapshot)
                    
                    results["homes_processed"] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to refresh CQC evidence for home {home.id}: {e}")
                    results["errors"].append(f"Home {home.id}: {str(e)}")
            
            await db.commit()
            
    except Exception as e:
        logger.exception("CQC evidence refresh failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"CQC evidence refresh complete: {results['homes_processed']} homes, "
        f"{len(results['errors'])} errors"
    )
    
    return results


async def _gather_cqc_evidence(db: AsyncSession, home_id: str) -> dict[str, Any]:
    """Gather all CQC evidence for a care home."""
    evidence = {
        "safe": {"evidence_count": 0, "strengths": [], "risks": []},
        "effective": {"evidence_count": 0, "strengths": [], "risks": []},
        "caring": {"evidence_count": 0, "strengths": [], "risks": []},
        "responsive": {"evidence_count": 0, "strengths": [], "risks": []},
        "well_led": {"evidence_count": 0, "strengths": [], "risks": []},
    }
    
    # Count care notes by CQC tag
    from app.models.care_note import CareNote
    notes_result = await db.execute(
        select(CareNote).where(CareNote.home_id == home_id)
    )
    notes = notes_result.scalars().all()
    
    for note in notes:
        for tag in (note.cqc_tags or []):
            tag_lower = tag.lower()
            if "safe" in tag_lower:
                evidence["safe"]["evidence_count"] += 1
            elif "effective" in tag_lower:
                evidence["effective"]["evidence_count"] += 1
            elif "caring" in tag_lower:
                evidence["caring"]["evidence_count"] += 1
            elif "responsive" in tag_lower:
                evidence["responsive"]["evidence_count"] += 1
            elif "well-led" in tag_lower or "well_led" in tag_lower:
                evidence["well_led"]["evidence_count"] += 1
    
    # Count audits
    from app.models.audit import Audit
    audits_result = await db.execute(
        select(Audit).where(Audit.home_id == home_id)
    )
    audits = audits_result.scalars().all()
    evidence["well_led"]["evidence_count"] += len(audits)
    
    # Count training records
    from app.models.staff import TrainingRecord
    training_result = await db.execute(
        select(TrainingRecord)
        .join(Staff)
        .where(Staff.home_id == home_id)
    )
    training = training_result.scalars().all()
    evidence["effective"]["evidence_count"] += len(training)
    
    # Count incidents
    from app.models.incident import Incident
    incidents_result = await db.execute(
        select(Incident).where(Incident.home_id == home_id)
    )
    incidents = incidents_result.scalars().all()
    evidence["safe"]["evidence_count"] += len(incidents)
    
    return evidence


# ──────────────────────────────────────────────────────────────────────────────
# 8. Monthly Payroll Export (1st of month 6:00 AM)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.payroll_export.run", bind=True, max_retries=3)
def generate_monthly_payroll(self) -> dict:
    """Generate monthly payroll export.
    
    Schedule: 1st of each month at 06:00 UTC
    Task: Calculate pay from timesheet data
    Output: Export in Sage/Xero/Brightpay format
    """
    import asyncio
    return asyncio.run(_async_generate_monthly_payroll())


async def _async_generate_monthly_payroll() -> dict:
    """Async implementation of payroll export."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "payroll_export",
        "started_at": start_time.isoformat(),
        "staff_processed": 0,
        "total_gross": 0.0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            from app.models.staff import Staff
            from app.models.shift import Shift
            
            # Get previous month
            today = datetime.now(timezone.utc).date()
            if today.month == 1:
                prev_month = 12
                prev_year = today.year - 1
            else:
                prev_month = today.month - 1
                prev_year = today.year
            
            month_start = datetime(prev_year, prev_month, 1, tzinfo=timezone.utc)
            if prev_month == 12:
                month_end = datetime(prev_year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                month_end = datetime(prev_year, prev_month + 1, 1, tzinfo=timezone.utc)
            
            staff_result = await db.execute(select(Staff).where(Staff.active == True))
            staff_members = staff_result.scalars().all()
            
            payroll_data = []
            
            for staff in staff_members:
                try:
                    # Get shifts for previous month
                    shifts_result = await db.execute(
                        select(Shift)
                        .where(Shift.staff_id == str(staff.id))
                        .where(Shift.start_time >= month_start)
                        .where(Shift.start_time < month_end)
                    )
                    shifts = shifts_result.scalars().all()
                    
                    total_hours = sum(
                        (s.end_time - s.start_time).total_seconds() / 3600
                        for s in shifts
                        if s.end_time and s.start_time
                    )
                    
                    hourly_rate = staff.hourly_rate or 0
                    gross_pay = total_hours * hourly_rate
                    
                    payroll_data.append({
                        "staff_id": str(staff.id),
                        "name": staff.name,
                        "total_hours": round(total_hours, 2),
                        "hourly_rate": hourly_rate,
                        "gross_pay": round(gross_pay, 2),
                    })
                    
                    results["total_gross"] += gross_pay
                    results["staff_processed"] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to calculate payroll for staff {staff.id}: {e}")
                    results["errors"].append(f"Staff {staff.id}: {str(e)}")
            
            # Store payroll export
            from app.models.invoice import PayrollExport
            export = PayrollExport(
                month=prev_month,
                year=prev_year,
                data=payroll_data,
                total_gross=results["total_gross"],
                status="generated",
            )
            db.add(export)
            await db.commit()
            
            # Notify admin
            notification_service = NotificationService()
            await notification_service.send_payroll_ready_notification(
                month=prev_month,
                year=prev_year,
                total_gross=results["total_gross"],
            )
            
    except Exception as e:
        logger.exception("Payroll export failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"Payroll export complete: {results['staff_processed']} staff, "
        f"total gross: {results['total_gross']:.2f}, {len(results['errors'])} errors"
    )
    
    return results


# ──────────────────────────────────────────────────────────────────────────────
# 9. Safeguarding Scan (Hourly)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.safeguarding_scan.run", bind=True, max_retries=3)
def run_safeguarding_scan(self) -> dict:
    """Run hourly safeguarding scan across all care notes and incidents.
    
    Schedule: Every hour
    Task: Detect safeguarding patterns and trigger alerts
    Output: Create safeguarding cases if patterns detected
    """
    import asyncio
    return asyncio.run(_async_run_safeguarding_scan())


async def _async_run_safeguarding_scan() -> dict:
    """Async implementation of safeguarding scan."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "safeguarding_scan",
        "started_at": start_time.isoformat(),
        "notes_scanned": 0,
        "alerts_created": 0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            from app.models.care_note import CareNote
            from app.services.safeguarding.pattern_detector import scan_for_patterns
            
            # Get notes from last hour
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
            
            notes_result = await db.execute(
                select(CareNote)
                .where(CareNote.created_at >= one_hour_ago)
                .where(CareNote.quality_gate_route == "SAFEGUARDING")
            )
            notes = notes_result.scalars().all()
            
            results["notes_scanned"] = len(notes)
            
            for note in notes:
                try:
                    # Run pattern detection
                    patterns = await scan_for_patterns(
                        resident_id=note.resident_id,
                        text=note.summary,
                    )
                    
                    if patterns.get("pattern_detected"):
                        # Create safeguarding alert
                        from app.models.safeguarding import SafeguardingAlert
                        alert = SafeguardingAlert(
                            resident_id=note.resident_id,
                            care_note_id=str(note.id),
                            pattern_type=patterns.get("category", "unknown"),
                            severity=patterns.get("severity", "medium"),
                            confidence=patterns.get("confidence", 0.5),
                            description=patterns.get("summary", ""),
                            status="open",
                        )
                        db.add(alert)
                        
                        # Notify safeguarding lead
                        notification_service = NotificationService()
                        await notification_service.send_safeguarding_alert(
                            resident_id=note.resident_id,
                            pattern_type=patterns.get("category", "unknown"),
                            severity=patterns.get("severity", "medium"),
                        )
                        
                        results["alerts_created"] += 1
                
                except Exception as e:
                    logger.error(f"Failed to scan note {note.id}: {e}")
                    results["errors"].append(f"Note {note.id}: {str(e)}")
            
            await db.commit()
            
    except Exception as e:
        logger.exception("Safeguarding scan failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"Safeguarding scan complete: {results['notes_scanned']} notes, "
        f"{results['alerts_created']} alerts, {len(results['errors'])} errors"
    )
    
    return results


# ──────────────────────────────────────────────────────────────────────────────
# 10. Pattern Detection (Nightly)
# ──────────────────────────────────────────────────────────────────────────────

@shared_task(name="app.tasks.pattern_detector.run", bind=True, max_retries=3)
def run_pattern_detection(self) -> dict:
    """Run nightly pattern detection across incidents and care notes.
    
    Schedule: Every night at 02:30 UTC
    Task: Detect longitudinal patterns (falls clustering, medication errors, etc.)
    Output: Generate pattern reports for managers
    """
    import asyncio
    return asyncio.run(_async_run_pattern_detection())


async def _async_run_pattern_detection() -> dict:
    """Async implementation of pattern detection."""
    start_time = datetime.now(timezone.utc)
    results = {
        "task": "pattern_detector",
        "started_at": start_time.isoformat(),
        "residents_analysed": 0,
        "patterns_found": 0,
        "errors": [],
    }
    
    try:
        async with async_session_maker() as db:
            from app.models.resident import Resident
            from app.services.safeguarding.pattern_detector import analyse_longitudinal_patterns
            
            residents_result = await db.execute(
                select(Resident).where(Resident.status == "active")
            )
            residents = residents_result.scalars().all()
            
            for resident in residents:
                try:
                    patterns = await analyse_longitudinal_patterns(
                        resident_id=str(resident.id),
                        days=30,
                    )
                    
                    if patterns.get("patterns_found"):
                        results["patterns_found"] += 1
                        
                        # Store pattern report
                        from app.models.safeguarding import PatternReport
                        report = PatternReport(
                            resident_id=str(resident.id),
                            pattern_type=patterns.get("pattern_type", "unknown"),
                            description=patterns.get("description", ""),
                            confidence=patterns.get("confidence", 0.5),
                            evidence=patterns.get("evidence", []),
                            recommended_actions=patterns.get("recommended_actions", []),
                        )
                        db.add(report)
                    
                    results["residents_analysed"] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to analyse patterns for resident {resident.id}: {e}")
                    results["errors"].append(f"Resident {resident.id}: {str(e)}")
            
            await db.commit()
            
    except Exception as e:
        logger.exception("Pattern detection failed")
        results["errors"].append(f"Task-level error: {str(e)}")
    
    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    results["duration_seconds"] = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    logger.info(
        f"Pattern detection complete: {results['residents_analysed']} residents, "
        f"{results['patterns_found']} patterns found, {len(results['errors'])} errors"
    )
    
    return results
