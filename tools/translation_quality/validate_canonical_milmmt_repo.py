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
CURRENT_TRANSFORMERS_VERSION = "4.57.6"
CURRENT_TRANSFORMERS_SPEC = "==4.57.6"
CURRENT_TOKENIZERS_VERSION = "0.22.2"
TOKENIZERS_SDIST_SHA256 = "473b83b915e547aa366d1eee11806deaf419e17be16310ac0a14077f1e28f917"
LEGACY_MARKERS = (
    "m2m100-418m",
    "facebook/m2m100_418m",
    "AutoModelForSeq2SeqLM",
    "forced_bos_token_id",
    "marianmt-id-en",
    "marianmt-en-id",
    "Helsinki-NLP/opus-mt-id-en",
    "Helsinki-NLP/opus-mt-en-id",
)
WORKFLOW_ACTIVE_LEGACY_MARKERS = (
    "Helsinki-NLP/opus-mt-id-en",
    "Helsinki-NLP/opus-mt-en-id",
    "AutoModelForSeq2SeqLM",
    "forced_bos_token_id",
    "verify-optimized-marian",
    "r32-marian",
)


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


def validate_worker(root: Path) -> None:
    worker_root = root / "EngineData/Backend/LocalWorker/WorkerRuntime"
    entrypoint = read(worker_root / "realtime_local_worker.py")
    base = read(worker_root / "realtime_local_worker_base.py")
    provider = read(worker_root / "milmmt_translation_provider.py")
    common = read(worker_root / "worker_runtime_common.py")
    io_runtime = read(worker_root / "worker_io_runtime.py")
    acquisition = read(worker_root / "prepare_model_assets.py")

    require('with_name("realtime_local_worker_base.py")' in entrypoint, "entrypoint:base_missing")
    require(
        "milmmt_translation_provider.install(globals())" in entrypoint,
        "entrypoint:provider_not_installed",
    )
    require("realtime_local_worker_core.py" not in entrypoint, "entrypoint:legacy_core_reference")
    for marker in LEGACY_MARKERS:
        require(marker not in base, f"worker_base:legacy_marker:{marker}")
        require(marker not in common, f"worker_common:legacy_marker:{marker}")
        require(marker not in io_runtime, f"worker_io:legacy_marker:{marker}")
    require(HF_MODEL_ID in provider and REVISION in provider, "provider:identity")
    require("AutoModelForCausalLM" in provider, "provider:not_causal_lm")
    require("AutoModelForSeq2SeqLM" not in provider, "provider:legacy_seq2seq")
    require("forced_bos_token_id" not in provider, "provider:forced_bos")
    require("do_sample=False" in provider, "provider:not_deterministic")
    require("prompt_tokens:" in provider, "provider:continuation_slice_missing")
    require(".translateit_model_revision" in provider, "provider:revision_marker_missing")
    require(".translateit_model_revision" in acquisition, "acquisition:revision_marker_missing")
    require(not (worker_root / "realtime_local_worker_core.py").exists(), "worker:legacy_core_exists")
    require(
        not (worker_root / "tests/_test_worker_contract_core.py").exists(),
        "tests:legacy_core_contract_exists",
    )


def extract_project_transformers_spec(pyproject: str) -> str:
    match = re.search(r'"transformers([^\"]*)"', pyproject)
    require(match is not None, "dependency:pyproject_transformers_missing")
    return match.group(1).strip()


def extract_lock_package_version(lock: str, name: str) -> str:
    package = re.search(
        rf'\[\[package\]\]\s*name = "{re.escape(name)}"\s*version = "([^"]+)"',
        lock,
        flags=re.MULTILINE,
    )
    require(package is not None, f"dependency:lock_{name}_package_missing")
    return package.group(1)


def extract_lock_transformers_spec(lock: str) -> str:
    metadata = re.search(r'\{ name = "transformers", specifier = "([^"]+)" \}', lock)
    require(metadata is not None, "dependency:lock_transformers_spec_missing")
    return metadata.group(1)


def validate_dependency_lock(root: Path) -> None:
    worker_root = root / "EngineData/Backend/LocalWorker/WorkerRuntime"
    pyproject = read(worker_root / "pyproject.toml")
    lock = read(worker_root / "uv.lock")
    project_spec = extract_project_transformers_spec(pyproject)
    locked_transformers = extract_lock_package_version(lock, "transformers")
    locked_tokenizers = extract_lock_package_version(lock, "tokenizers")
    locked_spec = extract_lock_transformers_spec(lock)
    require(project_spec == CURRENT_TRANSFORMERS_SPEC, f"dependency:unexpected_project_spec:{project_spec}")
    require(locked_spec == project_spec, "dependency:pyproject_lock_spec_mismatch")
    require(
        locked_transformers == CURRENT_TRANSFORMERS_VERSION,
        f"dependency:unexpected_transformers:{locked_transformers}",
    )
    require(
        locked_tokenizers == CURRENT_TOKENIZERS_VERSION,
        f"dependency:unexpected_tokenizers:{locked_tokenizers}",
    )
    require(TOKENIZERS_SDIST_SHA256 in lock, "dependency:tokenizers_sdist_hash_missing")


