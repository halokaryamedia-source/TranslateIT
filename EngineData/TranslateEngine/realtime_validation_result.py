from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from EngineData.TranslateEngine.realtime_readiness_audit import RealtimeReadinessAudit


@dataclass(slots=True)
class RealtimeValidationResult:
    status: str
    percent_ready: int
    real_device_tested: bool
    summary: str
    audit: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RealtimeValidationResultBuilder:
    @staticmethod
    def from_audit(audit: RealtimeReadinessAudit) -> RealtimeValidationResult:
        real_device_tested = False
        summary = "ready for device check" if audit.status == "READY_FOR_REAL_DEVICE_VALIDATION" else "runtime assets incomplete"
        return RealtimeValidationResult(
            status=audit.status,
            percent_ready=audit.percent_ready,
            real_device_tested=real_device_tested,
            summary=summary,
            audit=audit.to_dict(),
        )
