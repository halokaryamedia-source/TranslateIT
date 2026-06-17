from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from EngineData.TranslateEngine.realtime_turn_planner import RealtimeTurnPlan


@dataclass(slots=True)
class RealtimeStatusCard:
    title: str
    status: str
    latency_label: str
    model_label: str
    fallback_label: str
    voice_policy_label: str
    detail: str
    raw: dict[str, Any]


class RealtimeStatusPresenter:
    """Convert engine diagnostics into UI-safe status text."""

    @staticmethod
    def from_turn_plan(plan: RealtimeTurnPlan) -> RealtimeStatusCard:
        diagnostics = plan.diagnostics
        status = "Ready" if plan.ready_for_tts else "Not Ready"
        if diagnostics.latency_status != "PASS":
            status = "Needs Optimization"
        if plan.translation.status != "Completed":
            status = plan.translation.status
        if plan.tts_plan.status not in {"Ready", "Skipped"}:
            status = f"TTS {plan.tts_plan.status}"
        fallback_label = "Fallback active" if diagnostics.fallback_active else "Primary path"
        voice_policy = "Single voice pass" if plan.safe_single_voice_pass else "Voice replay blocked"
        return RealtimeStatusCard(
            title="Realtime Translate Engine",
            status=status,
            latency_label=f"{diagnostics.total_latency_ms}ms / target {diagnostics.target_latency_ms}ms",
            model_label=diagnostics.active_model_summary,
            fallback_label=fallback_label,
            voice_policy_label=voice_policy,
            detail=diagnostics.notes or plan.tts_plan.error or plan.translation.notes,
            raw={
                "diagnostics": asdict(diagnostics),
                "translation_status": plan.translation.status,
                "translation_engine": plan.translation.engine_name,
                "tts_status": plan.tts_plan.status,
                "tts_engine": plan.tts_plan.engine_name,
                "ready_for_tts": plan.ready_for_tts,
                "safe_single_voice_pass": plan.safe_single_voice_pass,
            },
        )
