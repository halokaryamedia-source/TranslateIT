from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path


WORKER_ROOT = Path(__file__).resolve().parents[1]
WORKER_PATH = WORKER_ROOT / "realtime_local_worker.py"
ENVELOPE_PATH = WORKER_ROOT / "translation_envelope.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_worker_module():
    return load_module("translateit_realtime_local_worker_reliability", WORKER_PATH)


def load_envelope_module():
    return load_module("translateit_translation_envelope_reliability", ENVELOPE_PATH)


class CountingTokenizer:
    model_max_length = 1024

    def __call__(self, text: str, **_kwargs):
        return {"input_ids": list(range(max(1, len(text.split()))))}


def test_semantic_units_preserve_abbreviation_version_url_ip_and_decimal() -> None:
    envelope = load_envelope_module()
    source = (
        "Dr. Younes released TranslateIT v2.4.1 at https://example.com. "
        "The server is 192.168.1.20 and the measured value is 3.14."
    )

    assert envelope.semantic_sentence_units(source) == [
        "Dr. Younes released TranslateIT v2.4.1 at https://example.com.",
        "The server is 192.168.1.20 and the measured value is 3.14.",
    ]


def test_standalone_plan_always_uses_semantic_units_and_preserves_paragraphs() -> None:
    envelope = load_envelope_module()
    source = (
        "I did not approve 1800 dollars, not 2100 dollars. Can you send the corrected file?"
        "\n\n"
        "The Clockwork project is ready. Younes will review it tomorrow."
    )

    plan = envelope.standalone_plan(source, CountingTokenizer(), 1024)

    assert plan == [
        [
            "I did not approve 1800 dollars, not 2100 dollars.",
            "Can you send the corrected file?",
        ],
        [
            "The Clockwork project is ready.",
            "Younes will review it tomorrow.",
        ],
    ]


def test_standalone_plan_token_splits_only_an_oversized_semantic_unit() -> None:
    envelope = load_envelope_module()
    source = "one two three four five six seven eight. Short sentence."

    plan = envelope.standalone_plan(source, CountingTokenizer(), 4)

    assert plan == [[
        "one two three four",
        "five six seven eight.",
        "Short sentence.",
    ]]


def test_translation_runtime_reuses_one_loaded_model_for_both_directions(monkeypatch) -> None:
    worker = load_worker_module()
    constructed = {"tokenizer": 0, "model": 0}

    class FakeTokenizer:
        @classmethod
        def from_pretrained(cls, _path: str, *, local_files_only: bool):
            assert local_files_only is True
            constructed["tokenizer"] += 1
            return cls()

        def get_lang_id(self, language: str) -> int:
            return {"id": 7, "en": 8}[language]

    class FakeModel:
        @classmethod
        def from_pretrained(cls, _path: str, *, local_files_only: bool):
            assert local_files_only is True
            constructed["model"] += 1
            return cls()

        def eval(self) -> None:
            pass

    monkeypatch.setitem(
        sys.modules,
        "transformers",
        types.SimpleNamespace(
            AutoModelForSeq2SeqLM=FakeModel,
            AutoTokenizer=FakeTokenizer,
        ),
    )
    monkeypatch.setattr(worker, "translation_runtime_config", lambda: ("cpu", "torch_cuda_unavailable"))
    worker.TRANSLATION_RUNTIME.clear()

    id_en = worker.get_translation_runtime("id", "en")
    en_id = worker.get_translation_runtime("en", "id")

    assert constructed == {"tokenizer": 1, "model": 1}
    assert id_en["model"] is en_id["model"]
    assert id_en["tokenizer"] is en_id["tokenizer"]
    assert set(worker.TRANSLATION_RUNTIME) == {"id->en", "en->id"}
