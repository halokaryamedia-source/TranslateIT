from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"
TESTS = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_worker_contract.py"
RUNTIME = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"
NEXT = ROOT / "docs/knowledge/next-action.md"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def replace_exact_count(text: str, old: str, new: str, expected: int, label: str) -> str:
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f"{label}: expected {expected} matches, found {count}")
    return text.replace(old, new)


def python_function_block(text: str, name: str) -> tuple[re.Match[str], str]:
    pattern = re.compile(rf"^def {re.escape(name)}\b[\s\S]*?(?=^def |\Z)", re.MULTILINE)
    match = pattern.search(text)
    if match is None:
        raise RuntimeError(f"function not found: {name}")
    return match, match.group(0)


def replace_python_function(text: str, name: str, replacement: str) -> str:
    match, _block = python_function_block(text, name)
    return text[: match.start()] + replacement.rstrip() + "\n\n\n" + text[match.end() :].lstrip("\n")


def source() -> None:
    worker = read(WORKER)
    worker = replace_once(
        worker,
        '''def compatibility_mode_label(value: Any) -> str:\n    """Keep old caller response shape while model routing no longer depends on mode."""\n    text = str(value or "").strip().lower()\n    if text == "quality":\n        return "Quality"\n    if text == "realtime":\n        return "Realtime"\n    return "Canonical"\n\n\n''',
        "",
        "remove legacy mode label",
    )
    worker = replace_once(
        worker,
        '''            # Compatibility aliases for current Rust bridge. Routing no longer uses\n            # Realtime/Quality mode; both directions are selected by language pair.\n            "translation_realtime": translation_id_en_ready\n            and transformers_ready\n            and torch_ready,\n            "translation_quality": translation_bidirectional_ready\n            and transformers_ready\n            and torch_ready,\n''',
        "",
        "remove readiness mode aliases",
    )
    worker = replace_once(
        worker,
        '''            # Compatibility names only; there is no longer mode-based model routing.\n            "translation_realtime": {\n                "id": "marianmt-id-en",\n                "ready": translation_id_en_ready,\n                "path": str(TRANSLATION_MODEL_ID_EN),\n            },\n            "translation_quality": {\n                "id": "marianmt-en-id",\n                "ready": translation_en_id_ready,\n                "path": str(TRANSLATION_MODEL_EN_ID),\n            },\n''',
        "",
        "remove model mode aliases",
    )
    worker = replace_once(
        worker,
        '''        "translation_model_ready": translation_id_en_ready,\n        "quality_translation_model_ready": translation_en_id_ready,\n''',
        "",
        "remove ambiguous top-level translation aliases",
    )
    worker = replace_exact_count(
        worker,
        '    compatibility_mode = compatibility_mode_label(payload.get("mode"))\n',
        "",
        2,
        "remove mode compatibility routing labels",
    )
    worker, removed_mode_fields = re.subn(
        r'(?m)^[ \t]*"mode": compatibility_mode,\n',
        "",
        worker,
    )
    if removed_mode_fields != 13:
        raise RuntimeError(
            f"remove mode response compatibility fields: expected 13 matches, found {removed_mode_fields}"
        )
    for forbidden in (
        "compatibility_mode_label",
        '"translation_realtime"',
        '"translation_quality"',
        '"quality_translation_model_ready"',
    ):
        if forbidden in worker:
            raise RuntimeError(f"worker still contains stale compatibility marker: {forbidden}")
    write(WORKER, worker)

    tests = read(TESTS)
    tests = replace_python_function(
        tests,
        "test_mode_label_is_compatibility_only_not_model_selection",
        '''def test_translate_routes_by_language_pair_without_mode_compatibility_output(monkeypatch) -> None:\n    worker = load_worker_module()\n    monkeypatch.setattr(worker, "translation_model_ready", lambda _path: False)\n\n    result = worker.handle_translate(\n        {\n            "text": "halo",\n            "source_language": "id",\n            "target_language": "en",\n        }\n    )\n\n    assert result["ok"] is False\n    assert "mode" not in result\n    assert result["direction_pair"] == "id->en"\n    assert result["blocker"] == "model:marianmt_id_en_missing"''',
    )
    tests = replace_python_function(
        tests,
        "test_reverse_direction_is_supported_independently_from_mode",
        '''def test_reverse_direction_is_supported_by_language_pair(monkeypatch) -> None:\n    worker = load_worker_module()\n    monkeypatch.setattr(worker, "translation_model_ready", lambda _path: False)\n\n    result = worker.handle_translate(\n        {\n            "text": "hello",\n            "source_language": "en",\n            "target_language": "id",\n        }\n    )\n\n    assert result["ok"] is False\n    assert "mode" not in result\n    assert result["direction_pair"] == "en->id"\n    assert result["direction_supported"] is True\n    assert result["blocker"] == "model:marianmt_en_id_missing"\n\n\ndef test_worker_status_uses_canonical_translation_readiness_fields(monkeypatch) -> None:\n    worker = load_worker_module()\n    monkeypatch.setattr(worker, "import_ready", lambda _name: True)\n    monkeypatch.setattr(worker, "asr_model_ready", lambda _path: True)\n    monkeypatch.setattr(\n        worker,\n        "translation_model_ready",\n        lambda path: path == worker.TRANSLATION_MODEL_ID_EN,\n    )\n    monkeypatch.setattr(\n        worker,\n        "probe_gpu_runtime",\n        lambda _payload=None: {\n            "torch_import_ready": True,\n            "torch_cuda_available": True,\n            "ctranslate2_import_ready": True,\n            "ctranslate2_cuda_available": True,\n            "nvidia_smi_available": True,\n            "cuda_primary_requested": True,\n            "selected_device": "cuda",\n            "selected_translation_device": "cuda",\n            "selected_compute_type": "int8_float16",\n            "fallback_reason": "",\n        },\n    )\n    monkeypatch.setattr(\n        worker,\n        "select_english_tts_voice",\n        lambda _payload=None: {\n            "ok": True,\n            "provider": "windows-sapi",\n            "voice_id": "Test English Voice",\n            "language_code": "en-us",\n            "voice_path": None,\n            "blocker": "",\n            "sapi_voices": [],\n        },\n    )\n\n    status = worker.build_status_payload({})\n    readiness = status["readiness"]\n\n    assert status["ok"] is True\n    assert status["provider_ready"] is True\n    assert set(readiness) == {\n        "asr",\n        "translation_id_en",\n        "translation_en_id",\n        "translation_bidirectional",\n        "tts",\n        "cuda_degraded",\n    }\n    assert readiness["translation_id_en"] is True\n    assert readiness["translation_en_id"] is False\n    assert readiness["translation_bidirectional"] is False\n    assert "translation_realtime" not in status["models"]\n    assert "translation_quality" not in status["models"]\n    assert "translation_model_ready" not in status\n    assert "quality_translation_model_ready" not in status''',
    )
    tests = replace_once(
        tests,
        '            "mode": "Quality",\n',
        "",
        "remove overflow test mode input",
    )
    write(TESTS, tests)

    runtime = read(RUNTIME)
    runtime = replace_once(
        runtime,
        '''    let realtime_translation_ready =\n        worker_nested_bool(status, "readiness", "translation_realtime");\n''',
        '''    let outbound_translation_ready =\n        worker_nested_bool(status, "readiness", "translation_id_en");\n''',
        "Rust canonical outbound translation readiness",
    )
    runtime = replace_once(
        runtime,
        "    runtime.provider_ready = worker_ok && asr_ready && realtime_translation_ready && tts_ready;\n",
        "    runtime.provider_ready = worker_ok && asr_ready && outbound_translation_ready && tts_ready;\n",
        "Rust provider readiness canonical field",
    )
    readiness_tests = '''#[cfg(test)]\nmod readiness_contract_tests {\n    use super::*;\n\n    #[test]\n    fn worker_status_uses_canonical_direction_readiness_and_rejects_legacy_aliases() {\n        let mut runtime = HelperBridgeRuntime::default();\n        apply_worker_status(\n            &mut runtime,\n            &json!({\n                "ok": true,\n                "readiness": {\n                    "asr": true,\n                    "translation_id_en": true,\n                    "translation_en_id": false,\n                    "translation_bidirectional": false,\n                    "tts": true,\n                    "cuda_degraded": false\n                }\n            }),\n        );\n        assert!(runtime.provider_ready);\n        assert!(runtime.cuda_ready);\n        assert!(!runtime.degraded_mode);\n\n        let mut legacy_only = HelperBridgeRuntime::default();\n        apply_worker_status(\n            &mut legacy_only,\n            &json!({\n                "ok": true,\n                "readiness": {\n                    "asr": true,\n                    "translation_realtime": true,\n                    "translation_quality": true,\n                    "tts": true,\n                    "cuda_degraded": false\n                }\n            }),\n        );\n        assert!(!legacy_only.provider_ready);\n    }\n}\n\n'''
    runtime = replace_once(
        runtime,
        "#[cfg(test)]\nmod stderr_lifecycle_tests {\n",
        readiness_tests + "#[cfg(test)]\nmod stderr_lifecycle_tests {\n",
        "insert Rust readiness contract tests",
    )
    write(RUNTIME, runtime)


