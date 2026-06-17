from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from EngineData.TranslateEngine.piper_tts_backend import PiperTTSBackend, TTSPlan
from EngineData.TranslateEngine.realtime_diagnostics import RealtimeDiagnosticsAggregator, RealtimeEngineSnapshot
from EngineData.TranslateEngine.translation_engine import TranslationEngine, TranslationRequest, TranslationResult


@dataclass(slots=True)
class RealtimeTurnPlan:
    segment_id: str
    source_text: str
    translated_text: str
    translation: TranslationResult
    tts_plan: TTSPlan
    diagnostics: RealtimeEngineSnapshot
    ready_for_tts: bool
    safe_single_voice_pass: bool = True


@dataclass(slots=True)
class RealtimeTurnPlanner:
    """Plan one realtime conversation turn without blocking on a large LLM.

    This planner combines translation, TTS readiness, and diagnostics into one
    object that the app can show or route later. It does not synthesize or
    replay audio; it only reports whether the turn is ready for the next stage.
    """

    translation_engine: TranslationEngine
    tts_backend: PiperTTSBackend
    diagnostics: RealtimeDiagnosticsAggregator = field(default_factory=RealtimeDiagnosticsAggregator)

    @classmethod
    def from_model_root(cls, model_root: Path | None = None) -> "RealtimeTurnPlanner":
        return cls(
            translation_engine=TranslationEngine(model_root=model_root),
            tts_backend=PiperTTSBackend(model_root=model_root),
        )

    def plan_turn(
        self,
        *,
        segment_id: str,
        source_text: str,
        source_language: str = "id",
        target_language: str = "en",
        context_window: tuple[str, ...] = (),
        voice_name: str = "",
        stt_status: str = "ExternalOrPending",
        stt_latency_ms: int = 0,
        vad_latency_ms: int = 0,
    ) -> RealtimeTurnPlan:
        request = TranslationRequest(
            segment_id=segment_id,
            source_text=source_text,
            source_language=source_language,
            target_language=target_language,
            context_window=context_window,
        )
        translation = self.translation_engine.translate(request)
        tts_plan = self.tts_backend.plan_synthesis(
            text=translation.translated_text,
            language=target_language,
            voice_name=voice_name,
        )
        ready_for_tts = (
            translation.status == "Completed"
            and bool(translation.translated_text)
            and tts_plan.status == "Ready"
            and not translation.voice_replay_allowed
        )
        mt_latency = int(translation.translate_inference_ms or translation.total_ms or translation.latency_ms or 0)
        quality_latency = int(translation.decode_finalize_ms or 0)
        tts_budget = 0 if tts_plan.status == "Ready" else int(tts_plan.estimated_latency_budget_ms or 0)
        snapshot = self.diagnostics.build_snapshot(
            pipeline_mode="realtime_turn_planning",
            metrics={
                "vad_ms": max(0, int(vad_latency_ms)),
                "stt_partial_ms": max(0, int(stt_latency_ms)),
                "mt_ms": max(0, mt_latency),
                "quality_ms": max(0, quality_latency),
                "tts_ms": max(0, tts_budget),
                "output_buffer_ms": 0,
            },
            stt_status=stt_status,
            mt_status=translation.status,
            tts_status=tts_plan.status,
            quality_status=translation.quality_layer_status or "Unknown",
            active_model_summary=self.diagnostics.model_summary(
                mt_engine=translation.engine_name,
                tts_engine=tts_plan.engine_name,
            ),
            fallback_active=bool(translation.fallback_used or tts_plan.status != "Ready"),
            voice_replay_allowed=False,
            notes=translation.notes if translation.status != "Completed" else tts_plan.error,
        )
        return RealtimeTurnPlan(
            segment_id=segment_id,
            source_text=str(source_text or "").strip(),
            translated_text=translation.translated_text,
            translation=translation,
            tts_plan=tts_plan,
            diagnostics=snapshot,
            ready_for_tts=ready_for_tts,
            safe_single_voice_pass=not translation.voice_replay_allowed,
        )
