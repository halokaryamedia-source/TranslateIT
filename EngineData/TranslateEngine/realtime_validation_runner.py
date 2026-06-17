from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from EngineData.TranslateEngine.realtime_readiness_audit import RealtimeReadinessAuditor
from EngineData.TranslateEngine.realtime_validation_result import RealtimeValidationResultBuilder


@dataclass(slots=True)
class RealtimeValidationRunnerOutput:
    status: str
    percent_ready: int
    payload: dict[str, Any]


class RealtimeValidationRunner:
    """Run readiness validation without starting the desktop app."""

    def __init__(self, model_root: Path | None = None) -> None:
        self.auditor = RealtimeReadinessAuditor(model_root=model_root)

    def run(self, *, source_language: str = "id", target_language: str = "en") -> RealtimeValidationRunnerOutput:
        audit = self.auditor.audit(source_language=source_language, target_language=target_language)
        result = RealtimeValidationResultBuilder.from_audit(audit)
        return RealtimeValidationRunnerOutput(
            status=result.status,
            percent_ready=result.percent_ready,
            payload=result.to_dict(),
        )
