from __future__ import annotations

from pathlib import Path

_entry_name = __name__
_core_path = Path(__file__).with_name("_test_worker_contract_core.py")
globals()["__name__"] = "_translateit_worker_contract_core"
exec(
    compile(_core_path.read_text(encoding="utf-8"), str(_core_path), "exec"),
    globals(),
    globals(),
)
globals()["__name__"] = _entry_name

for _name in (
    "test_translate_routes_by_language_pair_without_mode_compatibility_output",
    "test_reverse_direction_uses_same_canonical_bidirectional_model",
    "test_worker_status_uses_one_bidirectional_translation_readiness",
    "test_translation_input_limit_uses_smallest_known_limit",
    "test_translation_generation_options_use_target_language_without_overriding_beams",
    "test_translation_cuda_move_failure_is_not_retried_on_cpu",
):
    globals().pop(_name, None)


def test_translate_routes_to_milmmt_without_legacy_mode_output(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(worker, "translation_model_ready", lambda _path: False)
    result = worker.handle_translate(
        {"text": "halo", "source_language": "id", "target_language": "en"}
    )
    assert result["ok"] is False
    assert "mode" not in result
    assert result["direction_pair"] == "id->en"
    assert result["blocker"] == "model:milmmt_46_1b_missing"
    assert result["model_revision"] == worker.MILMMT_MODEL_REVISION


def test_reverse_direction_uses_same_canonical_milmmt_model(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(worker, "translation_model_ready", lambda _path: False)
    result = worker.handle_translate(
        {"text": "hello", "source_language": "en", "target_language": "id"}
    )
    assert result["ok"] is False
    assert result["direction_pair"] == "en->id"
    assert result["blocker"] == "model:milmmt_46_1b_missing"
    assert worker.translation_model_for_direction("id", "en") == (
        "milmmt-46-1b-v1.0",
        worker.TRANSLATION_MODEL,
    )
    assert worker.translation_model_for_direction("en", "id") == (
        "milmmt-46-1b-v1.0",
        worker.TRANSLATION_MODEL,
    )


def test_worker_status_reports_milmmt_revision_for_both_directions(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(worker, "import_ready", lambda _name: True)
    monkeypatch.setattr(worker, "asr_model_ready", lambda _path: True)
    monkeypatch.setattr(worker, "translation_model_ready", lambda _path: True)
    monkeypatch.setattr(
        worker,
        "probe_gpu_runtime",
        lambda _payload=None: {
            "torch_import_ready": True,
            "torch_cuda_probe_ok": True,
            "torch_cuda_available": True,
            "torch_cuda_probe_blocker": "",
            "ctranslate2_import_ready": True,
            "ctranslate2_cuda_probe_ok": True,
            "ctranslate2_cuda_available": True,
            "ctranslate2_cuda_probe_blocker": "",
            "cuda_capability_known": True,
            "cpu_fallback_active": False,
            "cuda_probe_blocker": "",
            "cuda_primary_requested": True,
            "selected_device": "cuda",
            "selected_translation_device": "cuda",
            "selected_compute_type": "int8_float16",
            "fallback_reason": "",
        },
    )
    monkeypatch.setattr(
        worker,
        "voice_actor_static_status",
        lambda: {"ready": True, "actor_token": "actor-v1", "blocker": ""},
    )
    status = worker.build_status_payload({})
    assert status["ok"] is True
    for key in ("translation_id_en", "translation_en_id"):
        assert status["models"][key]["id"] == "milmmt-46-1b-v1.0"
        assert status["models"][key]["revision"] == worker.MILMMT_MODEL_REVISION
        assert status["models"][key]["path"] == str(worker.TRANSLATION_MODEL)


def test_milmmt_standalone_source_limit_reserves_prompt_headroom() -> None:
    worker = load_worker_module()
    assert worker.translation_input_token_limit(object(), object()) == 1792


def test_milmmt_generation_options_are_deterministic_and_have_no_forced_bos() -> None:
    worker = load_worker_module()
    options = worker.translation_generation_options(object(), "id", 64)
    assert options == {
        "max_new_tokens": 64,
        "do_sample": False,
        "return_dict_in_generate": True,
    }
    assert "forced_bos_token_id" not in options
