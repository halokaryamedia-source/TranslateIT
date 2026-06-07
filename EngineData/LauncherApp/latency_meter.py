from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from time import perf_counter_ns
from typing import Any


def _iso_now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="milliseconds")


def ns_to_ms(start_ns: int | None, end_ns: int | None) -> int | None:
    if start_ns is None or end_ns is None:
        return None
    return int(max(0, (end_ns - start_ns) / 1_000_000))


@dataclass(slots=True)
class MetricEvent:
    monotonic_ns: int | None = None
    wall_clock_iso: str | None = None
    source: str = ""
    notes: str = ""
    missing_reason: str = ""

    @classmethod
    def capture(cls, source: str, notes: str = "") -> "MetricEvent":
        return cls(monotonic_ns=perf_counter_ns(), wall_clock_iso=_iso_now(), source=source, notes=notes)


@dataclass(slots=True)
class MetricTrace:
    measurement_version: str = "latency_meter_v2_rebuild"
    legacy_metric_not_trusted: bool = True
    session_id: str = ""
    segment_id: str = ""
    source_text: str = ""
    translated_text: str = ""
    events: dict[str, MetricEvent] = field(default_factory=dict)
    playback_backend: dict[str, Any] = field(default_factory=dict)
    official_metrics: dict[str, Any] = field(default_factory=dict)
    component_totals_ms: dict[str, Any] = field(default_factory=dict)
    component_rows_ms: dict[str, Any] = field(default_factory=dict)
    adjacent_gaps_ms: dict[str, Any] = field(default_factory=dict)
    candidate_latencies_ms: dict[str, Any] = field(default_factory=dict)
    bottleneck: dict[str, Any] = field(default_factory=dict)
    missing_events: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    measurement_limitations: list[str] = field(default_factory=list)

    def mark(self, name: str, source: str, notes: str = "") -> MetricEvent:
        existing = self.events.get(name)
        if existing is not None:
            return existing
        event = MetricEvent.capture(source, notes)
        self.events[name] = event
        return event

    def mark_at(self, name: str, monotonic_ns: int | None, source: str, notes: str = "") -> MetricEvent:
        existing = self.events.get(name)
        if existing is not None:
            return existing
        event = MetricEvent(
            monotonic_ns=monotonic_ns,
            wall_clock_iso=_iso_now(),
            source=source,
            notes=notes,
        )
        self.events[name] = event
        return event

    def get_ns(self, name: str) -> int | None:
        event = self.events.get(name)
        return event.monotonic_ns if event else None

    def gap_ms(self, start: str, end: str) -> int | None:
        return ns_to_ms(self.get_ns(start), self.get_ns(end))

    def to_dict(self) -> dict[str, Any]:
        def _safe(value: Any, seen: set[int] | None = None) -> Any:
            if value is None or isinstance(value, (str, int, float, bool)):
                return value
            if seen is None:
                seen = set()
            obj_id = id(value)
            if obj_id in seen:
                return "<recursion>"
            seen.add(obj_id)
            if isinstance(value, dict):
                return {str(key): _safe(item, seen) for key, item in value.items() if not str(key).endswith("_obj")}
            if isinstance(value, (list, tuple, set)):
                return [_safe(item, seen) for item in value]
            if hasattr(value, "to_dict") and callable(getattr(value, "to_dict")):
                try:
                    return _safe(value.to_dict(), seen)
                except Exception:
                    return str(value)
            return str(value)

        return {
            "measurement_version": self.measurement_version,
            "legacy_metric_not_trusted": self.legacy_metric_not_trusted,
            "segment": {
                "session_id": self.session_id,
                "segment_id": self.segment_id,
                "source_text": self.source_text,
                "translated_text": self.translated_text,
            },
            "official_metrics": _safe(self.official_metrics),
            "component_totals_ms": _safe(self.component_totals_ms),
            "component_rows_ms": _safe(self.component_rows_ms),
            "events": {
                name: {
                    "monotonic_ns": event.monotonic_ns,
                    "wall_clock_iso": event.wall_clock_iso,
                    "source": event.source,
                    "notes": event.notes,
                    "missing_reason": event.missing_reason,
                }
                for name, event in self.events.items()
            },
            "adjacent_gaps_ms": _safe(self.adjacent_gaps_ms),
            "candidate_latencies_ms": _safe(self.candidate_latencies_ms),
            "playback_backend": _safe(self.playback_backend),
            "bottleneck": _safe(self.bottleneck),
            "missing_events": list(self.missing_events),
            "warnings": list(self.warnings),
            "measurement_limitations": list(self.measurement_limitations),
        }

    def build_summary(self) -> None:
        self.component_rows_ms = {}
        self.component_totals_ms = {}
        self.adjacent_gaps_ms = {}
        self.candidate_latencies_ms = {}
        self.bottleneck = {"highest_component": "", "highest_row": "", "highest_detail": "", "highest_ms": 0}
        self.playback_backend = {
            "backend_name": self.playback_backend.get("backend_name", ""),
            "backend_blocking": self.playback_backend.get("backend_blocking"),
            "backend_flags": self.playback_backend.get("backend_flags", ""),
            "backend_start_is_actual_audible_start": self.playback_backend.get("backend_start_is_actual_audible_start"),
            "backend_event_limitation": self.playback_backend.get("backend_event_limitation", ""),
        }
        speech_start = self.get_ns("speech_start")
        speech_end = self.get_ns("speech_end")
        voice_start_proxy = self.get_ns("voice_start_proxy")
        voice_completed = self.get_ns("voice_completed")
        first_voice = voice_start_proxy or self.get_ns("actual_first_audio_buffer_played") or self.get_ns("playback_first_buffer_submit") or self.get_ns("playback_started")
        asr_start = self.get_ns("asr_start")
        asr_end = self.get_ns("asr_end")
        translation_start = self.get_ns("translation_start")
        translation_end = self.get_ns("translation_end")
        tts_start = self.get_ns("tts_start")
        tts_audio_ready = self.get_ns("tts_audio_ready")
        playback_enqueue = self.get_ns("playback_request")
        playback_start = self.get_ns("playback_first_buffer_submit") or self.get_ns("actual_first_audio_buffer_played")
        self.official_metrics = {
            "speech_duration_ms": ns_to_ms(speech_start, speech_end) or 0,
            "delay_after_speech_end_ms": ns_to_ms(speech_end, first_voice) or 0,
            "speech_end_to_voice_proxy_ms": ns_to_ms(speech_end, voice_start_proxy),
            "total_realtime_ms": ns_to_ms(speech_start, first_voice) or 0,
            "speech_start_time": self.events.get("speech_start").wall_clock_iso if "speech_start" in self.events else "",
            "speech_end_time": self.events.get("speech_end").wall_clock_iso if "speech_end" in self.events else "",
            "vad_endpoint_time": self.events.get("vad_endpoint").wall_clock_iso if "vad_endpoint" in self.events else "",
            "asr_start_time": self.events.get("asr_start").wall_clock_iso if "asr_start" in self.events else "",
            "asr_end_time": self.events.get("asr_end").wall_clock_iso if "asr_end" in self.events else "",
            "translation_start_time": self.events.get("translation_start").wall_clock_iso if "translation_start" in self.events else "",
            "translation_end_time": self.events.get("translation_end").wall_clock_iso if "translation_end" in self.events else "",
            "tts_start_time": self.events.get("tts_start").wall_clock_iso if "tts_start" in self.events else "",
            "tts_audio_ready_time": self.events.get("tts_audio_ready").wall_clock_iso if "tts_audio_ready" in self.events else "",
            "playback_enqueue_time": self.events.get("playback_request").wall_clock_iso if "playback_request" in self.events else "",
            "playback_start_time": self.events.get("playback_first_buffer_submit").wall_clock_iso if "playback_first_buffer_submit" in self.events else "",
            "first_voice_out_time": self.events.get("voice_start_proxy").wall_clock_iso if "voice_start_proxy" in self.events else (self.events.get("actual_first_audio_buffer_played").wall_clock_iso if "actual_first_audio_buffer_played" in self.events else ""),
            "voice_start_proxy_time": self.events.get("voice_start_proxy").wall_clock_iso if "voice_start_proxy" in self.events else "",
            "voice_completed_time": self.events.get("voice_completed").wall_clock_iso if "voice_completed" in self.events else "",
            "official_voice_latency_end_event": "voice_start_proxy" if "voice_start_proxy" in self.events else ("actual_first_audio_buffer_played" if "actual_first_audio_buffer_played" in self.events else ("playback_first_buffer_submit" if "playback_first_buffer_submit" in self.events else "")),
            "official_voice_latency_end_event_quality": "proxy" if "voice_start_proxy" in self.events or "actual_first_audio_buffer_played" in self.events or "playback_first_buffer_submit" in self.events else "missing",
            "official_voice_latency_end_event_reason": "" if "voice_start_proxy" in self.events or "actual_first_audio_buffer_played" in self.events or "playback_first_buffer_submit" in self.events else "first-voice timestamp not available from playback backend",
            "measurement_status": "MEASURED" if first_voice is not None else "PARTIAL",
            "speech_to_first_voice_ms": ns_to_ms(speech_start, first_voice) or 0,
            "voice_start_proxy_ms": ns_to_ms(speech_start, voice_start_proxy) or 0,
            "voice_completed_ms": ns_to_ms(tts_start, voice_completed or tts_audio_ready) or 0,
            "asr_ms": ns_to_ms(asr_start, asr_end) or 0,
            "translation_ms": ns_to_ms(translation_start, translation_end) or 0,
            "tts_ms": ns_to_ms(tts_start, tts_audio_ready) or 0,
            "playback_enqueue_to_start_ms": ns_to_ms(playback_enqueue, playback_start) or 0,
        }
