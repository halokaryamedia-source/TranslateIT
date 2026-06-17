from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(slots=True)
class RealtimeStatusPanelRow:
    key: str
    label: str
    value: str
    state: str = "info"


class RealtimeStatusPanelContract:
    """Stable status-panel contract for realtime diagnostics."""

    row_key = "realtime"
    row_label = "Realtime"

    @classmethod
    def default_row(cls) -> RealtimeStatusPanelRow:
        return RealtimeStatusPanelRow(key=cls.row_key, label=cls.row_label, value="Realtime status pending", state="warning")

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any] | None) -> RealtimeStatusPanelRow:
        if not payload:
            return cls.default_row()
        status = str(payload.get("status", "Unknown"))
        compact_text = str(payload.get("compact_text", "")).strip()
        if not compact_text:
            latency = str(payload.get("latency", payload.get("latency_label", "Latency unavailable")))
            model = str(payload.get("model", payload.get("model_label", "No model reported")))
            fallback = str(payload.get("fallback", payload.get("fallback_label", "Fallback unknown")))
            compact_text = " | ".join(item for item in (status, latency, model, fallback) if item)
        return RealtimeStatusPanelRow(key=cls.row_key, label=cls.row_label, value=compact_text or "Realtime status unavailable", state=cls.state_for_status(status))

    @staticmethod
    def state_for_status(status: str) -> str:
        normalized = str(status or "").strip().lower()
        if normalized in {"ready", "completed", "pass"}:
            return "ready"
        if "error" in normalized or "failed" in normalized or "unavailable" in normalized or "blocked" in normalized:
            return "error"
        if "partial" in normalized or "pending" in normalized or "warning" in normalized or "optimization" in normalized:
            return "warning"
        return "info"
