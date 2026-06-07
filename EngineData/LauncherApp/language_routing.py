from __future__ import annotations

from typing import Iterable
import string


SUPPORTED_FOCUS_LANGUAGES = ("id", "en")
_INDONESIAN_CUES = {
    "halo",
    "coba",
    "berbicara",
    "bicara",
    "lagi",
    "oke",
    "ok",
    "iya",
    "ya",
    "tidak",
    "nggak",
    "enggak",
    "tolong",
    "silakan",
    "maaf",
    "terima",
    "kasih",
    "bentar",
    "sebentar",
    "sudah",
    "udah",
    "saya",
    "kamu",
    "kami",
    "kita",
    "apa",
    "kenapa",
    "lalu",
    "sama",
}
_ENGLISH_CUES = {
    "hello",
    "please",
    "sorry",
    "again",
    "talk",
    "speak",
    "speaking",
    "try",
    "go",
    "yes",
    "no",
    "thanks",
    "thank",
    "you",
    "i",
    "we",
    "what",
    "why",
    "the",
    "and",
    "to",
    "for",
    "of",
    "is",
    "are",
}

_SHORT_ID_SOURCE_NORMALIZATION = {
    "check": "cek",
    "the": "",
    "hello": "halo",
    "hi": "hai",
    "please": "tolong",
    "try": "coba",
    "speak": "bicara",
    "speaking": "bicara",
    "word": "kata",
    "again": "lagi",
    "yes": "ya",
    "no": "tidak",
    "thanks": "terima kasih",
    "thank": "terima kasih",
}


def normalize_language_code(language: str | None) -> str:
    value = str(language or "").strip().lower()
    if not value:
        return ""
    if value.startswith("ind"):
        return "id"
    if value.startswith("eng"):
        return "en"
    if value.startswith("id"):
        return "id"
    if value.startswith("en"):
        return "en"
    if "-" in value:
        value = value.split("-", 1)[0]
    if "_" in value:
        value = value.split("_", 1)[0]
    return value[:2]


def allowed_focus_languages(extra_languages: Iterable[str] | None = None) -> tuple[str, ...]:
    extras = tuple(normalize_language_code(language) for language in (extra_languages or ()))
    ordered = list(SUPPORTED_FOCUS_LANGUAGES)
    for language in extras:
        if language and language not in ordered:
            ordered.append(language)
    return tuple(ordered)


def is_focus_language(language: str | None, *, allowed_languages: Iterable[str] | None = None) -> bool:
    normalized = normalize_language_code(language)
    if not normalized:
        return False
    allowed = allowed_focus_languages(allowed_languages)
    return normalized in allowed


def should_translate_segment(*, detected_language: str | None, source_language: str, target_language: str) -> bool:
    normalized_source = normalize_language_code(source_language)
    normalized_target = normalize_language_code(target_language)
    normalized_detected = normalize_language_code(detected_language)
    if not normalized_target or normalized_source == normalized_target:
        return False
    if normalized_detected == normalized_target:
        return False
    return True


def _tokenize_language_hint(text: str | None) -> tuple[str, ...]:
    normalized_chars = []
    for char in str(text or "").strip().lower():
        if char.isalnum() or char.isspace():
            normalized_chars.append(char)
        elif char in string.punctuation:
            normalized_chars.append(" ")
        else:
            normalized_chars.append(" ")
    tokens = [token for token in "".join(normalized_chars).split() if token]
    return tuple(tokens)


def infer_language_bias_from_text(
    text: str | None,
    *,
    detected_language: str | None = "",
    source_language: str = "",
    target_language: str = "",
    language_probability: float = 0.0,
) -> str:
    normalized_source = normalize_language_code(source_language)
    normalized_target = normalize_language_code(target_language)
    fallback_language = normalize_language_code(detected_language)
    if not fallback_language:
        fallback_language = normalized_source
    tokens = _tokenize_language_hint(text)
    if not tokens:
        return fallback_language
    if normalized_source == normalized_target:
        return fallback_language
    token_count = len(tokens)
    ind_score = sum(1 for token in tokens if token in _INDONESIAN_CUES)
    en_score = sum(1 for token in tokens if token in _ENGLISH_CUES)
    has_indonesian_affix = any(
        token.endswith(("lah", "kah", "ku", "mu", "nya", "kan", "i")) and len(token) > 3 for token in tokens
    )
    has_english_phrase = any(token in {"i'm", "you're", "we're", "don't", "let's"} for token in tokens)
    english_majority = en_score > ind_score and token_count <= 5

    if normalized_source == "id" and normalized_target == "en":
        if (ind_score > 0 or has_indonesian_affix) and not has_english_phrase:
            if token_count <= 8 or float(language_probability or 0.0) <= 0.85 or ind_score > en_score:
                return "id"
        if token_count <= 3 and ind_score > en_score:
            return "id"
        if english_majority:
            return "en"
    if normalized_source == "en" and normalized_target == "id":
        if (en_score > 0 or has_english_phrase) and (token_count <= 8 or float(language_probability or 0.0) <= 0.85):
            return "en"

    return fallback_language


def normalize_short_id_focus_source_text(text: str | None, *, source_language: str = "", target_language: str = "") -> str:
    normalized_source = normalize_language_code(source_language)
    normalized_target = normalize_language_code(target_language)
    if normalized_source != "id" or normalized_target == "id":
        return str(text or "").strip()
    tokens = _tokenize_language_hint(text)
    if not tokens or len(tokens) > 6:
        return str(text or "").strip()
    ind_score = sum(1 for token in tokens if token in _INDONESIAN_CUES)
    en_score = sum(1 for token in tokens if token in _ENGLISH_CUES)
    if ind_score <= 0 and not any(token in _SHORT_ID_SOURCE_NORMALIZATION for token in tokens):
        return str(text or "").strip()
    if ind_score < en_score and not any(token in _SHORT_ID_SOURCE_NORMALIZATION for token in tokens):
        return str(text or "").strip()
    normalized_tokens: list[str] = []
    replaced = False
    for token in tokens:
        replacement = _SHORT_ID_SOURCE_NORMALIZATION.get(token, token)
        if replacement != token:
            replaced = True
        normalized_tokens.extend(replacement.split())
    return " ".join(normalized_tokens) if replaced else str(text or "").strip()
