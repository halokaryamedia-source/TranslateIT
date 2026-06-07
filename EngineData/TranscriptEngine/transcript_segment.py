from __future__ import annotations

from dataclasses import asdict, dataclass, field, fields, is_dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Optional


class MetricMetrics:
    __slots__ = ("_data",)

    def __init__(self, **kwargs: Any) -> None:
        object.__setattr__(self, "_data", dict(kwargs))

    def __getattr__(self, name: str) -> Any:
        if name in self._data:
            return self._data[name]
        if name.endswith(("_ms", "_count", "_ns", "_depth", "_remaining")):
            return 0
        if name.endswith(("_time", "_path", "_name", "_status", "_reason", "_error")):
            return ""
        if name.startswith(("has_", "is_", "was_", "legacy_")) or name.endswith(("_enabled", "_available", "_cached", "_hit", "_used", "_active")):
            return False
        if name == "metric_trace":
            trace = self._data.get("metric_trace")
            if isinstance(trace, dict):
                return trace
            trace = {}
            self._data["metric_trace"] = trace
            return trace
        return None

    def __setattr__(self, name: str, value: Any) -> None:
        if name == "_data":
            object.__setattr__(self, name, value)
            return
        self._data[name] = value

    @staticmethod
    def _safe_value(value: Any, _seen: set[int] | None = None) -> Any:
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if _seen is None:
            _seen = set()
        obj_id = id(value)
        if obj_id in _seen:
            return "<recursion>"
        _seen.add(obj_id)
        if isinstance(value, Path):
            return str(value)
        if isinstance(value, dict):
            return {str(key): MetricMetrics._safe_value(item, _seen) for key, item in value.items() if not str(key).endswith("_obj")}
        if isinstance(value, (list, tuple, set)):
            return [MetricMetrics._safe_value(item, _seen) for item in value]
        if is_dataclass(value):
            return {
                field_info.name: MetricMetrics._safe_value(getattr(value, field_info.name), _seen)
                for field_info in fields(value)
            }
        if hasattr(value, "to_dict") and callable(getattr(value, "to_dict")):
            try:
                return MetricMetrics._safe_value(value.to_dict(), _seen)
            except Exception:
                return str(value)
        if hasattr(value, "__dict__"):
            return {
                key: MetricMetrics._safe_value(item, _seen)
                for key, item in vars(value).items()
                if not key.startswith("_")
            }
        return str(value)

    def to_dict(self) -> dict[str, Any]:
        return {str(key): self._safe_value(value) for key, value in self._data.items() if not str(key).endswith("_obj")}

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "MetricMetrics":
        if not data:
            return cls()
        return cls(**{str(key): value for key, value in data.items() if not str(key).endswith("_obj")})


LatencyMetrics = MetricMetrics


@dataclass(slots=True)
class QualityMetrics:
    input_quality: str = "Unknown"
    asr_confidence: float = 0.0
    status: str = "Planned"
    no_speech_probability: float = 0.0
    average_log_probability: float = 0.0
    compression_ratio: float = 0.0
    language_ok: bool = True
    notes: str = ""
    raw_rms: float = 0.0
    raw_peak: float = 0.0
    speech_to_noise_gap: float = 0.0
    voiced_frame_ratio: float = 0.0
    tts_status: str = ""
    tts_error: str = ""
    output_device_name: str = ""
    replay_error: str = ""
    capture_buffer_ms: int = 0
    endpoint_wait_ms: int = 0
    silence_accumulation_ms: int = 0
    speech_confirmation_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "QualityMetrics":
        data = data or {}
        allowed = {field_info.name for field_info in fields(cls)}
        return cls(**{key: data[key] for key in data.keys() & allowed})


