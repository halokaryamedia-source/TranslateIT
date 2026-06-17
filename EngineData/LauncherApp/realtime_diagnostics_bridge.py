from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Mapping


@dataclass(slots=True)
class RealtimeDiagnosticsPayload:
    timestamp_iso: str
    status: str
    compact_text: str
    raw: dict[str, Any]


class RealtimeDiagnosticsBridge:
    @staticmethod
    def from_mapping(data: Mapping[str, Any]) -> RealtimeDiagnosticsPayload:
        status = str(data.get("status", "Unknown"))
        latency = str(data.get("latency_label", data.get("latency", "Latency unavailable")))
        model = str(data.get("model_label", data.get("model", "No model reported")))
        fallback = str(data.get("fallback_label", data.get("fallback", "Unknown fallback")))
        compact_text = " | ".join(piece for piece in (status, latency, model, fallback) if piece)
        return RealtimeDiagnosticsPayload(
            timestamp_iso=datetime.now().astimezone().isoformat(timespec="milliseconds"),
            status=status,
            compact_text=compact_text,
            raw=dict(data),
        )
