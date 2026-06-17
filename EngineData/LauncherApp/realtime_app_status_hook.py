from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from EngineData.LauncherApp.realtime_status_panel_adapter import RealtimeStatusPanelAdapter


@dataclass(slots=True)
class RealtimeAppStatusHookResult:
    applied: bool
    message: str
    value: str = ""
    state: str = "info"


class RealtimeAppStatusHook:
    """Safe hook that app_main can call after the status panel exists."""

    @staticmethod
    def apply(window: Any, payload: Mapping[str, Any] | None) -> RealtimeAppStatusHookResult:
        labels = getattr(window, "status_labels", None)
        if not isinstance(labels, dict):
            return RealtimeAppStatusHookResult(False, "status_labels not available")
        result = RealtimeStatusPanelAdapter.apply_to_labels(labels, dict(payload or {}))
        return RealtimeAppStatusHookResult(result.applied, result.message, result.value, result.state)
