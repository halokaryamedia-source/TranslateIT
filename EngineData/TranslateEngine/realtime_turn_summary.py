from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from EngineData.TranslateEngine.realtime_turn_planner import RealtimeTurnPlan


@dataclass(slots=True)
class RealtimeTurnSummary:
    segment_id: str
    source_text: str
    translated_text: str
    translation_status: str
    translation_engine: str
    tts_status: str
    tts_engine: str
    fallback_active: bool
    ready_for_next_stage: bool
    latency_label: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RealtimeTurnSummaryBuilder:
    @staticmethod
    def from_turn_plan(plan: RealtimeTurnPlan) -> RealtimeTurnSummary:
        total_latency = int(plan.diagnostics.total_latency_ms or 0)
        target_latency = int(plan.diagnostics.target_latency_ms or 0)
        latency_label = f"{total_latency}ms / target {target_latency}ms" if target_latency else f"{total_latency}ms"
        return RealtimeTurnSummary(
            segment_id=plan.segment_id,
            source_text=plan.source_text,
            translated_text=plan.translated_text,
            translation_status=plan.translation.status,
            translation_engine=plan.translation.engine_name,
            tts_status=plan.tts_plan.status,
            tts_engine=plan.tts_plan.engine_name,
            fallback_active=bool(plan.diagnostics.fallback_active),
            ready_for_next_stage=bool(plan.ready_for_tts),
            latency_label=latency_label,
        )
