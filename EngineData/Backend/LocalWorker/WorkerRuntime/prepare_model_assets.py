from __future__ import annotations

import prepare_model_assets_core as _core

MANIFEST_PATH = _core.MANIFEST_PATH
PROJECT_ROOT = _core.PROJECT_ROOT
RUNTIME_ASSETS_ROOT = _core.RUNTIME_ASSETS_ROOT
FULL_REVISION = _core.FULL_REVISION

load_manifest = _core.load_manifest
resolve_target = _core.resolve_target
validate_download_allow_patterns = _core.validate_download_allow_patterns
validate_huggingface_model = _core.validate_huggingface_model
build_plan = _core.build_plan
clean_huggingface_local_cache = _core.clean_huggingface_local_cache
serializable_plan = _core.serializable_plan

_CORE_REPLACE_TARGET_FROM_SNAPSHOT = _core.replace_target_from_snapshot
REVISION_MARKER = ".translateit_model_revision"


def replace_target_from_snapshot(item):
    result = _CORE_REPLACE_TARGET_FROM_SNAPSHOT(item)
    marker = item["target"] / REVISION_MARKER
    marker.write_text(str(item["revision"]).strip() + "\n", encoding="utf-8")
    result["revision_marker"] = REVISION_MARKER
    return result


def main() -> int:
    previous = _core.replace_target_from_snapshot
    _core.replace_target_from_snapshot = replace_target_from_snapshot
    try:
        return _core.main()
    finally:
        _core.replace_target_from_snapshot = previous


if __name__ == "__main__":
    raise SystemExit(main())
