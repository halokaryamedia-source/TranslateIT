from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from EngineData.TranslateEngine.language_llm_manifest import LANGUAGE_LLM_MODELS, language_llm_manifest


@dataclass(slots=True)
class LanguageLLMCheck:
    key: str
    model_name: str
    path: str
    ready: bool
    message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class LanguageLLMReadiness:
    ready: bool
    checks: list[LanguageLLMCheck]
    manifest: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "ready": self.ready,
            "checks": [item.to_dict() for item in self.checks],
            "manifest": self.manifest,
        }


class LanguageLLMReadinessChecker:
    def __init__(self, model_root: Path | str | None = None) -> None:
        self.model_root = Path(model_root) if model_root is not None else None

    def check(self) -> LanguageLLMReadiness:
        checks = [self._check_model(item.key, item.model_name) for item in LANGUAGE_LLM_MODELS]
        return LanguageLLMReadiness(
            ready=any(item.ready for item in checks),
            checks=checks,
            manifest=language_llm_manifest(),
        )

    def _check_model(self, key: str, model_name: str) -> LanguageLLMCheck:
        if self.model_root is None:
            return LanguageLLMCheck(key, model_name, "", False, "model root not configured")
        model_dir = self.model_root / "language-llm" / model_name
        has_model = model_dir.exists() and any(model_dir.glob("*.gguf"))
        return LanguageLLMCheck(
            key=key,
            model_name=model_name,
            path=str(model_dir),
            ready=has_model,
            message="ready" if has_model else "gguf model missing",
        )
