from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.demo_data import CARE_NOTES
from app.services.ai.care_note_generator import generate_structured_note
from app.services.cqc_service import tag_quality_statement
from app.services.quality_gate import evaluate_note
from app.services.transcriber import transcribe_audio
from app.services.translation_service import translate_to_english


router = APIRouter(prefix="/care-notes", tags=["care notes"])


class GenerateNoteRequest(BaseModel):
    resident_id: str
    transcript: str
    note_type: str = "general"
    original_language: str | None = None
    original_transcript: str | None = None


class TranscribeNoteRequest(BaseModel):
    s3_key: str | None = None
    simulated_transcript: str | None = None
    detected_language: str | None = None


@router.get("")
async def list_care_notes() -> list[dict[str, object]]:
    return CARE_NOTES


@router.post("/generate")
async def generate_note(payload: GenerateNoteRequest) -> dict[str, object]:
    translated = await translate_to_english(payload.transcript, payload.original_language)
    note = generate_structured_note(translated.transcript, payload.note_type)
    note["original_language"] = translated.detected_language
    note["original_transcript"] = payload.original_transcript or translated.original_transcript
    note["translation_applied"] = translated.translation_applied
    note["translation_engine"] = translated.translation_engine
    gate = evaluate_note(note)
    tags = tag_quality_statement(payload.note_type, translated.transcript)
    return {
        "resident_id": payload.resident_id,
        "note": note,
        "quality_gate": gate.__dict__,
        "cqc_tags": tags,
        "transcript": translated.transcript,
        "original_language": translated.detected_language,
        "original_transcript": payload.original_transcript or translated.original_transcript,
        "translation_applied": translated.translation_applied,
        "translation_engine": translated.translation_engine,
    }


@router.post("/transcribe")
async def transcribe_note(payload: TranscribeNoteRequest | None = None) -> dict[str, object]:
    payload = payload or TranscribeNoteRequest()
    transcription = transcribe_audio(
        payload.s3_key,
        simulated_transcript=payload.simulated_transcript,
        detected_language=payload.detected_language,
    )
    translated = await translate_to_english(
        str(transcription["transcript"]),
        str(transcription["detected_language"]),
    )
    return {
        "transcript": translated.transcript,
        "original_transcript": translated.original_transcript,
        "original_language": translated.detected_language,
        "translation_applied": translated.translation_applied,
        "translation_engine": translated.translation_engine,
        "audio_deleted": transcription["audio_cleanup"],
        "engine": transcription["engine"],
        "vocabulary_hints": transcription["vocabulary_hints"],
    }
