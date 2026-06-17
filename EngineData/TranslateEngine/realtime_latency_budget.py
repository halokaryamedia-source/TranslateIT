from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass(slots=True)
class LatencyBudget:
    vad_ms: int = 10
    stt_partial_ms: int = 600
    mt_ms: int = 180
    quality_ms: int = 80
    tts_ms: int = 300
    output_buffer_ms: int = 80

    @property
    def target_total_ms(self) -> int:
        return self.vad_ms + self.stt_partial_ms + self.mt_ms + self.quality_ms + self.tts_ms + self.output_buffer_ms


@dataclass(slots=True)
class LatencyCheckpoint:
    name: str
    actual_ms: int
    budget_ms: int

    @property
    def passed(self) -> bool:
        return self.actual_ms <= self.budget_ms


@dataclass(slots=True)
class LatencyReport:
    target_total_ms: int
    actual_total_ms: int
    passed: bool
    checkpoints: tuple[LatencyCheckpoint, ...]
    status: str


class RealtimeLatencyBudgetMonitor:
    """Small latency budget helper for realtime TranslateIT pipeline.

    This does not perform audio processing. It provides a consistent way for
    STT, MT, quality layer, and TTS modules to report whether the current turn
    is still inside the realtime target.
    """

    def __init__(self, budget: LatencyBudget | None = None) -> None:
        self.budget = budget or LatencyBudget()

    def evaluate(self, metrics: Mapping[str, int]) -> LatencyReport:
        checkpoints = (
            LatencyCheckpoint("vad_ms", int(metrics.get("vad_ms", 0)), self.budget.vad_ms),
            LatencyCheckpoint("stt_partial_ms", int(metrics.get("stt_partial_ms", 0)), self.budget.stt_partial_ms),
            LatencyCheckpoint("mt_ms", int(metrics.get("mt_ms", 0)), self.budget.mt_ms),
            LatencyCheckpoint("quality_ms", int(metrics.get("quality_ms", 0)), self.budget.quality_ms),
            LatencyCheckpoint("tts_ms", int(metrics.get("tts_ms", 0)), self.budget.tts_ms),
            LatencyCheckpoint("output_buffer_ms", int(metrics.get("output_buffer_ms", 0)), self.budget.output_buffer_ms),
        )
        actual_total = sum(checkpoint.actual_ms for checkpoint in checkpoints)
        passed = actual_total <= self.budget.target_total_ms and all(checkpoint.passed for checkpoint in checkpoints)
        return LatencyReport(
            target_total_ms=self.budget.target_total_ms,
            actual_total_ms=actual_total,
            passed=passed,
            checkpoints=checkpoints,
            status="PASS" if passed else "NEEDS_OPTIMIZATION",
        )

    def empty_report(self) -> LatencyReport:
        return self.evaluate({})
