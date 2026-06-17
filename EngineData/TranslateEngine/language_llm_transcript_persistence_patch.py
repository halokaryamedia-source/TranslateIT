from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from EngineData.TranslateEngine.language_llm_final_transcript_adapter import LanguageLLMFinalTranscriptAdapter


@dataclass(slots=True)
class LanguageLLMTranscriptPersistencePatch:
    segment_id: str
    original_translation: str
    final_translation: str
    changed: bool
    confidence: str
    glossary_notes: list[str]
    tone_note: str
    audio_replay_allowed: bool
    patch_type: str = "language_llm_final_transcript"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class LanguageLLMTranscriptPersistencePatchBuilder:
    @staticmethod
    def build(segment_id: str, original_translation: str, llm_payload: dict[str, Any] | None) -> LanguageLLMTranscriptPersistencePatch:
        update = LanguageLLMFinalTranscriptAdapter.build_update(original_translation, llm_payload)
        return LanguageLLMTranscriptPersistencePatch(
            segment_id=segment_id,
            original_translation=update.original_translation,
            final_translation=update.final_translation,
            changed=update.changed,
            confidence=update.confidence,
            glossary_notes=list(update.glossary_notes),
            tone_note=update.tone_note,
            audio_replay_allowed=False,
        )
