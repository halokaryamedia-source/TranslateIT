from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from EngineData.TranslateEngine.language_llm_manifest import language_llm_manifest


@dataclass(slots=True)
class LanguageLLMConfig:
    primary_model: str = "Qwen3-4B-Instruct"
    fallback_model: str = "Qwen3-1.7B-Instruct"
    quantization: str = "Q4"
    usage: str = "english_indonesian_language_quality"
    hot_path_allowed: bool = False
    model_root: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class LanguageLLMRuntimePlan:
    enabled: bool
    primary_model: str
    fallback_model: str
    hot_path_allowed: bool
    manifest: list[dict[str, Any]]
    model_root: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class LanguageLLMConfigBuilder:
    @staticmethod
    def default(model_root: Path | str | None = None) -> LanguageLLMRuntimePlan:
        config = LanguageLLMConfig(model_root=str(model_root or ""))
        return LanguageLLMRuntimePlan(
            enabled=True,
            primary_model=config.primary_model,
            fallback_model=config.fallback_model,
            hot_path_allowed=config.hot_path_allowed,
            manifest=language_llm_manifest(),
            model_root=config.model_root,
        )
