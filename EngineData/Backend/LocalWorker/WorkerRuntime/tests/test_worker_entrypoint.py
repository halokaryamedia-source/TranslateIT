from __future__ import annotations

import importlib.util
from pathlib import Path


WORKER_PATH = Path(__file__).resolve().parents[1] / "realtime_local_worker.py"


def load_entry_module():
    spec = importlib.util.spec_from_file_location("translateit_worker_entry_contract", WORKER_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_worker_entrypoint_uses_explicit_runtime_module_without_exec() -> None:
    source = WORKER_PATH.read_text(encoding="utf-8")
    assert "exec(" not in source
    assert "compile(" not in source
    assert 'globals()["__name__"]' not in source

    entry = load_entry_module()
    assert entry.runtime.__name__ == "realtime_local_worker_base"
    assert entry.TRANSLATION_MODEL == entry.runtime.TRANSLATION_MODEL
    assert entry.HANDLERS is entry.runtime.HANDLERS


def test_worker_entrypoint_installs_provider_once_per_runtime_module() -> None:
    first = load_entry_module()
    first_build_status = first.runtime.build_status_payload
    second = load_entry_module()

    assert second.runtime is first.runtime
    assert second.runtime.build_status_payload is first_build_status
    assert getattr(second.runtime, second._PROVIDER_SENTINEL) is True


def test_facade_override_is_scoped_to_one_call() -> None:
    entry = load_entry_module()
    original = entry.runtime.translation_model_ready
    entry.translation_model_ready = lambda _path: False

    entry.handle_translate({"text": "halo", "source_language": "id", "target_language": "en"})

    assert entry.runtime.translation_model_ready is original
