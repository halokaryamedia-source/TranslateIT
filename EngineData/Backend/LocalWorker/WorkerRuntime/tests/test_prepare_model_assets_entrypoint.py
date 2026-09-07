from __future__ import annotations

import importlib.util
from pathlib import Path


def load_module():
    path = Path(__file__).resolve().parents[1] / "prepare_model_assets.py"
    spec = importlib.util.spec_from_file_location("translateit_prepare_model_assets_entry", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_entry_wrapper_writes_revision_marker_without_exec(tmp_path: Path, monkeypatch) -> None:
    module = load_module()
    target = tmp_path / "model"
    target.mkdir()
    item = {"target": target, "revision": "a" * 40}

    monkeypatch.setattr(
        module,
        "_CORE_REPLACE_TARGET_FROM_SNAPSHOT",
        lambda _item: {"ok": True},
    )

    result = module.replace_target_from_snapshot(item)

    assert result["revision_marker"] == module.REVISION_MARKER
    assert (target / module.REVISION_MARKER).read_text(encoding="utf-8") == "a" * 40 + "\n"


def test_entry_main_delegates_with_transactional_replacement(monkeypatch) -> None:
    module = load_module()
    original = module._core.replace_target_from_snapshot

    def fake_main() -> int:
        assert module._core.replace_target_from_snapshot is module.replace_target_from_snapshot
        return 17

    monkeypatch.setattr(module._core, "main", fake_main)

    assert module.main() == 17
    assert module._core.replace_target_from_snapshot is original
