# Dev-Rust Monolith and Efficiency Audit

Branch: `Dev-Rust`

## Scope

This audit maps files that are efficient, acceptable, or candidates for future refactor. It focuses on Engine and Launcher compatibility after Audio Studio integration and the first repository-side refactor pass.

No local build, runtime test, or type check was executed in this environment.

## Rating rules

- Low risk: single responsibility or small aggregator, generally under 150 lines.
- Medium risk: multiple related responsibilities, generally 150-300 lines, but still readable.
- High risk: broad responsibilities, generally over 300 lines, or combines UI state, runtime calls, rendering, and event orchestration.

## Current summary

The repository is improved but not mathematically free of monolith risk yet.

The first refactor pass reduced `launcherController.ts` by extracting:

```text
launcherTextRules.ts
launcherLanguageRules.ts
launcherAttachmentRules.ts
launcherDeveloperLog.ts
launcherEventBindings.ts
```

`launcherController.ts` is no longer responsible for text limit logic, language rule definitions, attachment rule definitions, developer log row composition, or raw DOM event binding.

## File map after refactor pass

| Area | File | Status | Reason | Recommended action |
| --- | --- | --- | --- | --- |
| Launcher shell controller | `launcherController.ts` | Medium-high risk | Still coordinates runtime, chat, settings, recording, and warmup, but pure rules and event binding have been extracted. | Next split: runtime/chat/capture/settings controllers. |
| Launcher event binding | `launcherEventBindings.ts` | Low risk | Owns event listener wiring only and receives handlers from controller. | Keep. |
| Launcher text rules | `launcherTextRules.ts` | Low risk | Owns text/composer constants and manual translation limit helper. | Keep. |
| Launcher language rules | `launcherLanguageRules.ts` | Low risk | Owns supported language definitions and navigation helpers. | Keep. |
| Launcher attachment rules | `launcherAttachmentRules.ts` | Low risk | Owns attachment size/name/type helpers. | Keep. |
| Launcher developer log builder | `launcherDeveloperLog.ts` | Low risk | Owns developer log row composition. | Keep. |
| Launcher settings views | `settingsViews.ts` | Medium risk | View-only file, but it owns General, Audio, Translate, and Developer page rendering together. | Split per settings page when local build is available. |
| Audio command gateway | `src-tauri/src/commands/audio.rs` | Medium risk | Command aggregator exposes many audio commands, but most logic is delegated to engine modules. | Split into command groups after local compile check is available. |
| Audio Studio main UI | `audioStudioBinding.ts` | Medium risk | Owns UI render, UI state update, and API calls for the Audio Studio panel. Still acceptable because state and API wrapper are separated. | Later split into view, controller, and action binding files. |
| Audio Studio advanced UI | `audioStudioAdvancedBinding.ts` | Low-medium risk | Advanced UI is isolated and observer wiring is guarded. | Keep for now. |
| Audio Studio state | `audioStudioState.ts` | Low risk | Pure state/model definitions and helper factory functions. | Keep. |
| Audio Studio advanced state | `audioStudioAdvancedState.ts` | Low risk | Pure advanced mode/control definitions. | Keep. |
| Audio Studio API | `audioStudioApi.ts` | Low risk | Thin API wrapper around Tauri commands. | Keep. |
| Audio Studio Rust command stubs | `commands/audio_studio.rs` | Low risk | Small placeholder command module. | Keep. |
| Engine module root | `engine/mod.rs` | Low risk | Module index only; no large business logic. | Keep. |
| Tauri app entry | `src-tauri/src/main.rs` | Low risk | Thin invoke-handler registration. | Keep. |

## Completed refactor actions

- Extracted text limit and composer size rules from `launcherController.ts`.
- Extracted language definitions and helper functions from `launcherController.ts`.
- Extracted attachment validation and formatting helpers from `launcherController.ts`.
- Extracted developer diagnostic log row builder from `launcherController.ts`.
- Extracted raw DOM event binding from `launcherController.ts`.
- Updated `launcherController.ts` to delegate to the extracted modules.

## Blocked write attempts

The following repository-side writes were attempted but blocked by safety checks:

- Splitting `settingsViews.ts` into multiple HTML-heavy view files.
- Splitting `commands/audio.rs` by creating a new audio device command module.

These should be retried during a local refactor pass where `npm run typecheck`, `npm run build`, and `cargo check` can be run immediately after each split.

## Remaining refactor plan

### Phase 1: Continue LauncherController split

Split remaining `launcherController.ts` responsibilities into:

```text
launcherRuntimeController.ts       // renderRuntime, warmup, hardware refresh
launcherChatController.ts          // sessions, submit text, chat collection
launcherCaptureController.ts       // start/stop recording, input check
launcherSettingsController.ts      // settings tab switching and save/reset
```

### Phase 2: Settings view split

Split `settingsViews.ts` into:

```text
generalSettingsView.ts
audioSettingsView.ts
translateSettingsView.ts
developerSettingsView.ts
settingsViewShared.ts
```

### Phase 3: Audio command split

Split `src-tauri/src/commands/audio.rs` into:

```text
audio_devices.rs
audio_capture.rs
audio_pipeline.rs
audio_quality.rs
audio_calibration.rs
audio.rs               // optional re-export or compatibility facade
```

### Phase 4: Audio Studio controller split

Split `audioStudioBinding.ts` into:

```text
audioStudioView.ts
audioStudioActions.ts
audioStudioController.ts
audioStudioBinding.ts      // thin entry binding
```

## Priority order after this pass

1. Continue splitting `launcherController.ts`.
2. Split `settingsViews.ts`.
3. Split `audio.rs`.
4. Split `audioStudioBinding.ts`.

## Current safety decision

A major all-at-once split was not performed because this environment cannot run `npm run build`, `npm run typecheck`, or `cargo check`.

The safe next step is to run local checks first, then continue the remaining splits in small passes.