def validate_release_boundary(root: Path) -> None:
    app_root = root / "EngineData/Frontend/RustApp"
    stage = read(app_root / "scripts/stage_release_inputs.ps1")
    optimizer = read(app_root / "scripts/optimize_release_payload.py")
    license_stager = read(app_root / "scripts/stage_release_license_material.py")
    payload_validator = read(app_root / "scripts/validate_release_payload.mjs")
    revision_validator = read(app_root / "scripts/validate_release_model_revisions.mjs")
    package_contract = read(app_root / "scripts/validate_release_package_contract.mjs")
    release_config = read(app_root / "src-tauri/tauri.release.conf.json")
    release_workflow = read(root / ".github/workflows/release-payload-verify.yml")
    efficiency_workflow = read(root / ".github/workflows/release-efficiency-profile.yml")

    require("prepare_model_assets.py" in stage, "release:manifest_acquirer_missing")
    require(MODEL_ID in stage and REVISION in stage, "release:milmmt_stage_identity")
    require("realtime_local_worker_base.py" in release_config, "release:base_not_packaged")
    require("milmmt_translation_provider.py" in release_config, "release:provider_not_packaged")
    require("worker_runtime_common.py" in release_config, "release:common_not_packaged")
    require("worker_io_runtime.py" in release_config, "release:io_not_packaged")
    require(MODEL_ID in revision_validator and REVISION in revision_validator, "release:revision_validator_identity")
    require(MODEL_ID in package_contract, "release:package_contract_milmmt_missing")
    require("validate_release_model_revisions.mjs" in release_workflow, "release:workflow_revision_gate_missing")
    require("validate_canonical_milmmt_repo.py" in efficiency_workflow, "release:efficiency_contract_missing")

    # Runtime/staging/config owners must not carry retired translation implementations.
    for label, body in (
        ("stage", stage),
        ("optimizer", optimizer),
        ("release_config", release_config),
    ):
        for marker in LEGACY_MARKERS:
            require(marker not in body, f"release:{label}:legacy_marker:{marker}")

    # Workflows may name old asset folders only in explicit negative guards. Disallow
    # actual old model sources/APIs/benchmark paths instead of rejecting those guards.
    workflow_text = "\n".join((release_workflow, efficiency_workflow))
    for marker in WORKFLOW_ACTIVE_LEGACY_MARKERS:
        require(marker not in workflow_text, f"release:workflow_active_legacy_marker:{marker}")

    require("tokenizers-0.22.2.dist-info" in license_stager, "release:tokenizers_license_stager_version")
    require(TOKENIZERS_SDIST_SHA256 in license_stager, "release:tokenizers_license_stager_hash")
    require("tokenizers-0.21.4" not in license_stager, "release:legacy_tokenizers_license_stager")
    require("tokenizers-0.22.2.dist-info" in payload_validator, "release:tokenizers_payload_validator_version")
    require(TOKENIZERS_SDIST_SHA256 in payload_validator, "release:tokenizers_payload_validator_hash")
    require("tokenizers-0.21.4" not in payload_validator, "release:legacy_tokenizers_payload_validator")


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
    require("from transformers import AutoModelForSeq2SeqLM" not in active, "tests:legacy_seq2seq_import_active")
    require("m2m100-418m" not in active, "tests:legacy_model_identity_active")


def validate_current_authority_docs(root: Path) -> None:
    context = read(root / "CONTEXT.md")
    runtime_readme = read(root / "EngineData/Backend/LocalWorker/WorkerRuntime/README.md")
    next_action = read(root / "docs/knowledge/next-action.md")
    for label, body in (
        ("context", context),
        ("runtime_readme", runtime_readme),
        ("next_action", next_action),
    ):
        require("4.57.6" in body, f"docs:{label}:transformers_authority_missing")
    require(
        "frozen canonical WorkerRuntime remains on 4.50.0" not in context,
        "docs:context:stale_450_authority",
    )
    require(
        "Transformers 4.50.0 in the frozen canonical lock" not in runtime_readme,
        "docs:runtime_readme:stale_450_authority",
    )


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    validate_manifest(root)
    validate_worker(root)
    validate_dependency_lock(root)
    validate_release_boundary(root)
    validate_active_tests(root)
    validate_current_authority_docs(root)
    print(
        json.dumps(
            {
                "ok": True,
                "model_id": MODEL_ID,
                "revision": REVISION,
                "transformers": CURRENT_TRANSFORMERS_VERSION,
                "tokenizers": CURRENT_TOKENIZERS_VERSION,
                "worker_architecture": "translation_neutral_base_plus_milmmt_provider",
                "release_packaging": "canonical_manifest_owned",
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
