from __future__ import annotations

import re
from typing import Any, Callable

MIN_GENERATION_TOKENS = 32
MAX_GENERATION_TOKENS = 512
OUTPUT_TOKEN_MULTIPLIER = 2
OUTPUT_TOKEN_MARGIN = 16
MAX_STANDALONE_TRANSLATION_CHUNKS = 32


class TranslationEnvelopeError(ValueError):
    pass


def clean_source_text(value: Any) -> str:
    return (
        str(value or "")
        .replace("\x00", "")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .strip()
    )


def compact_unit(value: Any) -> str:
    return " ".join(str(value or "").replace("\x00", "").split()).strip()


def finite_positive_token_limit(value: Any, unreasonable_limit: int) -> int | None:
    try:
        parsed = int(value)
    except Exception:
        return None
    if parsed <= 0 or parsed >= unreasonable_limit:
        return None
    return parsed


def input_token_limit(tokenizer: Any, model: Any, unreasonable_limit: int) -> int | None:
    candidates: list[int] = []
    tokenizer_limit = finite_positive_token_limit(
        getattr(tokenizer, "model_max_length", None), unreasonable_limit
    )
    if tokenizer_limit is not None:
        candidates.append(tokenizer_limit)
    config = getattr(model, "config", None)
    model_limit = finite_positive_token_limit(
        getattr(config, "max_position_embeddings", None), unreasonable_limit
    )
    if model_limit is not None:
        candidates.append(model_limit)
    return min(candidates) if candidates else None


def token_count(tokenizer: Any, text: str) -> int | None:
    try:
        encoded = tokenizer(text, add_special_tokens=True, truncation=False)
        ids = encoded.get("input_ids")
        if hasattr(ids, "tolist"):
            ids = ids.tolist()
        if isinstance(ids, (list, tuple)):
            if ids and isinstance(ids[0], (list, tuple)):
                return len(ids[0])
            return len(ids)
    except Exception:
        return None
    return None


def generation_cap(
    tokenizer: Any,
    model: Any,
    max_input_tokens: int,
    unreasonable_limit: int,
) -> int:
    candidates = [MAX_GENERATION_TOKENS, max_input_tokens]
    config = getattr(model, "config", None)
    model_limit = finite_positive_token_limit(
        getattr(config, "max_position_embeddings", None), unreasonable_limit
    )
    if model_limit is not None:
        candidates.append(model_limit)
    tokenizer_limit = finite_positive_token_limit(
        getattr(tokenizer, "model_max_length", None), unreasonable_limit
    )
    if tokenizer_limit is not None:
        candidates.append(tokenizer_limit)
    return max(1, min(candidates))


def adaptive_generation_budget(
    requested_floor: Any,
    input_tokens: int,
    tokenizer: Any,
    model: Any,
    max_input_tokens: int,
    unreasonable_limit: int,
) -> int:
    cap = generation_cap(
        tokenizer, model, max_input_tokens, unreasonable_limit
    )
    try:
        floor = int(requested_floor)
    except Exception:
        floor = MIN_GENERATION_TOKENS
    floor = max(1, min(cap, max(MIN_GENERATION_TOKENS, floor)))
    estimated = input_tokens * OUTPUT_TOKEN_MULTIPLIER + OUTPUT_TOKEN_MARGIN
    return min(cap, max(floor, estimated))


def _fits(tokenizer: Any, text: str, max_input_tokens: int) -> bool:
    count = token_count(tokenizer, text)
    if count is None:
        raise TranslationEnvelopeError("translation:input_token_count_unavailable")
    return count <= max_input_tokens


def _pack_parts(
    parts: list[str], tokenizer: Any, max_input_tokens: int
) -> list[str]:
    chunks: list[str] = []
    current = ""
    for raw_part in parts:
        part = compact_unit(raw_part)
        if not part:
            continue
        candidate = part if not current else f"{current} {part}"
        if _fits(tokenizer, candidate, max_input_tokens):
            current = candidate
            continue
        if current:
            chunks.append(current)
            current = ""
        if _fits(tokenizer, part, max_input_tokens):
            current = part
            continue

        word_current = ""
        for word in part.split():
            candidate = word if not word_current else f"{word_current} {word}"
            if _fits(tokenizer, candidate, max_input_tokens):
                word_current = candidate
                continue
            if word_current:
                chunks.append(word_current)
                word_current = ""
            if not _fits(tokenizer, word, max_input_tokens):
                raise TranslationEnvelopeError("translation:input_too_long_for_model")
            word_current = word
        if word_current:
            current = word_current

    if current:
        chunks.append(current)
    return chunks


def split_paragraph(
    paragraph: str, tokenizer: Any, max_input_tokens: int
) -> list[str]:
    paragraph = compact_unit(paragraph)
    if not paragraph:
        return []
    if _fits(tokenizer, paragraph, max_input_tokens):
        return [paragraph]
    sentences = [
        part
        for part in re.split(r"(?<=[.!?])\s+", paragraph)
        if compact_unit(part)
    ]
    return _pack_parts(sentences, tokenizer, max_input_tokens)


def standalone_plan(
    source: str, tokenizer: Any, max_input_tokens: int
) -> list[list[str]]:
    paragraphs = [
        compact_unit(part)
        for part in re.split(r"\n[ \t]*\n+", clean_source_text(source))
        if compact_unit(part)
    ]
    if not paragraphs:
        return []

    plan: list[list[str]] = []
    chunk_count = 0
    for paragraph in paragraphs:
        chunks = split_paragraph(paragraph, tokenizer, max_input_tokens)
        if not chunks:
            raise TranslationEnvelopeError("translation:standalone_chunk_plan_empty")
        chunk_count += len(chunks)
        if chunk_count > MAX_STANDALONE_TRANSLATION_CHUNKS:
            raise TranslationEnvelopeError("translation:chunk_count_limit_exceeded")
        plan.append(chunks)
    return plan


def reassemble(paragraph_outputs: list[list[str]]) -> str:
    return "\n\n".join(
        " ".join(compact_unit(chunk) for chunk in paragraph if compact_unit(chunk))
        for paragraph in paragraph_outputs
    ).strip()
