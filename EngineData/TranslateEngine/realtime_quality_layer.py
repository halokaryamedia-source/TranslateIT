from __future__ import annotations

from dataclasses import dataclass, field
import re
from time import perf_counter
from typing import Iterable, Mapping


@dataclass(slots=True)
class QualityLayerConfig:
    """Latency-safe quality layer settings for realtime voice output."""

    max_fast_pass_ms: int = 80
    max_context_terms: int = 96
    allow_voice_replay: bool = False


@dataclass(slots=True)
class QualityLayerResult:
    text: str
    changed: bool
    latency_ms: int
    status: str
    notes: str = ""
    voice_replay_allowed: bool = False
    context_terms_added: tuple[str, ...] = ()


@dataclass(slots=True)
class ContextTerm:
    source: str
    target: str
    reason: str = ""


@dataclass(slots=True)
class RealtimeQualityLayer:
    """Non-blocking quality layer for realtime translation."""

    config: QualityLayerConfig = field(default_factory=QualityLayerConfig)
    _context_terms: dict[str, ContextTerm] = field(default_factory=dict)

    _default_terms: Mapping[str, str] = field(default_factory=lambda: {
        "deploy": "deploy",
        "deployment": "deployment",
        "build": "build",
        "branch": "branch",
        "commit": "commit",
        "merge": "merge",
        "pull request": "pull request",
        "repository": "repository",
        "runtime": "runtime",
        "engine": "engine",
        "latency": "latency",
        "realtime": "realtime",
        "translateit": "TranslateIT",
        "gemini": "Gemini",
        "tauri": "Tauri",
    })

    def pre_tts_fast_pass(self, *, source_text: str, translated_text: str, source_language: str, target_language: str) -> QualityLayerResult:
        started = perf_counter()
        output = str(translated_text or "").strip()
        if not output:
            return QualityLayerResult("", False, 0, "Skipped", "Empty translation.")
        target_language = str(target_language or "").lower()
        if target_language not in {"id", "ind", "indonesian", "en", "eng", "english"}:
            return QualityLayerResult(output, False, self._elapsed_ms(started), "Skipped", "Unsupported target language.")
        terms = dict(self._default_terms)
        terms.update({key: term.target for key, term in self._context_terms.items()})
        changed = False
        for source_term, target_term in sorted(terms.items(), key=lambda item: len(item[0]), reverse=True):
            if self._elapsed_ms(started) > self.config.max_fast_pass_ms:
                return QualityLayerResult(output, changed, self._elapsed_ms(started), "BudgetExceeded", "Fast quality pass stopped to protect voice latency.", voice_replay_allowed=False)
            new_output = self._preserve_term_if_source_contains(source_text=source_text, translated_text=output, source_term=source_term, target_term=target_term)
            if new_output != output:
                output = new_output
                changed = True
        return QualityLayerResult(output, changed, self._elapsed_ms(started), "Completed", "Fast deterministic quality pass applied before TTS." if changed else "No fast correction needed.", voice_replay_allowed=False)

    def accept_post_output_observation(self, *, source_text: str, translated_text: str, reviewer_terms: Iterable[ContextTerm] = ()) -> QualityLayerResult:
        started = perf_counter()
        added: list[str] = []
        for term in reviewer_terms:
            source = self._normalize_key(term.source)
            target = str(term.target or "").strip()
            if not source or not target:
                continue
            self._context_terms[source] = ContextTerm(source=source, target=target, reason=term.reason)
            added.append(source)
        while len(self._context_terms) > self.config.max_context_terms:
            first_key = next(iter(self._context_terms))
            self._context_terms.pop(first_key, None)
        return QualityLayerResult(str(translated_text or "").strip(), bool(added), self._elapsed_ms(started), "ContextUpdated" if added else "Observed", "Post-output review updated future context only; voice replay remains disabled.", voice_replay_allowed=False, context_terms_added=tuple(added))

    def build_llm_reviewer_contract(self) -> dict[str, object]:
        return {
            "role": "side_quality_reviewer",
            "hot_path_allowed": False,
            "voice_replay_allowed": False,
            "allowed_outputs": ["context_terms", "glossary_updates", "final_transcript_correction"],
            "blocked_outputs": ["second_voice_output", "audio_replay", "blocking_translation"],
            "latency_rule": "Do not block the realtime TTS path; apply only to future turns or final transcript.",
        }

    @staticmethod
    def _elapsed_ms(started: float) -> int:
        return int((perf_counter() - started) * 1000)

    @staticmethod
    def _normalize_key(text: str) -> str:
        return re.sub(r"\s+", " ", str(text or "").strip().lower())

    @classmethod
    def _preserve_term_if_source_contains(cls, *, source_text: str, translated_text: str, source_term: str, target_term: str) -> str:
        source_key = cls._normalize_key(source_text)
        term_key = cls._normalize_key(source_term)
        if not term_key or term_key not in source_key:
            return translated_text
        if re.search(rf"\b{re.escape(target_term)}\b", translated_text, flags=re.IGNORECASE):
            return translated_text
        replacement_pairs = {
            "menyebarkan": "deploy",
            "penerapan": "deployment",
            "bangunan": "build",
            "cabang": "branch",
            "mesin": "engine",
            "waktu tunggu": "latency",
            "secara langsung": "realtime",
        }
        output = translated_text
        for wrong, correct in replacement_pairs.items():
            if correct.lower() == target_term.lower():
                output = re.sub(rf"\b{re.escape(wrong)}\b", correct, output, flags=re.IGNORECASE)
        return output
