from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from EngineData.TranslateEngine.piper_tts_backend import PiperTTSBackend, TTSPlan


@dataclass(slots=True)
class PiperRuntimeContractResult:
    status: str
    ready: bool
    engine_name: str
    voice_model_path: str
    message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class PiperRuntimeContract:
    """Stable contract between Piper readiness checks and app runtime."""

    def __init__(self, backend: PiperTTSBackend) -> None:
        self.backend = backend

    def plan(self, *, text: str, language: str = "en") -> PiperRuntimeContractResult:
        tts_plan: TTSPlan = self.backend.plan_synthesis(text=text, language=language)
        return PiperRuntimeContractResult(
            status=tts_plan.status,
            ready=tts_plan.ready,
            engine_name=tts_plan.engine_name,
            voice_model_path=tts_plan.voice_model_path,
            message=tts_plan.error or tts_plan.status,
        )
