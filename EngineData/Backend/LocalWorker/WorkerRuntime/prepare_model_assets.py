from __future__ import annotations

from pathlib import Path

_entry_name = __name__
_core_path = Path(__file__).with_name("prepare_model_assets_core.py")
globals()["__name__"] = "_translateit_prepare_model_assets_core"
exec(
    compile(_core_path.read_text(encoding="utf-8"), str(_core_path), "exec"),
    globals(),
    globals(),
)
globals()["__name__"] = _entry_name

_ORIGINAL_REPLACE_TARGET_FROM_SNAPSHOT = globals()["replace_target_from_snapshot"]
REVISION_MARKER = ".translateit_model_revision"


def replace_target_from_snapshot(item):
    result = _ORIGINAL_REPLACE_TARGET_FROM_SNAPSHOT(item)
    marker = item["target"] / REVISION_MARKER
    marker.write_text(str(item["revision"]).strip() + "\n", encoding="utf-8")
    result["revision_marker"] = REVISION_MARKER
    return result


if _entry_name == "__main__":
    raise SystemExit(globals()["main"]())
