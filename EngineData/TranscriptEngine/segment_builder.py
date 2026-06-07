from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from EngineData.TranscriptEngine.transcript_segment import (
    LatencyMetrics,
    QualityMetrics,
    ReplayPaths,
    TranscriptSegment,
)


@dataclass(slots=True)
class SegmentWindow:
    start_time_ms: int
    end_time_ms: int
    speech_ms: int
    silence_ms: int


class SegmentBuilder:
    """Finalized speech segment builder for accepted TranscriptIT records."""

    def is_valid_duration(self, window: SegmentWindow) -> bool:
        duration_ms = max(0, window.end_time_ms - window.start_time_ms)
        return 500 <= duration_ms <= 8000

    def build_segment(
        self,
        *,
        segment_id: str,
        session_id: str,
        input_language: str = "id",
        output_language: str = "en",
        start_time_ms: int,
        end_time_ms: int,
        input_text: str = "",
        translated_text: str = "",
        trace_id: str = "",
        latency: Optional[LatencyMetrics] = None,
        quality: Optional[QualityMetrics] = None,
        replay: Optional[ReplayPaths] = None,
        source_audio_path: Optional[Path] = None,
        translated_audio_path: Optional[Path] = None,
        pipeline_mode: str = "cascaded",
        capture_mode: str = "Real ASR + Real Translation",
        asr_model_used: str = "",
        asr_device_used: str = "",
        asr_compute_type_used: str = "",
        translation_engine_used: str = "",
        model_fallback_used: bool = False,
        error_message: str = "",
    ) -> TranscriptSegment:
        replay = replay or ReplayPaths(
            source_audio_path=source_audio_path,
            translated_audio_path=translated_audio_path,
        )
        return TranscriptSegment(
            segment_id=segment_id,
            session_id=session_id,
            input_language=input_language,
            output_language=output_language,
            start_time_ms=start_time_ms,
            end_time_ms=end_time_ms,
            input_text=input_text,
            translated_text=translated_text,
            trace_id=trace_id,
            latency=latency or LatencyMetrics(),
            quality=quality or QualityMetrics(),
            replay=replay,
            pipeline_mode=pipeline_mode,
            capture_mode=capture_mode,
            asr_model_used=asr_model_used,
            asr_device_used=asr_device_used,
            asr_compute_type_used=asr_compute_type_used,
            translation_engine_used=translation_engine_used,
            model_fallback_used=model_fallback_used,
            error_message=error_message,
        )
