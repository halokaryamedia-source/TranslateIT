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
| Worker executable discovery | `bridge_paths.rs` | ACTIVE DEV-COMPATIBLE / INSTALLED METHOD UNRESOLVED |
| Model presence inventory | `runtime_inventory.rs` | ACTIVE / CACHED |
| Explicit model refresh | `runtime.rs::verify_models` | ACTIVE SETUP ACTION |
| Text translation | `text_translate.rs` -> helper -> worker | ACTIVE |
| Persisted settings | `engine/settings.rs`, `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE / SCHEMA V6 SMALL |
| Frontend settings type/defaults | `src/app/shared/types.ts`, `src/app/shared/state.ts` | ACTIVE / SCHEMA V6 SMALL |
| Installed/runtime paths | `engine/paths.rs`, `app_bootstrap.rs`, `bridge_paths.rs` | ACTIVE PATH FOUNDATION |
| Runtime logging used by settings/runtime | `engine/logging.rs` | ACTIVE |
| Shared command result/state | `engine/state.rs` | ACTIVE |
| Source validation | small validators under `scripts/` | ACTIVE / PRUNED |
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

Current callers are direct and bounded:

- Text direction reads/writes source and target language;
- First Setup reads/writes setup state/checkpoint and both device preferences;
- microphone capture reads the input-device preference;
- Meeting Sound capture reads the output-device preference;
- Meeting Settings reads/writes the same two device preferences.

The previous schema's extra fields are accepted only as ignored legacy JSON keys by the same Serde owner. Normal save output does not persist them. There is no migration registry, compatibility settings service, or second store.

## Runtime State

`engine/runtime_state.rs` owns current application Meeting/Mic-Test session state and generation authority. The old realtime-handoff snapshot/store and no-state `clear_runtime_handoff_state()` compatibility function are removed.

`meeting_session.rs` rollback/Stop no longer call `reset_live_pipeline_handoff_status()` or `clear_runtime_handoff_state()`. `commands/pipeline_handoff.rs` is removed. Real cleanup remains owned directly by the existing Meeting/audio/helper/consumer/session owners.

## Backend Contracts

`EngineData/Backend/RuntimeContracts/` is removed. The current worker does not load it, Tauri does not package/map it as a runtime resource, and current source validators do not consume it. Product requirements, current source interfaces, and the worker/model manifest are the relevant authorities.

## Normal Readiness

`runtimeProductFacade.loadProductRuntimeSnapshot()` intentionally reads settings, Meeting status, helper status, input status, and worker capability status when applicable. Heavy diagnostic/model/native probing is not normal polling work.

## Release Ownership

The initial controlled release keeps local sidecar placement under the existing path/setup owners. There is no separate SHA-256/checksum/revision identity owner and no replacement artifact registry.

The unresolved release/runtime boundary is **packaged worker execution**. `bridge_paths.rs` currently supports development-oriented worker Python candidates (`TRANSLATEIT_WORKER_PYTHON`, worker `.venv`, system `python`/`python3`, and Windows `py`). That is useful for development but is not yet a clean installed-user contract. The next Plan must choose the smallest packaged execution method and then make installed execution canonical without introducing a downloader/package manager or a second worker owner.
