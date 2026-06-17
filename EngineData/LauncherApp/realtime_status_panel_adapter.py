from __future__ import annotations

from dataclasses import dataclass
from typing import Any, MutableMapping

from EngineData.LauncherApp.realtime_diagnostics_bridge import RealtimeDiagnosticsBridge
from EngineData.LauncherApp.realtime_status_panel_contract import RealtimeStatusPanelContract, RealtimeStatusPanelRow


@dataclass(slots=True)
class RealtimeStatusPanelApplyResult:
    applied: bool
    key: str
    value: str
    state: str
    message: str


class RealtimeStatusPanelAdapter:
    """Small adapter for applying realtime status rows to a label mapping."""

    @staticmethod
    def build_row_from_payload(payload: dict[str, Any] | None) -> RealtimeStatusPanelRow:
        if not payload:
            return RealtimeStatusPanelContract.default_row()
        bridge_payload = RealtimeDiagnosticsBridge.from_mapping(payload)
        return RealtimeStatusPanelContract.from_payload({"status": bridge_payload.status, "compact_text": bridge_payload.compact_text})

    @staticmethod
    def apply_to_labels(labels: MutableMapping[str, Any], payload: dict[str, Any] | None) -> RealtimeStatusPanelApplyResult:
        row = RealtimeStatusPanelAdapter.build_row_from_payload(payload)
        widget = labels.get(row.key)
        if widget is None:
            return RealtimeStatusPanelApplyResult(False, row.key, row.value, row.state, "realtime label is missing")
        if hasattr(widget, "setText"):
            widget.setText(row.value)
        if hasattr(widget, "setProperty"):
            widget.setProperty("statusState", row.state)
        return RealtimeStatusPanelApplyResult(True, row.key, row.value, row.state, "realtime label updated")