def closure() -> None:
    text = read(NEXT)
    old = '''## Current Mode\n\n**Maintenance / Backend Hardening Wave A** — Waves A1-A5 are source/proof closed. Continue one bounded hardening slice at a time before P2.3.\n\n## Next Step — Backend Hardening Wave A6: Canonical Worker Readiness Fields\n\nReconcile the active Rust/Python worker-status contract around one canonical readiness vocabulary and remove stale Realtime/Quality compatibility fields from the active bridge. Keep A6 limited to readiness/status compatibility cleanup and targeted proof; do not mix Python dependency locking/assets (A7), model execution, stderr/scheduler redesign, or audio-route work.\n'''
    new = '''## Backend Hardening Wave A6 — CLOSED\n\nThe active Rust/Python worker contract now uses one direction-based translation readiness vocabulary. Python status emits canonical `readiness.translation_id_en`, `readiness.translation_en_id`, and `readiness.translation_bidirectional` fields; stale `translation_realtime` / `translation_quality` readiness and model aliases plus the ambiguous top-level `translation_model_ready` / `quality_translation_model_ready` compatibility fields are removed. The Rust helper now derives required outbound provider readiness from `translation_id_en` directly.\n\nTranslation preload and inference responses also no longer echo `Realtime`, `Quality`, or `Canonical` mode labels. Current Text and Meeting callers already select translation by explicit source/target language pair, so no active caller requires mode-based routing or response compatibility. Extra unknown request fields remain harmless JSON input, but they no longer become product/runtime contract.\n\nRemote Windows/source proof for this slice passed:\n\n```text\nPython worker canonical readiness/translation tests -> PASS\nPython compileall                                  -> PASS\nRust canonical readiness contract tests            -> PASS\ncargo check                                        -> PASS\ncanonical npm ci                                   -> PASS\nTauri release build --no-bundle                    -> PASS\n```\n\nNo Python dependency locking/assets work, real model execution, stderr/scheduler redesign, audio-route execution, or user-local-PC testing occurred in Wave A6.\n\n## Current Mode\n\n**Maintenance / Backend Hardening Wave A** — Waves A1-A6 are source/proof closed. Continue one bounded hardening slice before P2.3.\n\n## Next Step — Backend Hardening Wave A7: Canonical Python Lock / Asset Semantics\n\nMaterialize and review the canonical WorkerRuntime Python dependency lock and reconcile Meeting-required readiness versus full product-release asset requirements. Keep A7 limited to dependency determinism and asset/readiness ownership; do not mix P2.3 model execution, audio-route/device work, scheduler/stderr redesign, or broad cleanup.\n'''
    text = replace_once(text, old, new, "A6 closure and A7 next step")
    write(NEXT, text)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"source", "closure"}:
        raise SystemExit("usage: backend_wave_a6_patch.py source|closure")
    source() if sys.argv[1] == "source" else closure()
