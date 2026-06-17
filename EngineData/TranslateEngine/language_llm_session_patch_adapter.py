from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from EngineData.TranslateEngine.language_llm_transcript_persistence_patch import (
    LanguageLLMTranscriptPersistencePatch,
)


@dataclass(slots=True)
class LanguageLLMSessionPatch:
    session_id: str
    segment_id: str
    patch_type: str
    final_translation: str
    changed: bool
    metadata: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class LanguageLLMSessionPatchAdapter:
    @staticmethod
    def from_transcript_patch(
        *,
        session_id: str,
        transcript_patch: LanguageLLMTranscriptPersistencePatch,
    ) -> LanguageLLMSessionPatch:
        return LanguageLLMSessionPatch(
            session_id=session_id,
            segment_id=transcript_patch.segment_id,
            patch_type=transcript_patch.patch_type,
            final_translation=transcript_patch.final_translation,
            changed=transcript_patch.changed,
            metadata={
                "original_translation": transcript_patch.original_translation,
                "confidence": transcript_patch.confidence,
                "glossary_notes": list(transcript_patch.glossary_notes),
                "tone_note": transcript_patch.tone_note,
                "audio_replay_allowed": False,
            },
        )
