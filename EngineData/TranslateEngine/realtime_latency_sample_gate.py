from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(slots=True)
class RealtimeLatencySample:
    total_ms: int
    stt_ms: int = 0
    mt_ms: int = 0
    tts_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class RealtimeLatencySampleGateResult:
    passed: bool
    sample_count: int
    target_ms: int
    p50_ms: int
    p95_ms: int
    worst_ms: int
    message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RealtimeLatencySampleGate:
    def __init__(self, *, target_ms: int = 1250, min_samples: int = 5) -> None:
        self.target_ms = target_ms
        self.min_samples = min_samples

    def evaluate(self, samples: list[RealtimeLatencySample]) -> RealtimeLatencySampleGateResult:
        values = sorted(max(0, int(item.total_ms)) for item in samples)
        if len(values) < self.min_samples:
            return RealtimeLatencySampleGateResult(False, len(values), self.target_ms, 0, 0, 0, "not enough samples")
        p50 = self._percentile(values, 0.50)
        p95 = self._percentile(values, 0.95)
        worst = values[-1]
        passed = p50 <= self.target_ms and p95 <= int(self.target_ms * 1.35)
        return RealtimeLatencySampleGateResult(
            passed=passed,
            sample_count=len(values),
            target_ms=self.target_ms,
            p50_ms=p50,
            p95_ms=p95,
            worst_ms=worst,
            message="pass" if passed else "latency target not met",
        )

    @staticmethod
    def _percentile(values: list[int], ratio: float) -> int:
        if not values:
            return 0
        index = min(len(values) - 1, max(0, int(round((len(values) - 1) * ratio))))
        return values[index]
