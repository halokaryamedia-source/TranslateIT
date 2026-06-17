from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from DevelopingData.Patches.verify_realtime_app_main_hook import verify_app_main_hook


@dataclass(slots=True)
class RealtimeHookStatus:
    ready_to_apply: bool
    already_applied: bool
    missing_markers: list[str]
    present_markers: list[str]
    note: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def get_realtime_hook_status() -> RealtimeHookStatus:
    verification = verify_app_main_hook()
    note = "hook already present" if verification.applied else "hook patch is prepared but not applied"
    return RealtimeHookStatus(
        ready_to_apply=True,
        already_applied=verification.applied,
        missing_markers=verification.missing,
        present_markers=verification.present,
        note=note,
    )
