from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Mapping

from EngineData.TranslateEngine.realtime_latency_budget import RealtimeLatencyBudgetMonitor


@dataclass(slots=True)
class RealtimeEngineSnapshot:
    timestamp_iso: str
    pipeline_mode: str
    stt_status: str
    mt_status: str
    tts_status: str
    quality_status: str
    latency_status: str
    total_latency_ms: int
    target_latency_ms: int
    active_model_summary: str
    fallback_active: bool
    voice_replay_allowed: bool = False
    notes: str = ""


@dataclass(slots=True)
class RealtimeDiagnosticsAggregator:
    """Build visible realtime-engine status from subsystem metrics."""

    latency_monitor: RealtimeLatencyBudgetMonitor = field(default_factory=RealtimeLatencyBudgetMonitor)

    def build_snapshot(
        self,
        *,
        pipeline_mode: str,
        metrics: Mapping[str, int],
        stt_status: str = "Unknown",
        mt_status: str = "Unknown",
        tts_status: str = "Pending",
        quality_status: str = "Unknown",
        active_model_summary: str = "",
        fallback_active: bool = False,
        voice_replay_allowed: bool = False,
        notes: str = "",
    ) -> RealtimeEngineSnapshot:
        report = self.latency_monitor.evaluate(metrics)
        return RealtimeEngineSnapshot(
            timestamp_iso=datetime.now().astimezone().isoformat(timespec="milliseconds"),
            pipeline_mode=pipeline_mode,
            stt_status=stt_status,
            mt_status=mt_status,
            tts_status=tts_status,
            quality_status=quality_status,
            latency_status=report.status,
            total_latency_ms=report.actual_total_ms,
            target_latency_ms=report.target_total_ms,
            active_model_summary=active_model_summary,
            fallback_active=bool(fallback_active),
            voice_replay_allowed=bool(voice_replay_allowed),
            notes=notes,
        )

    @staticmethod
    def model_summary(*, stt_model: str = "", mt_engine: str = "", tts_engine: str = "") -> str:
        parts = []
        if stt_model:
            parts.append(f"STT={stt_model}")
        if mt_engine:
            parts.append(f"MT={mt_engine}")
        if tts_engine:
            parts.append(f"TTS={tts_engine}")
        return ", ".join(parts) if parts else "No active realtime model reported."
