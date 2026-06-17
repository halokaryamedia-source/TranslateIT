from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class LanguageLLMModel:
    key: str
    model_name: str
    quantization: str
    role: str
    hot_path_allowed: bool
    notes: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


LANGUAGE_LLM_MODELS: tuple[LanguageLLMModel, ...] = (
    LanguageLLMModel(
        key="primary_language_llm",
        model_name="Qwen3-4B-Instruct",
        quantization="Q4",
        role="english_indonesian_quality_layer",
        hot_path_allowed=False,
        notes="Primary lightweight language model for correction, glossary, tone, and final transcript refinement.",
    ),
    LanguageLLMModel(
        key="fallback_language_llm",
        model_name="Qwen3-1.7B-Instruct",
        quantization="Q4",
        role="english_indonesian_fast_fallback",
        hot_path_allowed=False,
        notes="Fallback model for lighter language-quality tasks when the primary model is unavailable or too slow.",
    ),
)


def language_llm_manifest() -> list[dict[str, Any]]:
    return [item.to_dict() for item in LANGUAGE_LLM_MODELS]
