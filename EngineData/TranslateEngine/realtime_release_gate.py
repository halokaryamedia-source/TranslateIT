from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from EngineData.TranslateEngine.realtime_final_readiness_gate import RealtimeFinalReadinessGate
from EngineData.TranslateEngine.realtime_latency_sample_gate import RealtimeLatencySample, RealtimeLatencySampleGate


@dataclass(slots=True)
class RealtimeReleaseGateResult:
    ready: bool
    final_gate_ready: bool
    latency_gate_ready: bool
    blockers: list[str]
    payload: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RealtimeReleaseGate:
    def __init__(
        self,
        model_root: Path | str | None = None,
        *,
        target_pc_validated: bool = False,
        latency_samples: list[RealtimeLatencySample] | None = None,
    ) -> None:
        self.model_root = model_root
        self.target_pc_validated = target_pc_validated
        self.latency_samples = list(latency_samples or [])

    def evaluate(self) -> RealtimeReleaseGateResult:
        final_gate = RealtimeFinalReadinessGate(
            model_root=self.model_root,
            target_pc_validated=self.target_pc_validated,
        ).evaluate()
        latency_gate = RealtimeLatencySampleGate().evaluate(self.latency_samples)
        blockers = list(final_gate.blockers)
        if not latency_gate.passed:
            blockers.append("latency gate not passed")
        ready = bool(final_gate.ready and latency_gate.passed)
        return RealtimeReleaseGateResult(
            ready=ready,
            final_gate_ready=final_gate.ready,
            latency_gate_ready=latency_gate.passed,
            blockers=blockers,
            payload={
                "final_gate": final_gate.to_dict(),
                "latency_gate": latency_gate.to_dict(),
            },
        )
