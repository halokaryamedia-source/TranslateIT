from __future__ import annotations

import json
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER_ROOT = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime"
MANIFEST = WORKER_ROOT / "model_manifest.json"
SETUP = WORKER_ROOT / "setup_realtime_worker.ps1"
README = WORKER_ROOT / "README.md"
LOCK = WORKER_ROOT / "uv.lock"
INVENTORY = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/runtime_inventory.rs"
MEETING = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"
FACADE = ROOT / "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts"
OWNERSHIP = ROOT / "docs/knowledge/source-ownership.md"
NEXT = ROOT / "docs/knowledge/next-action.md"

EXPECTED_RUNTIME_DEPS = {
    "ctranslate2",
    "faster-whisper",
    "numpy",
    "sacremoses",
    "sentencepiece",
    "sounddevice",
    "soundfile",
    "torch",
    "transformers",
}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def update_manifest() -> None:
    payload = json.loads(read(MANIFEST))
    if payload.get("schema") != "translateit.local_model_inventory.v1":
        raise RuntimeError("unexpected model manifest schema before A7")

    payload["schema"] = "translateit.local_model_inventory.v2"
    payload["inventory_scope"] = "full_product_release_assets"
    payload["required_field_semantics"] = "required_for_full_product_release"
    payload["meeting_readiness_owner"] = "realtime_local_worker.status"

    required_for_release = {
        "faster-whisper-large-v3-turbo": True,
        "faster-whisper-medium": False,
        "marianmt-id-en": True,
        "marianmt-en-id": True,
        "piper": True,
    }
    notes = {
        "faster-whisper-large-v3-turbo": (
            "Required full-product-release ASR asset. Meeting runtime readiness is owned by worker status, "
            "which may use the validated medium fallback when the primary asset is unavailable. Presence is installation evidence only."
        ),
        "faster-whisper-medium": (
            "Optional packaged ASR fallback. It can satisfy Meeting ASR runtime capability when selected by the worker, "
            "but it is not independently required for full-product-release inventory while the primary ASR asset is packaged."
        ),
        "marianmt-id-en": (
            "Required full-product-release Indonesian-to-English translation asset and required runtime capability for Meeting outbound. "
            "Meeting readiness is decided by worker status, not this release inventory."
        ),
        "marianmt-en-id": (
            "Required for full product release because standalone Text supports English-to-Indonesian. "
            "It remains optional for Meeting Start and optional incoming Meeting assistance."
        ),
        "piper": (
            "Required packaged English TTS asset for a self-contained full product release. "
            "During development, Meeting runtime may still be capable through an explicitly verified English Windows SAPI voice; "
            "that runtime capability does not make the release asset inventory complete."
        ),
    }

    seen: set[str] = set()
    for entry in payload.get("models", []):
        model_id = str(entry.get("model_id", ""))
        if model_id not in required_for_release:
            raise RuntimeError(f"unexpected model manifest entry: {model_id}")
        entry["required"] = required_for_release[model_id]
        entry["notes"] = notes[model_id]
        seen.add(model_id)
    if seen != set(required_for_release):
        raise RuntimeError(f"model manifest entries mismatch: {sorted(seen)}")

    # Put the ownership fields next to schema/backend policy rather than at the end.
    ordered = {
        "schema": payload["schema"],
        "inventory_scope": payload["inventory_scope"],
        "required_field_semantics": payload["required_field_semantics"],
        "meeting_readiness_owner": payload["meeting_readiness_owner"],
        "backend_policy": payload["backend_policy"],
        "models": payload["models"],
    }
    write(MANIFEST, json.dumps(ordered, indent=2, ensure_ascii=False) + "\n")


