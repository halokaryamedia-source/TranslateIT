from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from EngineData.TranslateEngine.language_llm_quality_contract import LanguageLLMQualityContract


@dataclass(slots=True)
class LanguageLLMPromptPayload:
    system_instruction: str
    user_payload: dict[str, Any]
    output_schema: dict[str, str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class LanguageLLMPromptPayloadBuilder:
    @staticmethod
    def build(contract: LanguageLLMQualityContract) -> LanguageLLMPromptPayload:
        request = contract.request
        return LanguageLLMPromptPayload(
            system_instruction=(
                "You are the English-Indonesian language quality layer for TranslateIT. "
                "Improve terminology, tone, and final transcript quality. "
                "Do not claim runtime readiness. Do not make realtime audio decisions."
            ),
            user_payload={
                "source_language": request.source_language,
                "target_language": request.target_language,
                "source_text": request.source_text,
                "translated_text": request.translated_text,
                "task": request.task,
                "domain": request.domain,
                "hot_path_allowed": contract.hot_path_allowed,
            },
            output_schema={
                "corrected_translation": "string",
                "glossary_notes": "array",
                "tone_note": "string",
                "confidence": "low|medium|high",
            },
        )
