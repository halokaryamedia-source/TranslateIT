from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from EngineData.TranslateEngine.language_llm_quality_result import LanguageLLMQualityResult, LanguageLLMQualityResultParser


@dataclass(slots=True)
class LanguageLLMFinalTranscriptUpdate:
    original_translation: str
    final_translation: str
    changed: bool
    confidence: str
    glossary_notes: list[str]
    tone_note: str
    audio_replay_allowed: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class LanguageLLMFinalTranscriptAdapter:
    @staticmethod
    def build_update(original_translation: str, llm_payload: dict[str, Any] | None) -> LanguageLLMFinalTranscriptUpdate:
        result: LanguageLLMQualityResult = LanguageLLMQualityResultParser.parse(llm_payload)
        final_translation = result.corrected_translation or original_translation
        return LanguageLLMFinalTranscriptUpdate(
            original_translation=original_translation,
            final_translation=final_translation,
            changed=final_translation != original_translation,
            confidence=result.confidence,
            glossary_notes=list(result.glossary_notes),
            tone_note=result.tone_note,
            audio_replay_allowed=False,
        )
