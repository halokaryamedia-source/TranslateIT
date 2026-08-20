from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import types
from pathlib import Path

import pytest

WORKER_PATH = Path(__file__).resolve().parents[1] / "realtime_local_worker.py"


def load_worker_module():
    spec = importlib.util.spec_from_file_location("translateit_realtime_local_worker", WORKER_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_translate_routes_by_language_pair_without_mode_compatibility_output(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(worker, "translation_model_ready", lambda _path: False)

    result = worker.handle_translate(
        {
            "text": "halo",
            "source_language": "id",
            "target_language": "en",
        }
    )

    assert result["ok"] is False
    assert "mode" not in result
    assert result["direction_pair"] == "id->en"
    assert result["blocker"] == "model:m2m100_418m_missing"


def test_reverse_direction_uses_same_canonical_bidirectional_model(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(worker, "translation_model_ready", lambda _path: False)

    result = worker.handle_translate(
        {
            "text": "hello",
            "source_language": "en",
            "target_language": "id",
        }
    )

    assert result["ok"] is False
    assert "mode" not in result
    assert result["direction_pair"] == "en->id"
    assert result["direction_supported"] is True
    assert result["blocker"] == "model:m2m100_418m_missing"
    assert worker.translation_model_for_direction("id", "en") == (
        "m2m100-418m",
        worker.TRANSLATION_MODEL,
    )
    assert worker.translation_model_for_direction("en", "id") == (
        "m2m100-418m",
        worker.TRANSLATION_MODEL,
    )


def test_worker_status_uses_one_bidirectional_translation_readiness(monkeypatch) -> None:
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
    readiness = status["readiness"]

    assert status["ok"] is True
    assert status["provider_ready"] is True
    assert set(readiness) == {
        "asr",
        "translation_id_en",
        "translation_en_id",
        "translation_bidirectional",
        "voice_actor_tts",
        "cuda_degraded",
    }
    assert readiness["translation_id_en"] is True
    assert readiness["translation_en_id"] is True
    assert readiness["translation_bidirectional"] is True
    assert status["models"]["translation_id_en"]["id"] == "m2m100-418m"
    assert status["models"]["translation_en_id"]["id"] == "m2m100-418m"
    assert status["models"]["translation_id_en"]["path"] == str(worker.TRANSLATION_MODEL)
    assert status["models"]["translation_en_id"]["path"] == str(worker.TRANSLATION_MODEL)
    assert "translation_realtime" not in status["models"]
    assert "translation_quality" not in status["models"]


def test_legacy_userdata_label_maps_to_writable_user_root(tmp_path: Path, monkeypatch) -> None:
    worker = load_worker_module()
    user_root = tmp_path / "app-local-data"
    cache_root = user_root / "CacheData"
    monkeypatch.setattr(worker, "USER_DATA_ROOT", user_root)

    resolved = worker.resolve_worker_path(
        "UserData/CacheData/audio_segments/example.wav",
        cache_root / "default.wav",
        [cache_root],
    )

    assert resolved == (cache_root / "audio_segments" / "example.wav").resolve()


def test_legacy_userdata_label_cannot_escape_allowed_root(tmp_path: Path, monkeypatch) -> None:
    worker = load_worker_module()
    user_root = tmp_path / "app-local-data"
    cache_root = user_root / "CacheData"
    monkeypatch.setattr(worker, "USER_DATA_ROOT", user_root)

    with pytest.raises(ValueError, match="worker:path_outside_allowed_roots"):
        worker.resolve_worker_path(
            "UserData/CacheData/../LogData/not-allowed.wav",
            cache_root / "default.wav",
            [cache_root],
        )


def test_configured_runtime_root_must_be_absolute(tmp_path: Path, monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setenv("TRANSLATEIT_TEST_ROOT", "relative/path")

    with pytest.raises(RuntimeError, match="translateit_test_root_must_be_absolute"):
        worker.configured_absolute_root("TRANSLATEIT_TEST_ROOT", tmp_path)


def test_translate_rejects_character_overflow_before_model_load() -> None:
    worker = load_worker_module()
    text = "a" * (worker.MAX_TRANSLATION_TEXT_CHARS + 1)
    result = worker.handle_translate(
        {
            "text": text,
            "source_language": "id",
            "target_language": "en",
        }
    )

    assert result["ok"] is False
    assert result["blocker"] == "translation:text_too_large"
    assert result["max_chars"] == worker.MAX_TRANSLATION_TEXT_CHARS


def test_translation_input_limit_uses_smallest_known_limit() -> None:
    worker = load_worker_module()

    class Tokenizer:
        model_max_length = 512

    class Config:
        max_position_embeddings = 256

    class Model:
        config = Config()

    assert worker.translation_input_token_limit(Tokenizer(), Model()) == 256


def test_translation_completion_rejects_token_ceiling_without_eos() -> None:
    worker = load_worker_module()

    class Tokenizer:
        eos_token_id = 2
        pad_token_id = 1

    class Config:
        is_encoder_decoder = True
        eos_token_id = 2
        pad_token_id = 1

    class GenerationConfig:
        eos_token_id = 2
        pad_token_id = 1

    class Model:
        config = Config()
        generation_config = GenerationConfig()

    result = worker.translation_generation_completion(
        [[0, 11, 12, 13]], Tokenizer(), Model(), max_new_tokens=3
    )

    assert result["complete"] is False
    assert result["generated_tokens"] == 3
    assert result["hit_token_ceiling"] is True
    assert result["blocker"] == "translation:output_hit_token_ceiling_without_eos"


def test_translation_completion_accepts_verified_eos_with_trailing_padding() -> None:
    worker = load_worker_module()

    class Tokenizer:
        eos_token_id = 2
        pad_token_id = 1

    class Config:
        is_encoder_decoder = True
        eos_token_id = 2
        pad_token_id = 1

    class GenerationConfig:
        eos_token_id = 2
        pad_token_id = 1

    class Model:
        config = Config()
        generation_config = GenerationConfig()

    result = worker.translation_generation_completion(
        [[0, 11, 12, 2, 1, 1]], Tokenizer(), Model(), max_new_tokens=8
    )

    assert result["complete"] is True
    assert result["finished_with_eos"] is True
    assert result["generated_tokens"] == 3
    assert result["hit_token_ceiling"] is False
    assert result["blocker"] == ""


def test_translation_generation_options_use_target_language_without_overriding_beams() -> None:
    worker = load_worker_module()

    class Tokenizer:
        def get_lang_id(self, language: str) -> int:
            return {"id": 7, "en": 8}[language]

    options = worker.translation_generation_options(Tokenizer(), "id", 64)

    assert options == {
        "max_new_tokens": 64,
        "forced_bos_token_id": 7,
        "return_dict_in_generate": True,
    }
    assert "num_beams" not in options


def test_newline_json_protocol_rejects_unknown_command() -> None:
    completed = subprocess.run(
        [sys.executable, str(WORKER_PATH)],
        input='{"command":"not_a_real_command"}\n',
        text=True,
        capture_output=True,
        timeout=5,
        check=False,
    )

    assert completed.returncode == 0
    lines = [line for line in completed.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    payload = json.loads(lines[0])
    assert payload["ok"] is False
    assert payload["blocker"] == "worker:unknown_command"


def test_newline_protocol_rejects_already_expired_request() -> None:
    completed = subprocess.run(
        [sys.executable, str(WORKER_PATH)],
        input='{"command":"ping","deadline_unix_ms":1,"deadline_ms":5000}\n',
        text=True,
        capture_output=True,
        timeout=5,
        check=False,
    )

    assert completed.returncode == 0
    payload = json.loads(completed.stdout.strip())
    assert payload["ok"] is False
    assert payload["stage"] == "ping"
    assert payload["blocker"] == "worker:request_deadline_expired"


def test_routine_gpu_probe_does_not_spawn_external_nvidia_smi(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(
        worker,
        "torch_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": True,
            "cuda_available": False,
            "blocker": "",
        },
    )
    monkeypatch.setattr(
        worker,
        "ctranslate2_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": True,
            "cuda_available": False,
            "blocker": "",
        },
    )

    def unexpected_subprocess(*_args, **_kwargs):
        raise AssertionError("routine GPU capability status must not spawn subprocesses")

    monkeypatch.setattr(subprocess, "run", unexpected_subprocess)
    gpu = worker.probe_gpu_runtime({})

    assert gpu["cuda_capability_known"] is True
    assert gpu["cpu_fallback_active"] is True
    assert gpu["fallback_reason"] == "cuda_unavailable"
    assert "nvidia_smi_available" not in gpu


def test_gpu_probe_uses_cpu_only_for_known_unavailable_capability(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(
        worker,
        "torch_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": True,
            "cuda_available": False,
            "blocker": "",
        },
    )
    monkeypatch.setattr(
        worker,
        "ctranslate2_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": True,
            "cuda_available": False,
            "blocker": "",
        },
    )
    gpu = worker.probe_gpu_runtime({})

    assert gpu["cuda_capability_known"] is True
    assert gpu["cpu_fallback_active"] is True
    assert gpu["selected_device"] == "cpu"
    assert gpu["selected_translation_device"] == "cpu"
    assert gpu["selected_compute_type"] == "int8"
    assert gpu["fallback_reason"] == "cuda_unavailable"
    assert gpu["cuda_probe_blocker"] == ""


def test_gpu_probe_failure_does_not_activate_cpu_fallback(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(
        worker,
        "torch_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": True,
            "cuda_available": False,
            "blocker": "",
        },
    )
    monkeypatch.setattr(
        worker,
        "ctranslate2_status",
        lambda: {
            "import_ready": True,
            "cuda_probe_ok": False,
            "cuda_available": False,
            "blocker": "cuda:ctranslate2_probe_failed:RuntimeError",
        },
    )
    gpu = worker.probe_gpu_runtime({})

    assert gpu["cuda_capability_known"] is False
    assert gpu["cpu_fallback_active"] is False
    assert gpu["selected_device"] == "blocked"
    assert gpu["fallback_reason"] == ""
    assert gpu["cuda_probe_blocker"] == "cuda:ctranslate2_probe_failed:RuntimeError"


def test_asr_cuda_load_failure_is_not_retried_on_cpu(monkeypatch) -> None:
    worker = load_worker_module()
    calls: list[tuple[str, str]] = []

    class FakeWhisperModel:
        def __init__(self, _path: str, *, device: str, compute_type: str) -> None:
            calls.append((device, compute_type))
            raise RuntimeError("cuda model load failed")

    monkeypatch.setitem(
        sys.modules,
        "faster_whisper",
        types.SimpleNamespace(WhisperModel=FakeWhisperModel),
    )
    monkeypatch.setattr(
        worker,
        "asr_runtime_config",
        lambda _payload=None: ("cuda", "int8_float16", ""),
    )
    worker.ASR_RUNTIME = None

    with pytest.raises(RuntimeError, match="cuda model load failed"):
        worker.get_asr_runtime({})

    assert calls == [("cuda", "int8_float16")]
    assert worker.ASR_RUNTIME is None


def test_translation_cuda_move_failure_is_not_retried_on_cpu(monkeypatch) -> None:
    worker = load_worker_module()
    move_calls: list[str] = []

    class FakeTokenizer:
        @classmethod
        def from_pretrained(cls, _path: str, *, local_files_only: bool):
            assert local_files_only is True
            return cls()

        def get_lang_id(self, _language: str) -> int:
            return 1

    class FakeModel:
        @classmethod
        def from_pretrained(cls, _path: str, *, local_files_only: bool):
            assert local_files_only is True
            return cls()

        def to(self, device: str):
            move_calls.append(device)
            raise RuntimeError("cuda model move failed")

        def eval(self) -> None:
            raise AssertionError("eval should not be reached after CUDA move failure")

    monkeypatch.setitem(
        sys.modules,
        "transformers",
        types.SimpleNamespace(
            AutoModelForSeq2SeqLM=FakeModel,
            AutoTokenizer=FakeTokenizer,
        ),
    )
    monkeypatch.setattr(worker, "translation_runtime_config", lambda: ("cuda", ""))
    worker.TRANSLATION_RUNTIME.clear()

    with pytest.raises(RuntimeError, match="cuda model move failed"):
        worker.get_translation_runtime("id", "en")

    assert move_calls == ["cuda"]
    assert worker.TRANSLATION_RUNTIME == {}
