from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from EngineData.TranscriptEngine.transcript_segment import TranscriptSegment


def _format_latency_label(segment: TranscriptSegment) -> str:
    latency = getattr(segment, "latency", None)
    latency_data = getattr(latency, "_data", {}) if latency is not None else {}
    if not isinstance(latency_data, dict):
        latency_data = {}
    raw_value: Any | None = latency_data.get("speech_end_to_voice_proxy_ms")
    if raw_value in (None, ""):
        return "Latency unavailable"
    try:
        value = int(raw_value)
    except Exception:
        return "Latency unavailable"
    if value <= 0:
        return "Latency unavailable"
    return f"{value} ms"


def _format_latency_detail_label(segment: TranscriptSegment) -> str:
    latency = getattr(segment, "latency", None)
    latency_data = getattr(latency, "_data", {}) if latency is not None else {}
    if not isinstance(latency_data, dict):
        latency_data = {}
    voice_start_proxy = latency_data.get("tts_voice_start_proxy_ms")
    speech_end_to_voice_proxy = latency_data.get("speech_end_to_voice_proxy_ms")
    if voice_start_proxy in (None, "") and speech_end_to_voice_proxy in (None, ""):
        return "Latency unavailable"
    voice_start_text = "Latency unavailable"
    speech_end_text = "Latency unavailable"
    if voice_start_proxy not in (None, ""):
        try:
            voice_start_text = f"{int(voice_start_proxy)} ms"
        except Exception:
            voice_start_text = "Latency unavailable"
    if speech_end_to_voice_proxy not in (None, ""):
        try:
            speech_end_text = f"{int(speech_end_to_voice_proxy)} ms"
        except Exception:
            speech_end_text = "Latency unavailable"
    return f"First voice output: {voice_start_text} | Speech end to first voice: {speech_end_text}"


@dataclass(slots=True)
class TranscriptCardViewModel:
    segment_id: str
    session_id: str
    source_text: str
    translated_text: str
    timestamp_label: str
    total_latency_label: str
    quality_label: str
    latency_detail_label: str = ""
    asr_model_label: str = ""
    translation_engine_label: str = ""
    compute_label: str = ""
    save_status_label: str = "Cached"
    can_replay_source: bool = True
    can_replay_translation: bool = False
    translation_placeholder: bool = False
    source_audio_path: Path | None = None
    translated_audio_path: Path | None = None

    @classmethod
    def from_segment(cls, segment: TranscriptSegment) -> "TranscriptCardViewModel":
        source_text = (
            getattr(segment, "source_text", "")
            or getattr(segment, "text", "")
            or getattr(segment, "transcript", "")
            or getattr(segment, "input_text", "")
        )
        translated_text_value = (
            getattr(segment, "translated_text", "")
            or getattr(segment, "translation", "")
            or getattr(segment, "target_text", "")
        )
        if translated_text_value:
            translated_text = translated_text_value
        elif segment.quality.status.startswith("Rejected"):
            translated_text = "[No translation for rejected segment]"
        else:
            translated_text = "[Translation pending local model]"
        try:
            created_at = datetime.fromisoformat(segment.created_at_iso)
            timestamp_label = created_at.strftime("%H:%M:%S")
        except Exception:
            timestamp_label = f"{segment.start_time_ms} ms - {segment.end_time_ms} ms"
        return cls(
            segment_id=segment.segment_id,
            session_id=segment.session_id,
            source_text=source_text or "[no transcript text]",
            translated_text=translated_text,
            timestamp_label=timestamp_label,
            total_latency_label=_format_latency_label(segment),
            quality_label=segment.quality.status,
            latency_detail_label=_format_latency_detail_label(segment),
            asr_model_label=segment.asr_model_used or "ASR model pending",
            translation_engine_label=segment.translation_engine_used or "Translation engine pending",
            compute_label=(
                "GPU CUDA"
                if segment.asr_device_used == "cuda"
                else ("CPU Degraded" if segment.asr_device_used == "cpu" else "Demo")
            ),
            can_replay_source=bool(
                getattr(segment.replay, "source_replay_available", False)
                or (segment.source_audio_path is not None and Path(segment.source_audio_path).exists())
            ),
            can_replay_translation=bool(
                getattr(segment.replay, "target_voice_available", False)
                or (segment.translated_audio_path is not None and Path(segment.translated_audio_path).exists())
            ),
            translation_placeholder=not bool(translated_text_value),
            source_audio_path=segment.source_audio_path,
            translated_audio_path=segment.translated_audio_path,
        )