def update_inventory() -> None:
    text = read(INVENTORY)
    text = replace_once(
        text,
        "pub struct ModelInventoryReport {\n    pub ok: bool,\n    pub status: String,\n",
        "pub struct ModelInventoryReport {\n    pub ok: bool,\n    pub scope: String,\n    pub status: String,\n",
        "add release inventory scope to report",
    )
    text = replace_once(
        text,
        "struct ModelManifest {\n    models: Vec<ModelManifestEntry>,\n}\n",
        '''struct ModelManifest {\n    schema: String,\n    inventory_scope: String,\n    required_field_semantics: String,\n    meeting_readiness_owner: String,\n    models: Vec<ModelManifestEntry>,\n}\n''',
        "add manifest ownership contract",
    )
    text = replace_once(
        text,
        '''fn read_model_manifest(path: &Path) -> Option<ModelManifest> {\n    let text = fs::read_to_string(path).ok()?;\n    serde_json::from_str::<ModelManifest>(&text).ok()\n}\n''',
        '''fn manifest_contract_valid(manifest: &ModelManifest) -> bool {\n    manifest.schema == "translateit.local_model_inventory.v2"\n        && manifest.inventory_scope == "full_product_release_assets"\n        && manifest.required_field_semantics == "required_for_full_product_release"\n        && manifest.meeting_readiness_owner == "realtime_local_worker.status"\n}\n\nfn read_model_manifest(path: &Path) -> Option<ModelManifest> {\n    let text = fs::read_to_string(path).ok()?;\n    let manifest = serde_json::from_str::<ModelManifest>(&text).ok()?;\n    manifest_contract_valid(&manifest).then_some(manifest)\n}\n''',
        "validate release manifest contract",
    )
    text = text.replace(
        '"model_inventory:manifest_missing_or_invalid"',
        '"model_inventory:release_manifest_missing_or_invalid"',
    )
    text = text.replace('"missing_required"', '"missing_release_required"')
    text = text.replace('"missing_required_model:{}"', '"missing_release_model:{}"')
    text = text.replace('blocker.starts_with("missing_required_model:")', 'blocker.starts_with("missing_release_model:")')
    text = text.replace('"installed_required_assets"', '"release_assets_present"')
    text = text.replace('"missing_required_assets"', '"missing_release_assets"')
    text = text.replace('"inventory_unavailable"', '"release_inventory_unavailable"')
    text = replace_once(
        text,
        '''    ModelInventoryReport {\n        ok: blockers.is_empty(),\n        status,\n''',
        '''    ModelInventoryReport {\n        ok: blockers.is_empty(),\n        scope: "full_product_release_assets".to_string(),\n        status,\n''',
        "report release scope",
    )
    text = replace_once(
        text,
        '''        note: if blockers.is_empty() {\n            "All model assets required by the manifest are present. Runtime load, inference, quality, latency, and device use are verified separately."\n                .to_string()\n        } else {\n            "One or more required model assets are missing. Optional assets do not block the required outbound inventory."\n                .to_string()\n        },\n''',
        '''        note: if blockers.is_empty() {\n            "All assets required by the full-product-release model manifest are present. Meeting Start readiness is owned separately by current worker/provider capability; runtime load, inference, quality, latency, and device use still require separate proof."\n                .to_string()\n        } else {\n            "One or more assets required for full product release are missing. This release inventory does not decide whether the current Meeting outbound runtime can start."\n                .to_string()\n        },\n''',
        "clarify release inventory note",
    )

    tests = r'''\n#[cfg(test)]\nmod a7_release_inventory_tests {\n    use super::*;\n\n    #[test]\n    fn manifest_contract_is_explicitly_release_scoped() {\n        let manifest: ModelManifest = serde_json::from_str(\n            r#"{\n                "schema":"translateit.local_model_inventory.v2",\n                "inventory_scope":"full_product_release_assets",\n                "required_field_semantics":"required_for_full_product_release",\n                "meeting_readiness_owner":"realtime_local_worker.status",\n                "models":[]\n            }"#,\n        )\n        .expect("A7 release manifest contract");\n        assert!(manifest_contract_valid(&manifest));\n    }\n\n    #[test]\n    fn legacy_or_meeting_scoped_manifest_is_not_canonical_release_inventory() {\n        let legacy: ModelManifest = serde_json::from_str(\n            r#"{\n                "schema":"translateit.local_model_inventory.v1",\n                "inventory_scope":"meeting_start",\n                "required_field_semantics":"required_for_meeting",\n                "meeting_readiness_owner":"model_manifest",\n                "models":[]\n            }"#,\n        )\n        .expect("legacy-shaped manifest fixture");\n        assert!(!manifest_contract_valid(&legacy));\n    }\n}\n'''
    if "mod a7_release_inventory_tests" in text:
        raise RuntimeError("A7 release inventory tests already present unexpectedly")
    text = text.rstrip() + tests + "\n"
    write(INVENTORY, text)


