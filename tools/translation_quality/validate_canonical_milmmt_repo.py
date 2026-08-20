from __future__ import annotations

import json
import re
import sys
from pathlib import Path

MODEL_ID = "milmmt-46-1b-v1.0"
HF_MODEL_ID = "xiaomi-research/MiLMMT-46-1B-v1.0"
REVISION = "4fc480b6c58dec29c159dcdf9fde0f6d5c354995"
EXPECTED_MODEL_PATH = (
    "EngineData/Backend/RuntimeAssets/Translation/ModelData/"
    "xiaomi-research--MiLMMT-46-1B-v1.0"
)
CURRENT_TRANSFORMERS_VERSION = "4.50.0"
CURRENT_TRANSFORMERS_SPEC = ">=4.44.0,<=4.50.0"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def read(path: Path) -> str:
    require(path.is_file(), f"missing:{path}")
    return path.read_text(encoding="utf-8")


def manifest_translation(root: Path) -> dict:
    path = root / "EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json"
    data = json.loads(read(path))
    entries = [
        item
        for item in data.get("models", [])
        if item.get("stage") == "translation_bidirectional_id_en"
    ]
    require(len(entries) == 1, "manifest:translation_entry_count")
    return entries[0]


def validate_manifest(root: Path) -> None:
    item = manifest_translation(root)
    require(item.get("model_id") == MODEL_ID, "manifest:model_id")
    require(item.get("repo_id") == HF_MODEL_ID, "manifest:repo_id")
    require(item.get("revision") == REVISION, "manifest:revision")
    require(item.get("expected_path") == EXPECTED_MODEL_PATH, "manifest:expected_path")
    require(item.get("backend") == "milmmt", "manifest:backend")
    require(item.get("license") == "gemma", "manifest:license")
    patterns = set(item.get("download_allow_patterns") or [])
    for required in {
        "config.json",
        "generation_config.json",
        "model.safetensors",
        "tokenizer.json",
        "tokenizer.model",
        "tokenizer_config.json",
    }:
        require(required in patterns, f"manifest:missing_allow_pattern:{required}")
    require("pytorch_model.bin" not in patterns, "manifest:legacy_pytorch_weight")


def validate_provider(root: Path) -> None:
    worker_root = root / "EngineData/Backend/LocalWorker/WorkerRuntime"
    provider = read(worker_root / "milmmt_translation_provider.py")
    entrypoint = read(worker_root / "realtime_local_worker.py")
    acquisition = read(worker_root / "prepare_model_assets.py")
    require(HF_MODEL_ID in provider and REVISION in provider, "provider:identity")
    require("AutoModelForCausalLM" in provider, "provider:not_causal_lm")
    require("AutoModelForSeq2SeqLM" not in provider, "provider:legacy_seq2seq")
    require(
        '"do_sample": False' in provider or "do_sample=False" in provider,
        "provider:not_deterministic",
    )
    require("prompt_tokens:" in provider, "provider:continuation_slice_missing")
    require("forced_bos_token_id" not in provider, "provider:legacy_forced_bos")
    require(".translateit_model_revision" in provider, "provider:revision_marker_missing")
    require(
        "milmmt_translation_provider.install(globals())" in entrypoint,
        "entrypoint:provider_not_installed",
    )
    require("realtime_local_worker_core.py" in entrypoint, "entrypoint:core_bridge_missing")
    require(
        ".translateit_model_revision" in acquisition,
        "acquisition:revision_marker_missing",
    )


def validate_smoke(root: Path) -> None:
    smoke = read(
        root
        / "EngineData/Backend/LocalWorker/WorkerRuntime/run_realtime_worker_smoke.ps1"
    )
    require('command = "voice_actor_preflight"' in smoke, "smoke:voice_preflight_command")
    require(
        'command = "voice_actor_synthesize"' in smoke,
        "smoke:voice_synthesize_command",
    )
    require('command = "tts_preflight"' not in smoke, "smoke:legacy_tts_preflight")
    require('command = "synthesize"' not in smoke, "smoke:legacy_synthesize")
    require("canonical_bidirectional_id_en" in smoke, "smoke:translation_contract")


def extract_project_transformers_spec(pyproject: str) -> str:
    match = re.search(r'"transformers([^\"]*)"', pyproject)
    require(match is not None, "dependency:pyproject_transformers_missing")
    return match.group(1).strip()


def extract_lock_transformers(lock: str) -> tuple[str, str]:
    package = re.search(
        r'\[\[package\]\]\s*name = "transformers"\s*version = "([^"]+)"',
        lock,
        flags=re.MULTILINE,
    )
    require(package is not None, "dependency:lock_transformers_package_missing")
    metadata = re.search(
        r'\{ name = "transformers", specifier = "([^"]+)" \}',
        lock,
    )
    require(metadata is not None, "dependency:lock_transformers_spec_missing")
    return package.group(1), metadata.group(1)


def validate_dependency_lock(root: Path) -> None:
    worker_root = root / "EngineData/Backend/LocalWorker/WorkerRuntime"
    pyproject = read(worker_root / "pyproject.toml")
    lock = read(worker_root / "uv.lock")
    project_spec = extract_project_transformers_spec(pyproject)
    locked_version, locked_spec = extract_lock_transformers(lock)
    require(
        project_spec == CURRENT_TRANSFORMERS_SPEC,
        f"dependency:unexpected_project_spec:{project_spec}",
    )
    require(locked_spec == project_spec, "dependency:pyproject_lock_spec_mismatch")
    require(
        locked_version == CURRENT_TRANSFORMERS_VERSION,
        f"dependency:unexpected_locked_version:{locked_version}",
    )


def validate_active_tests(root: Path) -> None:
    tests = root / "EngineData/Backend/LocalWorker/WorkerRuntime/tests"
    active = "\n".join(
        read(path)
        for path in (
            tests / "test_worker_contract.py",
            tests / "test_translation_reliability.py",
            tests / "test_prepare_model_assets.py",
        )
    )
    require(MODEL_ID in active, "tests:milmmt_identity_missing")
    require("AutoModelForSeq2SeqLM" not in active, "tests:legacy_seq2seq_active")


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    validate_manifest(root)
    validate_provider(root)
    validate_smoke(root)
    validate_dependency_lock(root)
    validate_active_tests(root)
    print(
        json.dumps(
            {
                "ok": True,
                "model_id": MODEL_ID,
                "revision": REVISION,
                "transformers": CURRENT_TRANSFORMERS_VERSION,
                "target_pc_validation": "deferred",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"MiLMMT repository contract validation failed: {exc}", file=sys.stderr)
        raise
