from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
APP_MAIN = PROJECT_ROOT / "EngineData" / "LauncherApp" / "app_main.py"

REQUIRED_MARKERS = {
    "hook_import": "from EngineData.LauncherApp.realtime_app_status_hook import RealtimeAppStatusHook",
    "alias_row": '"realtime": "Realtime"',
    "refresh_method": "def refresh_realtime_status_panel",
    "hook_call": "RealtimeAppStatusHook.apply",
}


@dataclass(slots=True)
class AppMainHookVerification:
    applied: bool
    missing: list[str]
    present: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def verify_app_main_hook() -> AppMainHookVerification:
    text = APP_MAIN.read_text(encoding="utf-8")
    present: list[str] = []
    missing: list[str] = []
    for key, marker in REQUIRED_MARKERS.items():
        if marker in text:
            present.append(key)
        else:
            missing.append(key)
    return AppMainHookVerification(applied=not missing, missing=missing, present=present)


if __name__ == "__main__":
    result = verify_app_main_hook()
    print(result.to_dict())
    raise SystemExit(0 if result.applied else 1)