@dataclass(slots=True)
class ReplayPaths:
    source_audio_path: Optional[Path] = None
    translated_audio_path: Optional[Path] = None
    source_replay_available: bool = False
    target_voice_available: bool = False

    def to_dict(self) -> dict[str, Optional[str]]:
        return {
            "source_audio_path": str(self.source_audio_path) if self.source_audio_path else None,
            "translated_audio_path": str(self.translated_audio_path) if self.translated_audio_path else None,
            "source_replay_available": self.source_replay_available or self.source_audio_path is not None,
            "target_voice_available": self.target_voice_available or self.translated_audio_path is not None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "ReplayPaths":
        data = data or {}
        source = data.get("source_audio_path")
        translated = data.get("translated_audio_path")
        return cls(
            source_audio_path=Path(source) if source else None,
            translated_audio_path=Path(translated) if translated else None,
            source_replay_available=bool(data.get("source_replay_available", bool(source))),
            target_voice_available=bool(data.get("target_voice_available", bool(translated))),
        )


@dataclass(slots=True)
class TranscriptSegment:
    segment_id: str
    session_id: str
    input_language: str
    output_language: str
    start_time_ms: int
    end_time_ms: int
    input_text: str
    translated_text: str
    trace_id: str = ""
    latency: MetricMetrics = field(default_factory=MetricMetrics)
    quality: QualityMetrics = field(default_factory=QualityMetrics)
    replay: ReplayPaths = field(default_factory=ReplayPaths)
    pipeline_mode: str = "cascaded"
    capture_mode: str = "Real ASR + Real Translation"
    asr_model_used: str = ""
    asr_device_used: str = ""
    asr_compute_type_used: str = ""
    translation_engine_used: str = ""
    model_fallback_used: bool = False
    error_message: str = ""
    created_at_iso: str = field(default_factory=lambda: datetime.now().astimezone().isoformat())

    @property
    def duration_ms(self) -> int:
        return max(0, self.end_time_ms - self.start_time_ms)

    @property
    def id(self) -> str:
        return self.segment_id

    @property
    def source_text(self) -> str:
        return self.input_text

    @source_text.setter
    def source_text(self, value: str) -> None:
        self.input_text = value

    @property
    def text(self) -> str:
        return self.input_text

    @text.setter
    def text(self, value: str) -> None:
        self.input_text = value

    @property
    def transcript(self) -> str:
        return self.input_text

    @transcript.setter
    def transcript(self, value: str) -> None:
        self.input_text = value

    @property
    def translation(self) -> str:
        return self.translated_text

    @translation.setter
    def translation(self, value: str) -> None:
        self.translated_text = value

    @property
    def target_text(self) -> str:
        return self.translated_text

    @target_text.setter
    def target_text(self, value: str) -> None:
        self.translated_text = value

    @property
    def source_language(self) -> str:
        return self.input_language

    @source_language.setter
    def source_language(self, value: str) -> None:
        self.input_language = value

    @property
    def target_language(self) -> str:
        return self.output_language

    @target_language.setter
    def target_language(self, value: str) -> None:
        self.output_language = value

    @property
    def latency_ms(self) -> int:
        return 0

    @latency_ms.setter
    def latency_ms(self, value: int) -> None:
        return None

    @property
    def asr_latency_ms(self) -> int:
        return 0

    @asr_latency_ms.setter
    def asr_latency_ms(self, value: int) -> None:
        return None

    @property
    def translation_latency_ms(self) -> int:
        return 0

    @translation_latency_ms.setter
    def translation_latency_ms(self, value: int) -> None:
        return None

    @property
    def quality_status(self) -> str:
        return self.quality.status

    @quality_status.setter
    def quality_status(self, value: str) -> None:
        self.quality.status = value

    @property
    def asr_confidence(self) -> float:
        return self.quality.asr_confidence

    @asr_confidence.setter
    def asr_confidence(self, value: float) -> None:
        self.quality.asr_confidence = float(value)

    @property
    def input_quality(self) -> str:
        return self.quality.input_quality

    @input_quality.setter
    def input_quality(self, value: str) -> None:
        self.quality.input_quality = value

    @property
    def source_audio_path(self) -> Optional[Path]:
        return self.replay.source_audio_path

    @source_audio_path.setter
    def source_audio_path(self, value: Optional[Path]) -> None:
        self.replay.source_audio_path = value

    @property
    def translated_audio_path(self) -> Optional[Path]:
        return self.replay.translated_audio_path

    @translated_audio_path.setter
    def translated_audio_path(self, value: Optional[Path]) -> None:
        self.replay.translated_audio_path = value

    @property
    def status(self) -> str:
        return self.quality.status

    @status.setter
    def status(self, value: str) -> None:
        self.quality.status = value

    @property
    def accepted(self) -> bool:
        return self.quality.status == "Completed"

    @accepted.setter
    def accepted(self, value: bool) -> None:
        self.quality.status = "Completed" if value else self.quality.status

    def to_dict(self) -> dict[str, Any]:
        return {
            "segment_id": self.segment_id,
            "trace_id": self.trace_id,
            "session_id": self.session_id,
            "input_language": self.input_language,
            "output_language": self.output_language,
            "start_time_ms": self.start_time_ms,
            "end_time_ms": self.end_time_ms,
            "input_text": self.input_text,
            "translated_text": self.translated_text,
            "latency": self.latency.to_dict(),
            "quality": self.quality.to_dict(),
            "replay": self.replay.to_dict(),
            "pipeline_mode": self.pipeline_mode,
            "capture_mode": self.capture_mode,
            "asr_model_used": self.asr_model_used,
            "asr_device_used": self.asr_device_used,
            "asr_compute_type_used": self.asr_compute_type_used,
            "translation_engine_used": self.translation_engine_used,
            "model_fallback_used": self.model_fallback_used,
            "error_message": self.error_message,
            "created_at_iso": self.created_at_iso,
        }

    def as_record(self) -> dict[str, Any]:
        return self.to_dict()

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "TranscriptSegment":
        data = data or {}
        return cls(
            segment_id=str(data.get("segment_id", "")),
            trace_id=str(data.get("trace_id", "")),
            session_id=str(data.get("session_id", "")),
            input_language=str(data.get("input_language", data.get("source_language", "id"))),
            output_language=str(data.get("output_language", data.get("target_language", "en"))),
            start_time_ms=int(data.get("start_time_ms", 0)),
            end_time_ms=int(data.get("end_time_ms", 0)),
            input_text=str(data.get("input_text", "")),
            translated_text=str(data.get("translated_text", "")),
            latency=MetricMetrics.from_dict(data.get("latency")),
            quality=QualityMetrics.from_dict(data.get("quality")),
            replay=ReplayPaths.from_dict(data.get("replay")),
            pipeline_mode=str(data.get("pipeline_mode", "cascaded")),
            capture_mode=str(data.get("capture_mode", "Real ASR + Real Translation")),
            asr_model_used=str(data.get("asr_model_used", "")),
            asr_device_used=str(data.get("asr_device_used", "")),
            asr_compute_type_used=str(data.get("asr_compute_type_used", "")),
            translation_engine_used=str(data.get("translation_engine_used", "")),
            model_fallback_used=bool(data.get("model_fallback_used", False)),
            error_message=str(data.get("error_message", "")),
            created_at_iso=str(data.get("created_at_iso", datetime.now().astimezone().isoformat())),
        )