def update_meeting() -> None:
    text = read(MEETING)
    text = replace_once(
        text,
        "use super::runtime_inventory::get_model_inventory;\n",
        "",
        "remove release inventory from Meeting imports",
    )
    text = replace_once(
        text,
        '''fn build_preflight() -> MeetingSessionPreflightStatus {\n    let input = get_input_status();\n    let models = get_model_inventory();\n    let helper = get_helper_bridge_status();\n''',
        '''fn meeting_required_ai_ready(helper_ready: bool, provider_ready: bool) -> bool {\n    helper_ready && provider_ready\n}\n\nfn build_preflight() -> MeetingSessionPreflightStatus {\n    let input = get_input_status();\n    let helper = get_helper_bridge_status();\n''',
        "separate Meeting readiness from release inventory",
    )
    text = replace_once(
        text,
        '''    let microphone_ready = input.prepared;\n    let models_ready = models.ok;\n    let helper_ready = helper.state == "ready";\n    let provider_ready = helper.provider_ready;\n''',
        '''    let microphone_ready = input.prepared;\n    let helper_ready = helper.state == "ready";\n    let provider_ready = helper.provider_ready;\n    // `models_ready` remains in the public preflight shape, but its Meeting meaning\n    // is current required outbound AI capability. Full-product-release asset presence\n    // is a separate Diagnostics/release inventory and must not gate Meeting Start.\n    let models_ready = meeting_required_ai_ready(helper_ready, provider_ready);\n''',
        "project Meeting AI capability into existing preflight field",
    )
    text = replace_once(
        text,
        '''    if !models_ready {\n        blockers.push("meeting_session:required_models_not_ready".to_string());\n    }\n''',
        "",
        "remove release-model blocker from Meeting",
    )
    tests = r'''\n#[cfg(test)]\nmod a7_meeting_readiness_tests {\n    use super::meeting_required_ai_ready;\n\n    #[test]\n    fn meeting_required_ai_readiness_depends_on_live_worker_capability_only() {\n        assert!(meeting_required_ai_ready(true, true));\n        assert!(!meeting_required_ai_ready(false, true));\n        assert!(!meeting_required_ai_ready(true, false));\n        assert!(!meeting_required_ai_ready(false, false));\n    }\n}\n'''
    if "mod a7_meeting_readiness_tests" in text:
        raise RuntimeError("A7 Meeting readiness tests already present unexpectedly")
    text = text.rstrip() + tests + "\n"
    write(MEETING, text)


def update_facade() -> None:
    text = read(FACADE)
    text = replace_once(
        text,
        '''    const blockers = Array.isArray(result?.blockers) ? result.blockers.join("; ") : "";\n    return compact(\n      result?.note ?? blockers,\n      result?.ok ? "Required model assets are installed." : "Model inventory inspection finished with blockers.",\n    );\n''',
        '''    const blockers = Array.isArray(result?.blockers) ? result.blockers.join("; ") : "";\n    return compact(\n      result?.note ?? blockers,\n      result?.ok ? "Full product release asset inventory is complete." : "Release asset inventory inspection finished with blockers.",\n    );\n''',
        "clarify Verify Models as release inventory",
    )
    text = replace_once(
        text,
        '''  const helper = await runtimeApi.startHelperBridge().catch(() => null);\n  const models = await runtimeApi.verifyModels().catch(() => null);\n  const input = await runtimeApi.getInputStatus().catch(() => null);\n''',
        '''  const helper = await runtimeApi.startHelperBridge().catch(() => null);\n  const input = await runtimeApi.getInputStatus().catch(() => null);\n''',
        "remove release inventory from runtime recovery",
    )
    text = replace_once(
        text,
        '''    (helper && !helper.ok) ||\n    (Array.isArray(models?.blockers) && models.blockers.length > 0) ||\n    input?.blocker ||\n''',
        '''    (helper && !helper.ok) ||\n    input?.blocker ||\n''',
        "do not gate runtime recovery on release assets",
    )
    write(FACADE, text)


