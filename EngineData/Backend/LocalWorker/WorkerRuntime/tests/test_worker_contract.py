from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

WORKER_PATH = Path(__file__).resolve().parents[1] / "realtime_local_worker.py"


def load_worker_module():
    spec = importlib.util.spec_from_file_location("translateit_realtime_local_worker", WORKER_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_translate_rejects_unknown_mode_before_model_load() -> None:
    worker = load_worker_module()
    result = worker.handle_translate(
        {
            "text": "halo",
            "source_language": "id",
            "target_language": "en",
            "mode": "Fast",
        }
    )

    assert result["ok"] is False
    assert result["blocker"] == "translation:unsupported_mode"


def test_realtime_unsupported_direction_does_not_switch_mode() -> None:
    worker = load_worker_module()
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
    assert result["blocker"] == "translation:direction_not_supported_by_realtime_model"
    assert "fallback_mode" not in result


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
