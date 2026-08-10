# TranslateIT — Source Ownership

This map points to current semantic owners. File existence alone does not make a capability active.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` | ACTIVE |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / COMPACT |
| Frontend module entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / SINGLE ENTRY |
| Product shell/controller | `src/app/simple-launcher/SimpleLauncherController.ts` | ACTIVE |
| Cross-view Meeting + safe close | `src/app/simple-launcher/GlobalMeetingShell.ts` | ACTIVE |
| Live transcript presentation | `src/app/simple-launcher/MeetingLiveActivityPresentation.ts` | ACTIVE |
| Product readiness/action projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / LIGHTWEIGHT |
| Frontend Tauri bridge | `src/app/bridge/runtimeApi.ts` | ACTIVE / PRUNED |
| Tauri invoke registration | `src-tauri/src/commands/registry.rs` | ACTIVE / PRUNED |
| Meeting authority | `commands/meeting_session.rs`, `engine/runtime_state.rs` | ACTIVE |
| Physical microphone + Meeting Sound | `engine/audio/*` | ACTIVE |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `virtual_audio_route_runtime.rs` | ACTIVE INTERNAL |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE |
| Model presence inventory | `runtime_inventory.rs` | ACTIVE / CACHED |
| Explicit model refresh | `runtime.rs::verify_models` | ACTIVE SETUP ACTION |
| Text translation | `text_translate.rs` -> helper -> worker | ACTIVE |
| Settings | `engine/runtime_settings.rs`, `engine/settings.rs`, `commands/settings.rs` | ACTIVE; schema still contains inherited fields pending later cleanup |
| Mic Test | `runtime_capture.rs` | ACTIVE / TWO WRAPPERS |
| Meeting cleanup reset hook | `pipeline_handoff.rs` | ACTIVE / MINIMAL |
| Installed/runtime paths | `engine/paths.rs`, `app_bootstrap.rs`, `bridge_paths.rs` | ACTIVE |
| Source validation | four small source/preflight validators under `scripts/` | ACTIVE / PRUNED |
| Local Rust compile proof | `scripts/run_local_tauri_compile_check.mjs` | LOCAL-ONLY |

## Frontend Surface

`index.html` loads only `src/main.ts`. Audio Studio no longer has a second module entry, retry timer, theme injector, or frontend bridge. History/Chat, attachment/document helpers, old realtime-segment scoring/reducers, direct virtual-route APIs, and duplicate runtime bridge files are removed from the current frontend tree.

Normal Settings owns only `Meeting` and `Advanced`. Advanced may open a bounded Diagnostics presentation based on current helper status, explicit model verification, and recent command errors. It is not a manual worker/pipeline laboratory.

## Production Command Surface

The registry exposes only commands required by current Meeting/Text/setup behavior. Removed command families are not kept as compatibility endpoints.

Route detection/delivery remains an internal Meeting dependency. The frontend does not receive direct commands for choosing, preparing, or dispatching old route stubs/professional-readiness flows.

## Normal Readiness

`runtimeProductFacade.loadProductRuntimeSnapshot()` intentionally reads settings, Meeting status, helper status, input status, and worker capability status when applicable. Full status bundles, runtime diagnostics, model-inventory scans, and native GPU probing are not normal polling dependencies.

## Validation Ownership

The old auto-test registry, deterministic fixtures, scenario matrices, report generators, feature-specific UI validators, and branch-era validation profiles are removed. Keep validation proportional to the small product and prefer real type/compile/runtime proof when those are the actual claims.

## Release Ownership

The initial controlled release keeps local sidecar placement under the existing path/setup owners. There is no separate SHA-256/checksum/revision identity owner and no replacement artifact registry.

## Remaining Internal Cleanup

The next reachability boundary is deeper Rust `engine/` source. `engine/mod.rs` still declares inherited modules that may be dead after command-surface pruning and still carries blanket dead-code allowance. Prune them only from proven leaf groups toward active audio/session/runtime owners.
