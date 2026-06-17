from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Iterable

from EngineData.TranscriptEngine.transcript_session import TranscriptSession


@dataclass(slots=True)
class LanguageLLMSessionPersistenceResult:
    session_id: str
    applied_count: int
    skipped_count: int
    missing_segment_ids: list[str]
    changed_segment_ids: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class LanguageLLMSessionPersistenceBridge:
    """Apply language LLM session patches to a TranscriptSession before saving."""

    @staticmethod
    def apply_patches(session: TranscriptSession, patches: Iterable[dict[str, Any]]) -> LanguageLLMSessionPersistenceResult:
        segments_by_id = {segment.segment_id: segment for segment in session.segments}
        applied_count = 0
        skipped_count = 0
        missing_segment_ids: list[str] = []
        changed_segment_ids: list[str] = []

        for patch in patches:
            patch_session_id = str(patch.get("session_id", ""))
            segment_id = str(patch.get("segment_id", ""))
            if patch_session_id and patch_session_id != session.session_id:
                skipped_count += 1
                continue
            segment = segments_by_id.get(segment_id)
            if segment is None:
                skipped_count += 1
                if segment_id:
                    missing_segment_ids.append(segment_id)
                continue
            final_translation = str(patch.get("final_translation", segment.translated_text) or segment.translated_text)
            metadata = patch.get("metadata", {}) if isinstance(patch.get("metadata", {}), dict) else {}
            previous_translation = segment.translated_text
            if final_translation != previous_translation:
                segment.translated_text = final_translation
                changed_segment_ids.append(segment_id)
            segment.latency.language_llm_patch = {
                "patch_type": str(patch.get("patch_type", "language_llm_final_transcript")),
                "original_translation": metadata.get("original_translation", previous_translation),
                "final_translation": final_translation,
                "confidence": metadata.get("confidence", "low"),
                "glossary_notes": list(metadata.get("glossary_notes", [])) if isinstance(metadata.get("glossary_notes", []), list) else [],
                "tone_note": metadata.get("tone_note", ""),
                "audio_replay_allowed": False,
            }
            applied_count += 1

        return LanguageLLMSessionPersistenceResult(
            session_id=session.session_id,
            applied_count=applied_count,
            skipped_count=skipped_count,
            missing_segment_ids=missing_segment_ids,
            changed_segment_ids=changed_segment_ids,
        )