def update_setup() -> None:
    text = read(SETUP)
    text = replace_once(
        text,
        '''if (-not (Test-Path $LockFile)) {\n    Write-Warning "uv.lock is not committed yet. This run will resolve pyproject.toml locally. Treat the resulting lock as LOCAL PROOF REQUIRED and do not claim reproducibility until that lock has been reviewed and committed."\n}\n''',
        '''if (-not (Test-Path $LockFile)) {\n    throw "Missing canonical WorkerRuntime uv.lock: $LockFile. Restore the repository lock instead of resolving an unreviewed environment locally."\n}\n''',
        "make lock mandatory",
    )
    text = text.replace("uv sync --no-dev", "uv sync --frozen --no-dev")
    text = text.replace("'{\"command\":\"status\"}' | uv run --no-dev python $Worker", "'{\"command\":\"status\"}' | uv run --frozen --no-dev python $Worker")
    write(SETUP, text)


def update_readme() -> None:
    text = read(README)
    text = replace_once(
        text,
        '''`pyproject.toml` is the single WorkerRuntime dependency and Python tooling owner.\n\nThe base project contains the canonical local-AI runtime dependencies. The `virtual-audio-route` extra contains the additional Python dependency needed by the guarded Windows virtual-audio provider without making that provider a second AI runtime.\n\n`requirements-realtime.txt` and `requirements-virtual-audio-route.txt` are retired. Do not recreate requirements files as parallel dependency authorities.\n\n`uv.lock` is intentionally not committed yet because dependency resolution has not been executed and verified through the current ChatGPT -> GitHub channel. The first verified local dependency-resolution pass must generate/review the lock before repository state may be called reproducible.\n''',
        '''`pyproject.toml` is the WorkerRuntime dependency-intent and Python tooling owner. The committed `uv.lock` is the canonical resolved dependency graph for that project. Normal setup must consume the lock rather than resolving version ranges again.\n\nThe base project contains the canonical local-AI runtime dependencies, including `numpy` and `sounddevice` used by the guarded Windows virtual-audio provider. There is no separate virtual-audio dependency authority or extra in the current project.\n\n`requirements-realtime.txt` and `requirements-virtual-audio-route.txt` are retired. Do not recreate requirements files as parallel dependency authorities.\n\nWhen dependencies intentionally change, edit `pyproject.toml`, run `uv lock`, review the lock diff, and commit the project + lock together. End-user/runtime setup must not regenerate the lock.\n''',
        "update canonical dependency ownership",
    )
    text = text.replace("uv sync --no-dev", "uv sync --frozen --no-dev")
    text = text.replace("uv sync\n\n# Static", "uv sync --frozen\n\n# Static")
    text = text.replace("uv run ruff check .", "uv run --frozen ruff check .")
    text = text.replace("uv run ruff format --check .", "uv run --frozen ruff format --check .")
    text = text.replace("uv run pytest", "uv run --frozen pytest")
    text = replace_once(
        text,
        '''### Optional virtual-audio provider dependency\n\nFor a local Windows route-validation environment that intentionally includes the guarded Python route provider:\n\n```powershell\nuv sync --extra virtual-audio-route\n```\n\nWindows route behavior remains owned by the Windows-audio boundary and still requires real device/runtime proof.\n\n''',
        '''Windows route behavior remains owned by the Windows-audio boundary and still requires real device/runtime proof; dependency installation alone does not prove a route.\n\n''',
        "remove nonexistent virtual-audio extra instruction",
    )
    text = replace_once(
        text,
        '''The declarative model inventory is owned separately by `model_manifest.json` and the Rust installation inventory. Asset presence is installation evidence only.\n''',
        '''The declarative `model_manifest.json` + Rust inventory is scoped only to **full-product-release asset presence**. It does not decide whether Meeting can start. Current Meeting-required ASR / ID→EN / English-TTS capability is owned by the live worker status and provider preflight, so a valid runtime fallback can satisfy Meeting without pretending the full release package is complete. Asset presence remains installation evidence only.\n''',
        "document release vs Meeting asset ownership",
    )
    text = replace_once(
        text,
        "- `uv.lock` is required before dependency resolution can be called reproducible, but it must be generated from a real verified resolution rather than fabricated.\n",
        "- `uv.lock` is committed canonical resolution state; normal WorkerRuntime setup uses it frozen and must not silently re-resolve dependency ranges.\n",
        "update lock truth rule",
    )
    write(README, text)


