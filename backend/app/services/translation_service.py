from __future__ import annotations

from dataclasses import dataclass
import logging
import re
import unicodedata

import httpx

from app.config import get_settings


logger = logging.getLogger(__name__)

DEEPL_URL = "https://api-free.deepl.com/v2/translate"
ENGLISH_CODES = {"en", "en-gb", "en-us"}
LANGUAGE_MARKERS = {
    "pl": ("dzien", "dobrze", "opiek", "posilek", "bol", "mowi"),
    "ro": ("buna", "bine", "durere", "masa", "ingrij"),
    "fr": ("bonjour", "douleur", "mange", "soin", "bien"),
    "es": ("hola", "dolor", "comio", "cuidado"),
}


@dataclass(frozen=True)
class TranslationResult:
    transcript: str
    detected_language: str
    original_transcript: str | None
    translation_applied: bool
    translation_engine: str


def normalise_language(language: str | None) -> str:
    value = (language or "").strip().lower().replace("_", "-")
    return value.split("-")[0] if value and value not in ENGLISH_CODES else value


def infer_language_from_text(text: str) -> str:
    lower = unicodedata.normalize("NFKD", text.lower()).encode("ascii", "ignore").decode("ascii")
    for language, markers in LANGUAGE_MARKERS.items():
        if any(marker in lower for marker in markers):
            return language
    return "en"


async def translate_to_english(text: str, source_language: str | None = None) -> TranslationResult:
    detected_language = normalise_language(source_language) or infer_language_from_text(text)
    if detected_language in ENGLISH_CODES:
        return TranslationResult(
            transcript=text,
            detected_language="en",
            original_transcript=None,
            translation_applied=False,
            translation_engine="not-required",
        )

    settings = get_settings()
    if settings.deepl_api_key:
        try:
            translated = await _deepl_translate(
                api_key=settings.deepl_api_key,
                text=text,
                source_language=detected_language,
            )
            return TranslationResult(
                transcript=translated,
                detected_language=detected_language,
                original_transcript=text,
                translation_applied=True,
                translation_engine="deepl",
            )
        except Exception as exc:
            logger.warning("DeepL translation failed for language %s: %s", detected_language, exc)

    return TranslationResult(
        transcript=text,
        detected_language=detected_language or "unknown",
        original_transcript=text,
        translation_applied=False,
        translation_engine="local-no-translation-key",
    )


async def _deepl_translate(api_key: str, text: str, source_language: str) -> str:
    payload = {
        "auth_key": api_key,
        "text": text,
        "source_lang": source_language.upper(),
        "target_lang": "EN-GB",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(DEEPL_URL, data=payload)
        response.raise_for_status()
        data = response.json()
    return data["translations"][0]["text"]


def detect_language_from_whisper_response(whisper_result: dict[str, object]) -> str | None:
    language = whisper_result.get("language")
    return str(language) if language else None


def strip_translation_prefix(text: str) -> str:
    return re.sub(r"^\s*\[[a-z]{2}(?:-[a-z]{2})?\]\s*", "", text, flags=re.IGNORECASE)
