from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Mapping


class RealtimeEventType(str, Enum):
    STT_PARTIAL = "stt_partial"
    STT_FINAL = "stt_final"
    TRANSLATION_FINAL = "translation_final"
    TTS_READY = "tts_ready"
    TTS_UNAVAILABLE = "tts_unavailable"
    DIAGNOSTICS = "diagnostics"
    ERROR = "error"


@dataclass(slots=True)
class RealtimeEvent:
    event_type: RealtimeEventType
    segment_id: str
    source_language: str
    target_language: str
    text: str = ""
    translated_text: str = ""
    latency_ms: int = 0
    status: str = "Pending"
    model_label: str = ""
    fallback_active: bool = False
    single_voice_pass: bool = True
    payload: Mapping[str, Any] | None = None

    def compact_status(self) -> str:
        parts = [
            self.event_type.value,
            self.status,
            f"{self.latency_ms}ms" if self.latency_ms > 0 else "latency unavailable",
            self.model_label,
            "fallback" if self.fallback_active else "primary",
            "single voice pass" if self.single_voice_pass else "voice held",
        ]
        return " | ".join(part for part in parts if part)


class RealtimeEventFactory:
    @staticmethod
    def stt_partial(*, segment_id: str, text: str, source_language: str, target_language: str, latency_ms: int, model_label: str = "") -> RealtimeEvent:
        return RealtimeEvent(
            event_type=RealtimeEventType.STT_PARTIAL,
            segment_id=segment_id,
            source_language=source_language,
            target_language=target_language,
            text=text,
            latency_ms=latency_ms,
            status="Partial",
            model_label=model_label,
        )

    @staticmethod
    def stt_final(*, segment_id: str, text: str, source_language: str, target_language: str, latency_ms: int, model_label: str = "") -> RealtimeEvent:
        return RealtimeEvent(
            event_type=RealtimeEventType.STT_FINAL,
            segment_id=segment_id,
            source_language=source_language,
            target_language=target_language,
            text=text,
            latency_ms=latency_ms,
            status="Final",
            model_label=model_label,
        )

    @staticmethod
    def translation_final(*, segment_id: str, text: str, translated_text: str, source_language: str, target_language: str, latency_ms: int, model_label: str, fallback_active: bool) -> RealtimeEvent:
        return RealtimeEvent(
            event_type=RealtimeEventType.TRANSLATION_FINAL,
            segment_id=segment_id,
            source_language=source_language,
            target_language=target_language,
            text=text,
            translated_text=translated_text,
            latency_ms=latency_ms,
            status="Final",
            model_label=model_label,
            fallback_active=fallback_active,
        )

    @staticmethod
    def tts_ready(*, segment_id: str, translated_text: str, source_language: str, target_language: str, model_label: str, latency_budget_ms: int) -> RealtimeEvent:
        return RealtimeEvent(
            event_type=RealtimeEventType.TTS_READY,
            segment_id=segment_id,
            source_language=source_language,
            target_language=target_language,
            translated_text=translated_text,
            latency_ms=latency_budget_ms,
            status="Ready",
            model_label=model_label,
        )

    @staticmethod
    def tts_unavailable(*, segment_id: str, translated_text: str, source_language: str, target_language: str, reason: str) -> RealtimeEvent:
        return RealtimeEvent(
            event_type=RealtimeEventType.TTS_UNAVAILABLE,
            segment_id=segment_id,
            source_language=source_language,
            target_language=target_language,
            translated_text=translated_text,
            status="Unavailable",
            fallback_active=True,
            payload={"reason": reason},
        )
