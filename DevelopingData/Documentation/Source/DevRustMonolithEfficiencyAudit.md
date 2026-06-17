# Dev-Rust Monolith and Efficiency Audit

Branch: `Dev-Rust`

## Scope

This audit maps files that are efficient, acceptable, or candidates for future refactor. It focuses on Engine and Launcher compatibility after Audio Studio integration.

No local build, runtime test, or type check was executed in this environment.

## Rating rules

- Low risk: single responsibility or small aggregator, generally under 150 lines.
- Medium risk: multiple related responsibilities, generally 150-300 lines, but still readable.
- High risk: broad responsibilities, generally over 300 lines, or combines UI state, runtime calls, rendering, and event orchestration.

## Summary

The repository is not fully free of monolith risk yet.

The main remaining monolith candidate is:

```text
EngineData/LauncherApp/RustApp/src/app/launcher/launcherController.ts
```

Most new Audio Studio files are modular enough for the current non-local stage.

## File map

| Area | File | Status | Reason | Recommended action |
| --- | --- | --- | --- | --- |
| Launcher shell controller | `launcherController.ts` | High risk | One class owns warmup, runtime rendering, chat, text submit, attachment ingest, recording toggle, audio check, settings rendering, developer diagnostics, and event binding. | Split into controller modules by feature. |
| Launcher settings views | `settingsViews.ts` | Medium risk | View-only file, but it owns General, Audio, Translate, and Developer page rendering together. | Split per settings page after local build is available. |
| Audio command gateway | `src-tauri/src/commands/audio.rs` | Medium risk | Command aggregator exposes many audio commands, but most logic is delegated to engine modules. | Split into `audio_devices.rs`, `audio_pipeline.rs`, `audio_quality.rs`, and `audio_calibration.rs`. |
| Audio Studio main UI | `audioStudioBinding.ts` | Medium risk | Owns UI render, UI state update, and API calls for the Audio Studio panel. Still acceptable because state and API wrapper are separated. | Later split into view, controller, and action binding files. |
| Audio Studio advanced UI | `audioStudioAdvancedBinding.ts` | Low-medium risk | Advanced UI is isolated and observer wiring is guarded. | Keep for now. |
| Audio Studio state | `audioStudioState.ts` | Low risk | Pure state/model definitions and helper factory functions. | Keep. |
| Audio Studio advanced state | `audioStudioAdvancedState.ts` | Low risk | Pure advanced mode/control definitions. | Keep. |
| Audio Studio API | `audioStudioApi.ts` | Low risk | Thin API wrapper around Tauri commands. | Keep. |
| Audio Studio Rust command stubs | `commands/audio_studio.rs` | Low risk | Small placeholder command module. | Keep. |
| Engine module root | `engine/mod.rs` | Low risk | Module index only; no large business logic. | Keep. |
| Tauri app entry | `src-tauri/src/main.rs` | Low risk | Thin invoke-handler registration. | Keep. |

## Recommended refactor plan

### Phase 1: LauncherController split

Split `launcherController.ts` into:

```text
launcherController.ts              // shell orchestration only
launcherRuntimeController.ts       // renderRuntime, warmup, hardware refresh
launcherChatController.ts          // sessions, submit text, chat collection
launcherAttachmentController.ts    // attachment validation, ingest, drop zone
launcherCaptureController.ts       // start/stop recording, input check
launcherSettingsController.ts      // settings tab switching and save/reset
launcherDeveloperController.ts     // developer diagnostic and log rendering
```

Goal: keep each file close to 100-180 lines and keep `launcherController.ts` as a thin coordinator.

### Phase 2: Settings view split

Split `settingsViews.ts` into:

```text
generalSettingsView.ts
audioSettingsView.ts
translateSettingsView.ts
developerSettingsView.ts
settingsViewShared.ts
```

Goal: avoid a single view file becoming a UI dumping ground.

### Phase 3: Audio command split

Split `src-tauri/src/commands/audio.rs` into:

```text
audio_devices.rs
audio_capture.rs
audio_pipeline.rs
audio_quality.rs
audio_calibration.rs
audio.rs               // optional re-export or compatibility façade
```

Goal: keep command groups aligned with engine modules.

### Phase 4: Audio Studio controller split

Split `audioStudioBinding.ts` into:

```text
audioStudioView.ts
audioStudioActions.ts
audioStudioController.ts
audioStudioBinding.ts      // thin entry binding
```

Goal: keep the new Audio Studio module from becoming a second launcher monolith.

## Priority order

1. `launcherController.ts` first.
2. `audio.rs` second.
3. `settingsViews.ts` third.
4. `audioStudioBinding.ts` fourth.

## Current safety decision

No risky refactor was performed during this audit because the environment cannot run `npm run build`, `npm run typecheck`, or `cargo check`.

The safe next step is to do Phase 1 in a dedicated branch/pass, then run local PC checks immediately after.
