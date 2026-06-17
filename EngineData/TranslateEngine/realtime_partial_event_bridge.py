from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from EngineData.TranslateEngine.realtime_event_contract import RealtimeEventFactory


@dataclass(slots=True)
class RealtimePartialEventPayload:
    segment_id: str
    source_language: str
    target_language: str
    text: str
    latency_ms: int
    model_label: str
    compact_status: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RealtimePartialEventBridge:
    """Convert partial STT text into the stable realtime event format."""

    @staticmethod
    def from_partial_text(
        *,
        segment_id: str,
        text: str,
        source_language: str = "id",
        target_language: str = "en",
        latency_ms: int = 0,
        model_label: str = "stt-partial",
    ) -> RealtimePartialEventPayload:
        event = RealtimeEventFactory.stt_partial(
            segment_id=segment_id,
            text=text,
            source_language=source_language,
            target_language=target_language,
            latency_ms=latency_ms,
            model_label=model_label,
        )
        return RealtimePartialEventPayload(
            segment_id=event.segment_id,
            source_language=event.source_language,
            target_language=event.target_language,
            text=event.text,
            latency_ms=event.latency_ms,
            model_label=event.model_label,
            compact_status=event.compact_status(),
        )
