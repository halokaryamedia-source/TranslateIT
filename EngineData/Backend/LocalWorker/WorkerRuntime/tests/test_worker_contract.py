from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

WORKER_PATH = Path(__file__).resolve().parents[1] / "realtime_local_worker.py"


def load_worker_module():
    spec = importlib.util.spec_from_file_location(
        "translateit_realtime_local_worker", WORKER_PATH
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_mode_label_is_compatibility_only_not_model_selection(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(worker, "translation_model_ready", lambda _path: False)

    result = worker.handle_translate(
        {
            "text": "halo",
            "source_language": "id",
            "target_language": "en",
            "mode": "Fast",
        }
    )

    assert result["ok"] is False
    assert result["mode"] == "Canonical"
    assert result["direction_pair"] == "id->en"
    assert result["blocker"] == "model:marianmt_id_en_missing"


def test_reverse_direction_is_supported_independently_from_mode(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(worker, "translation_model_ready", lambda _path: False)

    result = worker.handle_translate(
        {
            "text": "hello",
            "source_language": "en",
            "target_language": "id",
            "mode": "Realtime",
        }
    )

    assert result["ok"] is False
    assert result["mode"] == "Realtime"
    assert result["direction_pair"] == "en->id"
    assert result["direction_supported"] is True
    assert result["blocker"] == "model:marianmt_en_id_missing"
    assert "fallback_mode" not in result


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
            "mode": "Quality",
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

    class Config:
        is_encoder_decoder = True
        eos_token_id = 2

    class GenerationConfig:
        eos_token_id = 2

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


def test_translation_completion_accepts_verified_eos() -> None:
    worker = load_worker_module()

    class Tokenizer:
        eos_token_id = 2

    class Config:
        is_encoder_decoder = True
        eos_token_id = 2

    class GenerationConfig:
        eos_token_id = 2

    class Model:
        config = Config()
        generation_config = GenerationConfig()

    result = worker.translation_generation_completion(
        [[0, 11, 12, 2]], Tokenizer(), Model(), max_new_tokens=3
    )

    assert result["complete"] is True
    assert result["finished_with_eos"] is True
    assert result["generated_tokens"] == 3
    assert result["hit_token_ceiling"] is True
    assert result["blocker"] == ""


def test_english_sapi_selection_prefers_en_us() -> None:
    worker = load_worker_module()
    selected = worker.select_english_sapi_voice(
        [
            {"name": "Voix française", "culture": "fr-FR"},
            {"name": "English UK", "culture": "en-GB"},
            {"name": "English US", "culture": "en-US"},
        ]
    )

    assert selected == {"name": "English US", "culture": "en-us"}


def test_piper_selection_requires_english_voice_metadata(tmp_path: Path) -> None:
    worker = load_worker_module()

    german = tmp_path / "de_DE-test-medium.onnx"
    german.write_bytes(b"model")
    Path(f"{german}.json").write_text(
        json.dumps({"language": {"code": "de_DE"}}), encoding="utf-8"
    )

    english = tmp_path / "en_GB-test-medium.onnx"
    english.write_bytes(b"model")
    Path(f"{english}.json").write_text(
        json.dumps({"language": {"code": "en_GB"}}), encoding="utf-8"
    )

    selected = worker.select_english_piper_voice(tmp_path)

    assert selected is not None
    assert selected["voice_id"] == "en_GB-test-medium"
    assert selected["language_code"] == "en-gb"
    assert selected["voice_path"] == english


def test_piper_selection_does_not_trust_filename_without_metadata(tmp_path: Path) -> None:
    worker = load_worker_module()
    voice = tmp_path / "en_US-unverified-medium.onnx"
    voice.write_bytes(b"model")

    assert worker.select_english_piper_voice(tmp_path) is None


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


def test_worker_request_deadline_budget_bounds_nested_subprocess(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(worker, "now_ms", lambda: 10_000)
    payload = {"deadline_unix_ms": 12_000}

    assert worker.request_deadline_remaining_ms(payload) == 2_000
    assert worker.request_deadline_expired(payload) is False
    assert worker.bounded_subprocess_timeout_seconds(payload, 8.0) == 1.5

    expired = {"deadline_unix_ms": 9_999}
    assert worker.request_deadline_expired(expired) is True
    assert worker.bounded_subprocess_timeout_seconds(expired, 8.0) == 0.1


def test_sapi_probe_timeout_does_not_poison_process_cache(monkeypatch) -> None:
    worker = load_worker_module()
    monkeypatch.setattr(worker.sys, "platform", "win32")
    monkeypatch.setattr(worker, "SAPI_STATUS", None)

    def timed_out(*_args, **_kwargs):
        raise subprocess.TimeoutExpired(cmd="powershell", timeout=1)

    monkeypatch.setattr(worker.subprocess, "run", timed_out)
    ready, voices, blocker = worker.sapi_status({"deadline_unix_ms": worker.now_ms() + 2_000})

    assert ready is False
    assert voices == []
    assert blocker == "tts:sapi_probe_timeout"
    assert worker.SAPI_STATUS is None


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
