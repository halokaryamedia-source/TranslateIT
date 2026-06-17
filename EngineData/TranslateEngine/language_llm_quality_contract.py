from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


ALLOWED_LANGUAGE_LLM_TASKS: tuple[str, ...] = (
    "glossary_correction",
    "tone_preservation",
    "final_transcript_refinement",
    "domain_term_review",
    "bilingual_quality_note",
)

BLOCKED_LANGUAGE_LLM_TASKS: tuple[str, ...] = (
    "realtime_voice_blocking_translation",
    "hot_path_audio_decision",
    "unverified_model_claim",
)


@dataclass(slots=True)
class LanguageLLMQualityRequest:
    source_language: str
    target_language: str
    source_text: str
    translated_text: str
    task: str = "final_transcript_refinement"
    domain: str = "general"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class LanguageLLMQualityContract:
    hot_path_allowed: bool
    allowed_tasks: tuple[str, ...]
    blocked_tasks: tuple[str, ...]
    request: LanguageLLMQualityRequest

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["allowed_tasks"] = list(self.allowed_tasks)
        payload["blocked_tasks"] = list(self.blocked_tasks)
        return payload


class LanguageLLMQualityContractBuilder:
    @staticmethod
    def build(request: LanguageLLMQualityRequest) -> LanguageLLMQualityContract:
        if request.task not in ALLOWED_LANGUAGE_LLM_TASKS:
            request = LanguageLLMQualityRequest(
                source_language=request.source_language,
                target_language=request.target_language,
                source_text=request.source_text,
                translated_text=request.translated_text,
                task="bilingual_quality_note",
                domain=request.domain,
            )
        return LanguageLLMQualityContract(
            hot_path_allowed=False,
            allowed_tasks=ALLOWED_LANGUAGE_LLM_TASKS,
            blocked_tasks=BLOCKED_LANGUAGE_LLM_TASKS,
            request=request,
        )
