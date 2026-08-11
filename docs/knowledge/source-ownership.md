# TranslateIT — Source Ownership

This map points to current semantic owners. File existence alone does not make a capability active.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` | ACTIVE |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / COMPACT |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / SINGLE ENTRY |
| Product shell/controller | `src/app/simple-launcher/SimpleLauncherController.ts` | ACTIVE |
| Cross-view Meeting + safe close | `src/app/simple-launcher/GlobalMeetingShell.ts` | ACTIVE |
| Live transcript presentation | `src/app/simple-launcher/MeetingLiveActivityPresentation.ts` | ACTIVE |
| Product readiness/action projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / LIGHTWEIGHT |
| Frontend Tauri bridge | `src/app/bridge/runtimeApi.ts` | ACTIVE / PRUNED |
| Tauri invoke registration | `src-tauri/src/commands/registry.rs` | ACTIVE / PRUNED |
| Meeting authority | `commands/meeting_session.rs`, `engine/runtime_state.rs` | ACTIVE / HANDOFF TOMBSTONES REMOVED |
| Rust engine root | `engine/mod.rs` | ACTIVE / PRUNED TO CURRENT OWNERS |
| Physical microphone + Meeting Sound | `engine/audio/*` | ACTIVE |
| Mic Test lifecycle | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | ACTIVE / BOUNDED |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `virtual_audio_route_runtime.rs` | ACTIVE INTERNAL |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE |
| Installed worker interpreter path | `engine/paths.rs`, `commands/bridge_paths.rs` | SOURCE ALIGNED: `LocalWorker/PythonRuntime/python.exe` |
| Development interpreter fallback | `commands/bridge_paths.rs` | VERIFIED REPOSITORY DEVELOPMENT ONLY |
| Meeting provider Python process | `commands/virtual_audio_route_runtime.rs` | ACTIVE / REUSES WORKER INTERPRETER RESOLVER |
| Worker Python dependency set | `WorkerRuntime/pyproject.toml` | ACTIVE / `sounddevice` IS RUNTIME DEPENDENCY |
| Model presence inventory | `runtime_inventory.rs` | ACTIVE / CACHED |
| Explicit model refresh | `runtime.rs::verify_models` | ACTIVE SETUP ACTION |
| Text translation | `text_translate.rs` -> helper -> worker | ACTIVE |
| Persisted settings | `engine/settings.rs`, `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE / SCHEMA V6 SMALL |
| Frontend settings type/defaults | `src/app/shared/types.ts`, `src/app/shared/state.ts` | ACTIVE / SCHEMA V6 SMALL |
| Installed/runtime roots | `engine/paths.rs`, `app_bootstrap.rs` | ACTIVE PATH FOUNDATION |
| Runtime logging used by settings/runtime | `engine/logging.rs` | ACTIVE |
| Shared command result/state | `engine/state.rs` | ACTIVE |
| Source validation | small validators under `scripts/` | ACTIVE / PRUNED |
| Package/path source preflight | `scripts/validate_tauri_package_preflight.mjs` | ACTIVE / PACKAGED INTERPRETER OWNERSHIP GUARDED |
| Local Rust compile proof | `scripts/run_local_tauri_compile_check.mjs` | LOCAL-ONLY |

## Removed Rust Engine Graph

The inherited adapter/planning/readiness/orchestration tree, History persistence, session chat/save, transcript-session planning, native inference/backend/CUDA candidates, old status/runtime-job/model/playback planners, empty domain/services scaffolding, obsolete audio planning leaves, and final no-state handoff compatibility path are removed from `New`.

ASR, translation, and TTS execution remain in the one persistent Python worker. Removing Rust planning/inference candidates did not create a replacement runtime.

## Persisted Settings Ownership

`engine/settings.rs` is the single schema/deserialization/sanitization owner. Current persisted shape is:

```text
schema_version = 6
source_language
target_language
meeting_setup_state
meeting_setup_checkpoint
audio.input_device_id
audio.output_device_id
```

The previous schema's extra fields are accepted only as ignored legacy JSON keys by the same Serde owner. Normal save output does not persist them. There is no migration registry, compatibility settings service, or second store.

## Runtime State

`engine/runtime_state.rs` owns current application Meeting/Mic-Test session state and generation authority. The old realtime-handoff snapshot/store and no-state cleanup tombstones are removed. Real cleanup remains owned directly by existing Meeting/audio/helper/consumer/session owners.

## Packaged Worker Ownership

Canonical installed layout:

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/
│  ├─ realtime_local_worker.py
│  ├─ virtual_audio_route_provider.py
│  └─ model_manifest.json
└─ PythonRuntime/
   ├─ python.exe
   ├─ embedded CPython runtime files
   └─ vendored Python packages
```

`engine/paths.rs` owns both `worker_runtime_dir` and `python_runtime_dir`. In packaged Tauri context, `bridge_paths.rs` resolves exactly `PythonRuntime/python.exe`. If that file is absent, packaged mode fails closed; it does not try an environment override, `.venv`, system `python`/`python3`, or Windows `py`.

Those development alternatives remain available only when the existing repository-development markers were verified. Their `--version` probing is development-only. Packaged route delivery checks only the canonical `python.exe` file and therefore does not add a Python probe process per utterance.

`helper_bridge.rs` and `virtual_audio_route_runtime.rs` both use `resolve_worker_python_command()`. The provider script itself resolves from the same `WorkerRuntime` root. The old separate `TRANSLATEIT_PYTHON`/system-Python route path is removed.

`pyproject.toml` now declares `sounddevice` with the normal worker dependencies because current Meeting Microphone provider execution imports it. Models remain under `RuntimeAssets`; pip/uv are not installed or run for end users.

A frozen worker executable, copied `.venv`, downloader, package manager, hash/identity framework, dependency registry, or second worker owner is not part of the initial release.

## Backend Contracts

`EngineData/Backend/RuntimeContracts/` is removed. The current worker does not load it, Tauri does not package/map it as a runtime resource, and current source validators do not consume it. Product requirements, current source interfaces, and the worker/model manifest are the relevant authorities.

## Normal Readiness

`runtimeProductFacade.loadProductRuntimeSnapshot()` intentionally reads settings, Meeting status, helper status, input status, and worker capability status when applicable. Heavy diagnostic/model/native probing is not normal polling work.

## Release Ownership

The initial controlled release keeps local sidecar placement under the existing path/setup owners. There is no separate SHA-256/checksum/revision identity owner and no replacement artifact registry.

Packaged interpreter **source ownership is aligned**. The remaining release boundary is now concrete payload proof: create the private `PythonRuntime` bytes locally, verify worker/provider imports and real translation outside the repository, then wire tested payload placement into Tauri/NSIS. Source alignment alone is not installed-runtime proof.
