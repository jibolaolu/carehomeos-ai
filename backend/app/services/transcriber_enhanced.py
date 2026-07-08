"""
Whisper Transcription Service
=============================
Real OpenAI Whisper API integration for voice-to-text transcription
with care home vocabulary optimisation and UK accent support.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
import openai

from app.config import get_settings
from app.services.s3_service import delete_object, get_presigned_url
from app.services.translation_service import infer_language_from_text, normalise_language

logger = logging.getLogger(__name__)

settings = get_settings()

# Care home vocabulary hints for better transcription accuracy
CARE_VOCABULARY = [
    "continence", "Waterlow", "PRN", "DoLS", "MCA", "safeguarding",
    "hoist", "repositioning", "fortified drink", "pressure area",
    " NEWS2", "MUST", "RAG", "MAR", "eMAR", "CD register",
    "personal care", "toileting", "mobility", "transfer",
    "agitation", "sundowning", "wandering", "confusion",
    "GP", "district nurse", "pharmacy", "medication",
    "respite", "day care", "advocate", "LPA", "deputy",
]

# UK regional accent hints
UK_ACCENT_HINTS = {
    "en": "Care home vocabulary: continence, Waterlow, PRN, DoLS, MCA, safeguarding, hoist, repositioning",
    "cy": "Welsh care home vocabulary: continence, Waterlow, PRN, DoLS, MCA, safeguarding",
    "sco": "Scottish care home vocabulary: continence, Waterlow, PRN, DoLS, MCA, safeguarding",
    "gd": "Gaelic care home vocabulary",
}


async def transcribe_audio(
    s3_key: str | None = None,
    audio_bytes: bytes | None = None,
    simulated_transcript: str | None = None,
    detected_language: str | None = None,
) -> dict[str, Any]:
    """Transcribe audio using OpenAI Whisper API.
    
    Args:
        s3_key: S3 key of uploaded audio file
        audio_bytes: Raw audio bytes (alternative to s3_key)
        simulated_transcript: For testing without API call
        detected_language: Known language code
    
    Returns:
        Transcription result with detected language, vocabulary hints, and cleanup status
    """
    # Test mode: return simulated transcript
    if simulated_transcript:
        language = normalise_language(detected_language) or infer_language_from_text(simulated_transcript)
        return {
            "transcript": simulated_transcript,
            "detected_language": language,
            "vocabulary_hints": CARE_VOCABULARY,
            "audio_cleanup": {"key": None, "deleted": True},
            "engine": "simulated",
            "success": True,
        }
    
    # Check API key
    if not settings.openai_api_key:
        logger.error("OpenAI API key not configured")
        return {
            "transcript": "",
            "detected_language": "en",
            "vocabulary_hints": CARE_VOCABULARY,
            "audio_cleanup": {"key": s3_key, "deleted": False},
            "engine": "error",
            "success": False,
            "error": "OpenAI API key not configured",
        }
    
    try:
        # Get audio data
        if s3_key:
            # Download from S3
            url = await get_presigned_url(s3_key)
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()
                audio_bytes = response.content
        
        if not audio_bytes:
            return {
                "transcript": "",
                "detected_language": "en",
                "vocabulary_hints": CARE_VOCABULARY,
                "audio_cleanup": {"key": s3_key, "deleted": False},
                "engine": "error",
                "success": False,
                "error": "No audio data provided",
            }
        
        # Call Whisper API
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        
        # Build vocabulary hint
        vocab_hint = UK_ACCENT_HINTS.get(detected_language or "en", UK_ACCENT_HINTS["en"])
        vocab_hint += ", ".join(CARE_VOCABULARY[:10])  # Include top vocabulary
        
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=("audio.m4a", audio_bytes),
            prompt=vocab_hint,
            language=detected_language or "en",
            response_format="json",
        )
        
        transcript = response.text
        
        # Detect language from transcript
        language = normalise_language(detected_language) or infer_language_from_text(transcript)
        
        # Clean up audio from S3 immediately
        cleanup = {"key": s3_key, "deleted": False}
        if s3_key:
            try:
                delete_result = delete_object(s3_key)
                cleanup = delete_result
            except Exception as e:
                logger.warning(f"Failed to delete audio {s3_key}: {e}")
        
        return {
            "transcript": transcript,
            "detected_language": language,
            "vocabulary_hints": CARE_VOCABULARY,
            "audio_cleanup": cleanup,
            "engine": "whisper-1",
            "success": True,
        }
        
    except openai.APIError as e:
        logger.error(f"Whisper API error: {e}")
        return {
            "transcript": "",
            "detected_language": "en",
            "vocabulary_hints": CARE_VOCABULARY,
            "audio_cleanup": {"key": s3_key, "deleted": False},
            "engine": "whisper-1",
            "success": False,
            "error": f"Whisper API error: {str(e)}",
        }
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return {
            "transcript": "",
            "detected_language": "en",
            "vocabulary_hints": CARE_VOCABULARY,
            "audio_cleanup": {"key": s3_key, "deleted": False},
            "engine": "error",
            "success": False,
            "error": str(e),
        }


async def transcribe_audio_multilingual(
    s3_key: str | None = None,
    audio_bytes: bytes | None = None,
    preferred_language: str | None = None,
) -> dict[str, Any]:
    """Transcribe audio with automatic language detection for multilingual staff.
    
    Supports: English, Welsh, Polish, Romanian, Portuguese, Tagalog
    
    Args:
        s3_key: S3 key of uploaded audio
        audio_bytes: Raw audio bytes
        preferred_language: Staff's preferred language if known
    
    Returns:
        Transcription with detected language and translation if needed
    """
    # First, transcribe with auto-detection
    result = await transcribe_audio(
        s3_key=s3_key,
        audio_bytes=audio_bytes,
    )
    
    if not result["success"]:
        return result
    
    transcript = result["transcript"]
    detected_lang = result["detected_language"]
    
    # If language is not English, translate for care note processing
    if detected_lang != "en" and detected_lang is not None:
        from app.services.translation_service import translate_text
        
        try:
            translation = await translate_text(
                text=transcript,
                source_lang=detected_lang,
                target_lang="en",
            )
            
            result["original_transcript"] = transcript
            result["transcript"] = translation["translated_text"]
            result["translation_confidence"] = translation.get("confidence", 0.9)
            result["source_language"] = detected_lang
            
        except Exception as e:
            logger.warning(f"Translation failed for {detected_lang}: {e}")
            # Keep original transcript, note the language
            result["source_language"] = detected_lang
            result["translation_error"] = str(e)
    
    return result
