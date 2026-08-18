from __future__ import annotations

import importlib.util
from pathlib import Path


def load_module():
    path = Path(__file__).resolve().parents[1] / "prepare_model_assets.py"
    spec = importlib.util.spec_from_file_location("translateit_prepare_model_assets", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_required_huggingface_plan_is_revision_pinned_and_runtime_asset_scoped() -> None:
    module = load_module()
    manifest = module.load_manifest()
    selected, manual = module.build_plan(manifest)

    assert {item["model_id"] for item in selected} == {
        "faster-whisper-large-v3-turbo",
        "m2m100-418m",
    }
    assert all(module.FULL_REVISION.fullmatch(item["revision"]) for item in selected)
    assert all(item["target"].is_relative_to(module.RUNTIME_ASSETS_ROOT) for item in selected)
    assert {item["model_id"] for item in manual} == {
        "gpt-sovits-v2proplus-voicelab",
    }


def test_m2m100_plan_excludes_duplicate_unused_framework_weight() -> None:
    module = load_module()
    selected, _manual = module.build_plan(module.load_manifest())
    candidate = next(item for item in selected if item["model_id"] == "m2m100-418m")

    assert candidate["revision"] == "55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636"
    assert candidate["download_allow_patterns"] == [
        "README.md",
        "config.json",
        "generation_config.json",
        "pytorch_model.bin",
        "sentencepiece.bpe.model",
        "special_tokens_map.json",
        "tokenizer_config.json",
        "vocab.json",
    ]
    assert "rust_model.ot" not in candidate["download_allow_patterns"]


def test_download_allow_pattern_cannot_escape_snapshot() -> None:
    module = load_module()
    try:
        module.validate_download_allow_patterns("example", ["../outside.bin"])
    except RuntimeError as exc:
        assert "may not escape" in str(exc)
    else:
        raise AssertionError("snapshot allow pattern must not escape its model root")


def test_optional_plan_adds_only_manifest_optional_huggingface_assets() -> None:
    module = load_module()
    selected, _manual = module.build_plan(module.load_manifest(), include_optional=True)
    assert {item["model_id"] for item in selected} == {
        "faster-whisper-large-v3-turbo",
        "faster-whisper-medium",
        "m2m100-418m",
    }


def test_specific_model_selection_rejects_manual_asset() -> None:
    module = load_module()
    try:
        module.build_plan(
            module.load_manifest(),
            requested_ids={"gpt-sovits-v2proplus-voicelab"},
        )
    except RuntimeError as exc:
        assert "not Hugging Face-acquirable" in str(exc)
    else:
        raise AssertionError("manual GPT-SoVITS asset must not be promoted to Hugging Face acquisition")