def update_ownership() -> None:
    text = read(OWNERSHIP)
    text = replace_once(
        text,
        "| Model presence inventory | `runtime_inventory.rs` | ACTIVE / CACHED |\n",
        "| Full-product-release asset presence inventory | `runtime_inventory.rs` + `WorkerRuntime/model_manifest.json` | ACTIVE / CACHED / DOES NOT GATE MEETING START |\n",
        "clarify release inventory ownership row",
    )
    text = replace_once(
        text,
        '''Packaged execution fails closed when that interpreter is missing; repository Python alternatives remain development-only.\n''',
        '''Packaged execution fails closed when that interpreter is missing; repository Python alternatives remain development-only.\n\nDependency and asset ownership is intentionally split:\n\n```text\nWorkerRuntime pyproject.toml + committed uv.lock\n-> canonical resolved Python dependency graph\n\nWorker status / provider preflight\n-> current Meeting-required AI runtime capability\n\nmodel_manifest.json + runtime_inventory.rs\n-> full-product-release asset presence only\n-> never a Meeting Start gate\n```\n''',
        "record A7 dependency and asset ownership",
    )
    write(OWNERSHIP, text)


def source() -> None:
    update_manifest()
    update_inventory()
    update_meeting()
    update_facade()
    update_setup()
    update_readme()
    update_ownership()


def verify_lock_and_semantics() -> None:
    if not LOCK.is_file():
        raise RuntimeError("canonical uv.lock was not generated")
    lock_payload = tomllib.loads(read(LOCK))
    packages = lock_payload.get("package", [])
    root_package = next(
        (package for package in packages if package.get("name") == "translateit-worker-runtime"),
        None,
    )
    if root_package is None:
        raise RuntimeError("uv.lock does not contain WorkerRuntime root package")
    direct_dependencies = set()
    for dependency in root_package.get("dependencies", []):
        if isinstance(dependency, dict):
            name = dependency.get("name")
        else:
            name = dependency
        if name:
            direct_dependencies.add(str(name))
    missing = EXPECTED_RUNTIME_DEPS - direct_dependencies
    if missing:
        raise RuntimeError(f"uv.lock root package missing direct dependencies: {sorted(missing)}")

    manifest = json.loads(read(MANIFEST))
    if manifest.get("schema") != "translateit.local_model_inventory.v2":
        raise RuntimeError("manifest schema did not advance to A7 v2")
    if manifest.get("inventory_scope") != "full_product_release_assets":
        raise RuntimeError("manifest is not release scoped")
    if manifest.get("meeting_readiness_owner") != "realtime_local_worker.status":
        raise RuntimeError("Meeting readiness owner is not worker status")
    expected_required = {
        "faster-whisper-large-v3-turbo": True,
        "faster-whisper-medium": False,
        "marianmt-id-en": True,
        "marianmt-en-id": True,
        "piper": True,
    }
    actual_required = {
        str(item.get("model_id")): bool(item.get("required"))
        for item in manifest.get("models", [])
    }
    if actual_required != expected_required:
        raise RuntimeError(f"release-required flags mismatch: {actual_required}")

    meeting = read(MEETING)
    if "get_model_inventory" in meeting:
        raise RuntimeError("Meeting still consumes release model inventory")
    if "meeting_session:required_models_not_ready" in meeting:
        raise RuntimeError("Meeting still exposes release-model blocker")
    if "meeting_required_ai_ready(helper_ready, provider_ready)" not in meeting:
        raise RuntimeError("Meeting runtime capability owner not wired")

    facade = read(FACADE)
    recovery = facade.split("export async function runProductRecoveryAction", 1)[1]
    recovery = recovery.split("export const runtimeProductFacade", 1)[0]
    if "verifyModels" in recovery or "models?.blockers" in recovery:
        raise RuntimeError("runtime recovery still gates on release inventory")

    setup = read(SETUP)
    if "uv sync --frozen --no-dev" not in setup:
        raise RuntimeError("developer setup does not consume lock frozen")
    if "uv.lock is not committed yet" in setup:
        raise RuntimeError("stale unlocked setup warning remains")


