import asyncio

from app.routers.care_notes import GenerateNoteRequest, TranscribeNoteRequest, generate_note, transcribe_note
from app.services.translation_service import infer_language_from_text, translate_to_english
from app.services.transcriber import transcribe_audio


def test_transcriber_returns_detected_language_metadata():
    result = transcribe_audio(
        simulated_transcript="Resident mowi dobrze po posilku.",
        detected_language="pl",
    )

    assert result["detected_language"] == "pl"
    assert result["audio_cleanup"]["deleted"] is True
    assert "continence" in result["vocabulary_hints"]


def test_language_inference_handles_non_english_demo_text():
    assert infer_language_from_text("Bonjour, le resident mange bien.") == "fr"


def test_translation_fallback_preserves_original_without_deepl_key(monkeypatch):
    async def run():
        monkeypatch.setattr("app.services.translation_service._deepl_translate", None)
        return await translate_to_english("Bonjour, le resident mange bien.", "fr")

    result = asyncio.run(run())

    assert result.detected_language == "fr"
    assert result.transcript == "Bonjour, le resident mange bien."
    assert result.original_transcript == "Bonjour, le resident mange bien."
    assert result.translation_engine in {"local-no-translation-key", "not-required"}


def test_transcribe_endpoint_returns_multilingual_fields():
    response = asyncio.run(
        transcribe_note(
            TranscribeNoteRequest(
                simulated_transcript="Bonjour, le resident mange bien.",
                detected_language="fr",
            )
        )
    )

    assert response["original_language"] == "fr"
    assert response["original_transcript"] == "Bonjour, le resident mange bien."
    assert "translation_engine" in response


def test_generate_note_carries_translation_metadata():
    response = asyncio.run(
        generate_note(
            GenerateNoteRequest(
                resident_id="res-001",
                transcript="Bonjour, le resident mange bien.",
                note_type="nutrition",
                original_language="fr",
            )
        )
    )

    assert response["original_language"] == "fr"
    assert response["note"]["original_language"] == "fr"
    assert response["note"]["original_transcript"] == "Bonjour, le resident mange bien."
