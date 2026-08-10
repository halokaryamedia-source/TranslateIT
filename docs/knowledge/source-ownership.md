# TranslateIT — Source Ownership

This file maps current semantic responsibilities to their canonical source owners. A file can exist without being an active product owner.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope / initial core | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` | ACTIVE |
| Stable project context | `CONTEXT.md` | ACTIVE |
| Continuation / next bounded task | `docs/knowledge/next-action.md` | ACTIVE |
| Durable decision reasoning | `docs/knowledge/decision-log.md` | ACTIVE; older decisions may be superseded by later policy |
| Desktop entrypoint | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE |
| Product UI controller | `src/app/simple-launcher/SimpleLauncherController.ts` | ACTIVE |
| Cross-view Meeting / safe close | `src/app/simple-launcher/GlobalMeetingShell.ts` | ACTIVE |
| Live Meeting transcript presentation | `src/app/simple-launcher/MeetingLiveActivityPresentation.ts` | ACTIVE |
| Product runtime projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / LIGHTWEIGHT |
| Frontend Tauri bridge | `src/app/bridge/runtimeApi.ts` | ACTIVE but contains stale compatibility methods pending dead-source cleanup |
| Tauri command registration | `src-tauri/src/commands/registry.rs` | ACTIVE / PRUNED |
| Meeting lifecycle/session authority | `src-tauri/src/commands/meeting_session.rs` + `engine/runtime_state.rs` | ACTIVE |
| Mic Test capture command surface | `src-tauri/src/commands/runtime_capture.rs` | ACTIVE / MINIMAL |
| Internal Meeting pipeline reset hook | `src-tauri/src/commands/pipeline_handoff.rs` | ACTIVE / MINIMAL |
| Model presence inventory | `src-tauri/src/commands/runtime_inventory.rs` | ACTIVE / CACHED |
| Explicit model verification command | `src-tauri/src/commands/runtime.rs::verify_models` | ACTIVE |
| Physical microphone / Meeting Sound capture | `src-tauri/src/engine/audio/*` | ACTIVE |
| Meeting virtual output route | `commands/virtual_audio_route_runtime.rs`, `commands/virtual_mic_route.rs` | ACTIVE INTERNAL OWNERS used by Meeting |
| Local AI execution | `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py` | ACTIVE |
| Runtime model metadata | `EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json` | ACTIVE; no checksum/revision identity requirement |
| Runtime/user path discovery | `src-tauri/src/engine/paths.rs`, `app_bootstrap.rs` | ACTIVE |
| Settings persistence | `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE |
| Text translation | `commands/text_translate.rs` -> local worker | ACTIVE |
| Explicit Advanced diagnostics | `commands/diagnostics.rs::get_runtime_diagnostics` | ACTIVE / MINIMAL |

## Disconnected From Initial Core

The following capabilities are not normal product owners and are not registered in the production Tauri invoke surface:

- Audio Studio;
- History/Saved and Chat persistence commands;
- development ASR/pipeline seed, prepare, dispatch, and smoke commands;
- professional-readiness orchestration;
- manual virtual-route developer commands;
- model setup and native GPU-policy commands;
- audio-evidence commands;
- generic capture/helper handoff commands;
- frontend startup trace mirroring into Rust.

Their source files may still exist temporarily. Existence does not make them active. They must not be used to justify new product behavior.

## Normal Readiness Ownership

`runtimeProductFacade.loadProductRuntimeSnapshot()` is the normal frontend readiness projection. It intentionally does not request full Diagnostics, model inventory, GPU/native-backend policy, or status bundles on each refresh.

Required model-file presence remains part of Meeting preflight through the existing inventory owner, but `runtime_inventory.rs` caches the report for normal status reads. Explicit Verify Models is the refresh boundary.

## Initial Release Ownership

The existing project/runtime path owner remains responsible for placing and discovering the local sidecar runtime. Initial release does not have a separate payload-hash/checksum/revision identity owner.

Do not create one. The controlled prepared payload plus deterministic Setup placement is the current boundary. SHA-256/checksum/revision metadata is not a prerequisite for initial release work.

## Ownership Rules

1. Do not create a second lifecycle/session/readiness/model-installation owner to simplify a caller.
2. Deferred source must not be reactivated merely because its files still exist.
3. Optional incoming failure must not become required outbound failure.
4. Normal status/readiness polling must remain cheap; heavy diagnostics belong behind explicit diagnostic/setup actions.
5. Dead source deletion requires direct reachability confirmation; broad speculative refactors remain out of scope.
