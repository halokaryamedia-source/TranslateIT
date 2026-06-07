from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Iterable

from EngineData.TranscriptEngine.transcript_segment import TranscriptSegment


@dataclass(frozen=True, slots=True)
class BenchmarkSummary:
    status: str = "empty"
    segment_count: int = 0
    mean_speech_start_to_first_voice_ms: int = 0
    mean_asr_ms: int = 0
    mean_translation_ms: int = 0
    mean_tts_ms: int = 0
    main_bottleneck_stage: str = ""

    @dataclass(frozen=True, slots=True)
    class StageStats:
        p50_ms: int = 0
        p95_ms: int = 0
        worst_ms: int = 0

    def to_dict(self) -> dict[str, object]:
        return {
            "status": self.status,
            "segment_count": self.segment_count,
            "mean_speech_start_to_first_voice_ms": self.mean_speech_start_to_first_voice_ms,
            "mean_asr_ms": self.mean_asr_ms,
            "mean_translation_ms": self.mean_translation_ms,
            "mean_tts_ms": self.mean_tts_ms,
            "main_bottleneck_stage": self.main_bottleneck_stage,
        }

    def to_log_lines(self) -> list[str]:
        return [
            f"Segments: {self.segment_count}",
            f"Speech->first_voice_proxy: {self.mean_speech_start_to_first_voice_ms} ms",
            f"ASR: {self.mean_asr_ms} ms",
            f"Translation: {self.mean_translation_ms} ms",
            f"TTS: {self.mean_tts_ms} ms",
            f"Main bottleneck: {self.main_bottleneck_stage or 'Unknown'}",
        ]

    @property
    def completed_segments(self) -> int:
        return self.segment_count

    @property
    def rejected_segments(self) -> int:
        return 0

    @property
    def total_after_eos(self) -> "BenchmarkSummary.StageStats":
        return self.StageStats()

    @property
    def average_asr_ms(self) -> int:
        return self.mean_asr_ms

    @property
    def average_translation_ms(self) -> int:
        return self.mean_translation_ms


LatencyBenchmarkSummary = BenchmarkSummary


def build_summary(segments: Iterable[TranscriptSegment]) -> BenchmarkSummary:
    segment_list = list(segments)
    if not segment_list:
        return BenchmarkSummary()
    voice_ms = [
        int(getattr(segment.latency, "speech_start_to_first_voice_output_ms", 0) or 0)
        for segment in segment_list
        if int(getattr(segment.latency, "speech_start_to_first_voice_output_ms", 0) or 0) > 0
    ]
    asr_ms = [
        int(getattr(segment.latency, "asr_latency_ms", 0) or getattr(segment.latency, "asr_ms", 0) or 0)
        for segment in segment_list
        if int(getattr(segment.latency, "asr_latency_ms", 0) or getattr(segment.latency, "asr_ms", 0) or 0) > 0
    ]
    translate_ms = [
        int(getattr(segment.latency, "translation_latency_ms", 0) or getattr(segment.latency, "translation_ms", 0) or 0)
        for segment in segment_list
        if int(getattr(segment.latency, "translation_latency_ms", 0) or getattr(segment.latency, "translation_ms", 0) or 0) > 0
    ]
    tts_ms = [
        int(
            getattr(segment.latency, "tts_voice_start_proxy_ms", 0)
            or getattr(segment.latency, "tts_playback_start_ms", 0)
            or getattr(segment.latency, "tts_direct_speak_called_ms", 0)
            or getattr(segment.latency, "tts_voice_generate_ms", 0)
            or 0
        )
        for segment in segment_list
        if int(
            getattr(segment.latency, "tts_voice_start_proxy_ms", 0)
            or getattr(segment.latency, "tts_playback_start_ms", 0)
            or getattr(segment.latency, "tts_direct_speak_called_ms", 0)
            or getattr(segment.latency, "tts_voice_generate_ms", 0)
            or 0
        )
        > 0
    ]
    stage_weights = {
        "VAD endpointing": mean(
            [int(getattr(segment.latency, "delay_after_speech_end_ms", 0) or 0) for segment in segment_list if int(getattr(segment.latency, "delay_after_speech_end_ms", 0) or 0) > 0]
        )
        if any(int(getattr(segment.latency, "delay_after_speech_end_ms", 0) or 0) > 0 for segment in segment_list)
        else 0,
        "ASR": mean(asr_ms) if asr_ms else 0,
        "translation": mean(translate_ms) if translate_ms else 0,
        "TTS": mean(tts_ms) if tts_ms else 0,
    }
    bottleneck = max(stage_weights, key=stage_weights.get) if any(stage_weights.values()) else ""
    return BenchmarkSummary(
        status="measured" if voice_ms or asr_ms or translate_ms or tts_ms else "partial",
        segment_count=len(segment_list),
        mean_speech_start_to_first_voice_ms=int(mean(voice_ms)) if voice_ms else 0,
        mean_asr_ms=int(mean(asr_ms)) if asr_ms else 0,
        mean_translation_ms=int(mean(translate_ms)) if translate_ms else 0,
        mean_tts_ms=int(mean(tts_ms)) if tts_ms else 0,
        main_bottleneck_stage=bottleneck,
    )


def build_latency_benchmark_summary(segments: Iterable[TranscriptSegment]) -> BenchmarkSummary:
    return build_summary(segments)
