"""
Shift notes router — voice-to-CQC-note pipeline.

Staff record a voice note; the audio is transcribed and structured into a
CQC-compliant shift note via the care-note generator. In local development
the transcription is simulated (no Whisper / S3 required).
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.care_note_generator import generate_structured_note
from app.services.cqc_service import tag_quality_statement
from app.services.quality_gate import evaluate_note
from app.services.transcriber import transcribe_audio
from app.services.translation_service import translate_to_english

router = APIRouter(prefix="/shift-notes", tags=["shift notes"])

# In-memory store (reset on backend restart — replace with DB for production)
_SHIFT_NOTES: list[dict[str, object]] = []


class ShiftNoteCreate(BaseModel):
    care_home_id: str = "home-oakfield"
    recorded_by: str
    recorded_role: str = "Carer"
    shift_date: str | None = None  # ISO date YYYY-MM-DD; defaults to today
    # Either provide a pre-transcribed text from the client (Web Speech API)
    # or a simulated transcript for dev/demo.
    transcript: str
    note_type: str = "shift"  # general shift observation
    original_language: str | None = None


class ShiftNoteVoice(BaseModel):
    """Payload when sending raw simulated or uploaded audio key."""
    care_home_id: str = "home-oakfield"
    recorded_by: str
    recorded_role: str = "Carer"
    shift_date: str | None = None
    # s3_key is used in production; simulated_transcript in dev.
    s3_key: str | None = None
    simulated_transcript: str | None = None
    detected_language: str | None = None
    note_type: str = "shift"


@router.get("")
async def list_shift_notes(
    care_home_id: str = "home-oakfield",
) -> list[dict[str, object]]:
    """Return shift notes for the given care home, newest first."""
    filtered = [note for note in _SHIFT_NOTES if note.get("care_home_id") == care_home_id]
    return sorted(filtered, key=lambda note: str(note.get("created_at", "")), reverse=True)


@router.post("", status_code=201)
async def create_shift_note(payload: ShiftNoteCreate) -> dict[str, object]:
    """
    Accept a transcribed text (from client-side Web Speech API or typed),
    run it through the CQC structuring pipeline, and persist.
    """
    translated = await translate_to_english(payload.transcript, payload.original_language)
    note = await generate_structured_note(translated.transcript, payload.note_type)
    gate = evaluate_note(note)
    tags = tag_quality_statement(payload.note_type, translated.transcript)

    record: dict[str, object] = {
        "id": f"sn-{uuid4().hex[:8]}",
        "care_home_id": payload.care_home_id,
        "recorded_by": payload.recorded_by,
        "recorded_role": payload.recorded_role,
        "shift_date": payload.shift_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "note_type": payload.note_type,
        "transcript": translated.transcript,
        "original_language": translated.detected_language,
        "translation_applied": translated.translation_applied,
        "structured_note": note,
        "quality_gate": gate.__dict__,
        "cqc_tags": tags,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "text",
    }
    _SHIFT_NOTES.append(record)
    return record


@router.post("/from-voice", status_code=201)
async def create_shift_note_from_voice(payload: ShiftNoteVoice) -> dict[str, object]:
    """
    Transcribe audio (S3 key in production, simulated transcript in dev),
    then run through the CQC structuring pipeline.
    """
    transcription = transcribe_audio(
        payload.s3_key,
        simulated_transcript=payload.simulated_transcript,
        detected_language=payload.detected_language,
    )
    translated = await translate_to_english(
        str(transcription["transcript"]),
        str(transcription["detected_language"]),
    )
    note = await generate_structured_note(translated.transcript, payload.note_type)
    gate = evaluate_note(note)
    tags = tag_quality_statement(payload.note_type, translated.transcript)

    record: dict[str, object] = {
        "id": f"sn-{uuid4().hex[:8]}",
        "care_home_id": payload.care_home_id,
        "recorded_by": payload.recorded_by,
        "recorded_role": payload.recorded_role,
        "shift_date": payload.shift_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "note_type": payload.note_type,
        "transcript": translated.transcript,
        "original_language": translated.detected_language,
        "translation_applied": translated.translation_applied,
        "structured_note": note,
        "quality_gate": gate.__dict__,
        "cqc_tags": tags,
        "audio_deleted": transcription.get("audio_cleanup", {}).get("deleted", True),
        "engine": transcription.get("engine", "local"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "voice",
    }
    _SHIFT_NOTES.append(record)
    return record