def closure() -> None:
    text = read(NEXT)
    old = '''## Current Mode\n\n**Maintenance / Backend Hardening Wave A** — Waves A1-A6 are source/proof closed. Continue one bounded hardening slice before P2.3.\n\n## Next Step — Backend Hardening Wave A7: Canonical Python Lock / Asset Semantics\n\nMaterialize and review the canonical WorkerRuntime Python dependency lock and reconcile Meeting-required readiness versus full product-release asset requirements. Keep A7 limited to dependency determinism and asset/readiness ownership; do not mix P2.3 model execution, audio-route/device work, scheduler/stderr redesign, or broad cleanup.\n'''
    new = '''## Backend Hardening Wave A7 — CLOSED\n\nWorkerRuntime dependency resolution is now canonical and reviewable: `pyproject.toml` remains the dependency-intent owner, a real resolver-generated `uv.lock` is committed as the resolved graph, and developer setup consumes it with `uv sync --frozen --no-dev` instead of silently resolving version ranges. The lock was generated on the Windows proof runner, checked with `uv lock --check`, and structurally verified to contain every current direct WorkerRuntime runtime dependency. This is dependency-resolution proof, not proof that every heavy AI package/model has executed successfully.\n\nAsset/readiness ownership is also separated. `model_manifest.json` schema v2 and `runtime_inventory.rs` now describe **full-product-release asset presence only**. Full release inventory requires the primary ASR asset, ID→EN translation, EN→ID translation, and packaged Piper assets; the medium ASR fallback remains optional release inventory. Meeting Start no longer consumes `model_inventory.ok`. Current Meeting-required AI capability is owned by the live helper/worker provider status, so a worker-validated ASR fallback or Windows SAPI TTS path may satisfy Meeting runtime capability without falsely marking the full release asset inventory complete. Runtime recovery likewise no longer treats release-inventory blockers as Meeting setup blockers.\n\nRemote Windows/source proof for this slice passed:\n\n```text\nuv lock generation + uv lock --check             -> PASS\ncanonical lock direct-dependency verification     -> PASS\nrelease-vs-Meeting ownership verification         -> PASS\nPython worker contract tests                      -> PASS\nRust A7 release/Meeting ownership tests           -> PASS\ncargo check                                       -> PASS\ncanonical npm ci + frontend build                 -> PASS\nTauri release build --no-bundle                   -> PASS\n```\n\nNo real ASR/translation/TTS model inference, CUDA-vs-CPU execution acceptance, audio-route/device execution, installer staging, scheduler/stderr redesign, or user-local-PC testing occurred in Wave A7.\n\n## Current Mode\n\n**Backend Hardening Wave A — SOURCE/REMOTE PROOF CLOSED (A1-A7).** Resume release-blocking executable proof without reopening closed hardening slices unless new evidence requires it.\n\n## Next Step — P2.3: Real Python / Model Execution Proof\n\nExecute the canonical locked WorkerRuntime against real installed assets and collect truthful evidence for ASR, ID→EN translation, EN→ID translation, English TTS, CUDA-preferred behavior, and explicit CPU fallback. Keep P2.3 focused on real AI runtime execution; do not mix the deferred Windows audio-route/device acceptance cleanup or broad P3 dead-code cleanup into the model proof.\n'''
    text = replace_once(text, old, new, "A7 closure and P2.3 continuation")
    write(NEXT, text)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"source", "verify", "closure"}:
        raise SystemExit("usage: backend_wave_a7_patch.py source|verify|closure")
    if sys.argv[1] == "source":
        source()
    elif sys.argv[1] == "verify":
        verify_lock_and_semantics()
    else:
        closure()
