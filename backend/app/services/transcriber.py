from app.services.s3_service import delete_object
from app.services.translation_service import infer_language_from_text, normalise_language, strip_translation_prefix


CARE_VOCABULARY = ["continence", "Waterlow", "PRN", "DoLS", "MCA", "safeguarding"]
DEFAULT_TRANSCRIPT = "Resident accepted care support and no immediate concern was identified."


def transcribe_audio(
    s3_key: str | None = None,
    simulated_transcript: str | None = None,
    detected_language: str | None = None,
) -> dict[str, object]:
    transcript = strip_translation_prefix(simulated_transcript or DEFAULT_TRANSCRIPT)
    language = normalise_language(detected_language) or infer_language_from_text(transcript)
    cleanup = delete_object(s3_key) if s3_key else {"key": None, "deleted": True}
    return {
        "transcript": transcript,
        "detected_language": language,
        "vocabulary_hints": CARE_VOCABULARY,
        "audio_cleanup": cleanup,
        "engine": "deterministic-local-whisper-fallback",
    }
