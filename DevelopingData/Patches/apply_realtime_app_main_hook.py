from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
APP_MAIN = PROJECT_ROOT / "EngineData" / "LauncherApp" / "app_main.py"

IMPORT_LINE = "from EngineData.LauncherApp.realtime_app_status_hook import RealtimeAppStatusHook\n"
IMPORT_ANCHOR = "from EngineData.LauncherApp.runtime_validation import build_validation_items, validation_exit_code\n"
ALIAS_ANCHOR = '            "benchmark": "Benchmark",\n'
ALIAS_LINE = '            "realtime": "Realtime",\n'
METHOD_ANCHOR = "    def _get_validation_items(self, *, force_refresh: bool = False) -> list[Any]:\n"
METHOD_BLOCK = '''    def refresh_realtime_status_panel(self, payload: dict[str, Any] | None = None) -> None:\n        result = RealtimeAppStatusHook.apply(self, payload or {"status": "Pending", "compact_text": "Realtime status pending"})\n        if not result.applied:\n            try:\n                self.log_event("INFO", "Realtime status panel hook not applied.", result.message)\n            except Exception:\n                pass\n\n'''


def apply_patch() -> bool:
    text = APP_MAIN.read_text(encoding="utf-8")
    original = text
    if IMPORT_LINE not in text:
        text = text.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + IMPORT_LINE, 1)
    if ALIAS_LINE not in text:
        text = text.replace(ALIAS_ANCHOR, ALIAS_ANCHOR + ALIAS_LINE, 1)
    if "def refresh_realtime_status_panel" not in text:
        text = text.replace(METHOD_ANCHOR, METHOD_BLOCK + METHOD_ANCHOR, 1)
    if text == original:
        return False
    APP_MAIN.write_text(text, encoding="utf-8")
    return True


if __name__ == "__main__":
    changed = apply_patch()
    print("patched" if changed else "already patched")
