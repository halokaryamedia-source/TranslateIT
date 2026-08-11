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
| Meeting authority | `commands/meeting_session.rs`, `engine/runtime_state.rs` | ACTIVE |
| Rust engine root | `engine/mod.rs` | ACTIVE / PRUNED TO CURRENT OWNERS |
| Physical microphone + Meeting Sound | `engine/audio/*` | ACTIVE |
| Mic Test lifecycle | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | ACTIVE / BOUNDED |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `virtual_audio_route_runtime.rs` | ACTIVE INTERNAL |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE |
| Model presence inventory | `runtime_inventory.rs` | ACTIVE / CACHED |
| Explicit model refresh | `runtime.rs::verify_models` | ACTIVE SETUP ACTION |
| Text translation | `text_translate.rs` -> helper -> worker | ACTIVE |
| Settings | `engine/runtime_settings.rs`, `engine/settings.rs`, `commands/settings.rs` | ACTIVE; inherited schema fields are next cleanup boundary |
| Installed/runtime paths | `engine/paths.rs`, `app_bootstrap.rs`, `bridge_paths.rs` | ACTIVE |
| Runtime logging still used by settings/runtime | `engine/logging.rs` | ACTIVE |
| Shared command result/state | `engine/state.rs` | ACTIVE |
| Source validation | small validators under `scripts/` | ACTIVE / PRUNED |
| Local Rust compile proof | `scripts/run_local_tauri_compile_check.mjs` | LOCAL-ONLY |

## Removed Rust Engine Graph

The following inherited responsibilities are no longer current engine owners and their Rust source has been removed from `New` after direct command/core reachability was reconciled:

- the entire `engine/adapters/` dry-run/planning/readiness/orchestration graph;
- History persistence and session chat;
- transcript/session-save planning;
- native inference/backend/CUDA candidate graph;
- old config/hardware/status/runtime-job/playback/model planners;
- empty `domain/` and `services/` scaffolding;
- old audio calibration/capture-plan/device-config/noise/preprocess/stream-build planning leaves.

ASR, translation, and TTS execution remain in the one persistent Python worker. Removing the Rust planning/inference candidates did not create a replacement runtime.

## Runtime State

`engine/runtime_state.rs` now owns only current application Meeting/Mic-Test session state and generation authority. The old realtime-handoff snapshot/store has been removed. One no-state `clear_runtime_handoff_state()` compatibility boundary remains temporarily because current Meeting rollback/Stop calls it; it owns no data and should be removed together with those direct callers rather than replaced by another service.

`engine/capture_lifecycle.rs` is Mic Test only. Start is blocked while another session owns the microphone. Stop refuses to clear a Meeting-owned session.

## Backend Contracts

`EngineData/Backend/RuntimeContracts/` is removed. The current worker does not load it, Tauri does not package/map it as a runtime resource, and the current source validators do not consume it. Product requirements, current source interfaces, and the worker/model manifest remain the relevant authorities instead of duplicate JSON architecture manifests.

## Normal Readiness

`runtimeProductFacade.loadProductRuntimeSnapshot()` intentionally reads settings, Meeting status, helper status, input status, and worker capability status when applicable. Heavy diagnostic/model/native probing is not normal polling work.

## Release Ownership

The initial controlled release keeps local sidecar placement under the existing path/setup owners. There is no SHA-256/checksum/revision identity owner and no replacement artifact registry.

## Remaining Cleanup Rule

Persisted settings are the next compatibility boundary. Remove obsolete fields only through the existing settings owner with a bounded schema migration/fallback strategy; do not preserve removed product concepts forever merely for old JSON compatibility, and do not create a second settings store.
