# Dev-Rust Stability Audit Report

Branch: `Dev-Rust`

## Scope

This report covers repository-side stability review for the current Dev-Rust branch, with extra focus on EngineData and Launcher integration. No local build, Rust check, frontend build, package build, runtime launch, device check, or output check was executed in this environment.

## High-risk areas reviewed

- Tauri command argument compatibility.
- Frontend API wrapper wiring.
- Audio Studio UI event handling.
- Audio Studio import file validation.
- Audio Studio placeholder command visibility.
- Audio Studio metadata text sanitization.
- Audio Studio command response normalization.
- Audio Studio command notice race handling.
- Audio Studio reading selection bounds.
- Audio Studio empty reading fallback.
- Audio Studio advanced panel mode/control safety.
- Audio Studio static validation coverage.
- Audio Studio contract validator robustness.
- Audio Studio validation script chain enforcement.
- Audio Studio cross-layer enum consistency.
- Audio Studio safety limit consistency.
- Audio Studio payload limit contract sync.
- Advanced panel observer behavior.
- Advanced panel direct-open behavior.
- Theme injection behavior.
- Icon name compatibility.
- Engine and Launcher file placement.
- Runtime contract placement.
- Audio Studio root and storage contract consistency.
- Type boundary stability between shared, launcher, and API modules.
- Report and documentation consistency.

## Issues found and fixed

### 1. Tauri command argument hardening

Risk: command stubs could receive incomplete or malformed arguments once connected to the UI.

Fix:

- Added take request validation.
- Added take source validation.
- Added take state update validation.
- Kept command parameter names compatible with frontend `{ request }` payloads.
- Kept reviewed-stub responses explicit.

### 2. UI action integration gap

Risk: UI staged local state but did not fully exercise the frontend API wrapper route.

Fix:

- Connected import staging to `audioStudioApi.importTake`.
- Connected guided staging to `audioStudioApi.stageGuidedTake`.
- Connected take-state updates to `audioStudioApi.updateTakeState`.
- Added a project metadata route check button for `audioStudioApi.exportProjectMetadata`.

### 3. Unsupported icon compile risk

Risk: a metadata action used an icon key that was not present in the icon registry.

Fix:

- Replaced the unsupported icon key with the existing `fileText` icon.

### 4. DOM action safety

Risk: state update buttons trusted raw dataset values.

Fix:

- Added an action-state guard so only accepted, needs_retry, and blocked actions can update a take.

### 5. Theme injection stability

Risk: style injection could duplicate in development reload scenarios.

Fix:

- Added a stable style element id.
- Added a guard to prevent duplicate Audio Studio style injection.

### 6. Advanced observer stability

Risk: repeated binding could create repeated MutationObserver setup.

Fix:

- Added observer setup guard in the advanced binding module.

### 7. Orphan stylesheet cleanup

Risk: a standalone stylesheet draft could drift from the active style path.

Fix:

- Removed the unused stylesheet draft.
- Consolidated active styling through `audioStudioThemeEntry.ts`.

### 8. Shared type boundary hardening

Risk: API-layer types were imported from the launcher state module, creating avoidable UI-to-API coupling.

Fix:

- Added `app/shared/audioStudioTypes.ts`.
- Moved Audio Studio source/state/command-state definitions to the shared layer.
- Updated launcher state and API wrapper to use the shared type definitions.

### 9. Take identifier stability

Risk: guided reading take ids could collide under extremely fast repeated staging.

Fix:

- Added a shared id helper with timestamp and random suffix for imported and guided items.

### 10. Advanced panel direct-open fallback

Risk: the advanced panel depended on a MutationObserver path and could fail to appear if observer setup had not started before Audio Studio opened.

Fix:

- Exported an explicit advanced panel injection function.
- Called the injection function directly from the Audio Studio open flow.
- Kept the observer path as a secondary safety net.

### 11. Audio Studio storage-root normalization

Risk: metadata and quality contracts could drift by allowing a separate Audio Studio log root under `UserData/LogData`.

Fix:

- Normalized Audio Studio logs to `UserData/CacheData/AudioStudio/logs/`.
- Kept cache data under `UserData/CacheData/AudioStudio/`.
- Kept saved project data under `UserData/SavedProject/AudioStudio/`.
- Added contract rules against creating additional Audio Studio roots outside CacheData and SavedProject.
- Aligned the advanced quality contract with the same approved roots.

### 12. Placeholder command notice clarity

Risk: UI fallback messages could make reviewed placeholder routes look like completed runtime behavior.

Fix:

- Added command result formatting for `invalid_request`, `placeholder_only`, evidence-required, and unavailable command states.
- Kept local UI staging visible while clearly labeling backend route state as placeholder-only when applicable.

### 13. Import file validation

Risk: unsupported, empty, very large, or too many imported files could enter staged takes and call command stubs.

Fix:

- Added import validation before take staging.
- Rejected empty files.
- Rejected files larger than 500 MB.
- Rejected unsupported file types and extensions.
- Limited each import action to 12 files.
- Added rejection summaries in the assistant notice.

### 14. Take metadata text and payload length hardening

Risk: very long or control-character-heavy file names, titles, details, or take ids could degrade UI notices, metadata, or command payload stability.

Fix:

- Normalized display metadata before staging imported or guided takes.
- Clipped take titles to 120 characters.
- Clipped take details to 500 characters.
- Added Rust-side length checks for take id, title, and detail payloads.
- Rejected oversized title/detail/id payloads before runtime route implementation.

### 15. Command response normalization

Risk: runtime command responses could be malformed or contain an unknown state while TypeScript generics still made them look valid at compile time.

Fix:

- Added shared command state constants.
- Added response normalization in the Audio Studio API wrapper.
- Unknown command states are treated as blocked.
- Missing messages receive a safe fallback message.
- Evidence requirement defaults to true unless explicitly false.

### 16. Command notice race handling

Risk: slower command responses from older actions could overwrite newer assistant notices after rapid clicks or multi-file imports.

Fix:

- Added command notice sequence tracking.
- Only the latest command result is allowed to update the assistant notice.
- Older command completions are ignored if a newer command has already started.

### 17. Reading selection bounds and sanitized import notice labels

Risk: an invalid reading index could leave no reading card active, and import notices could use raw file names rather than sanitized staged take titles.

Fix:

- Added reading index clamping.
- Clamped reading selection before rendering and guided staging.
- Changed import notices to use sanitized take titles.

### 18. Empty guided-reading fallback and rejected-label sanitization

Risk: if guided reading lines are removed or not loaded in a later pass, guided staging could dereference an unavailable line. Rejected-file summaries could also expose raw file names with control characters or excessive length.

Fix:

- Added a selected-reading helper that returns `null` when no line is available.
- Added an empty-state card for missing guided reading lines.
- Blocked guided staging with a clear notice when no guided line is available.
- Sanitized and clipped rejected file labels before showing them in assistant notices.

### 19. Advanced panel mode and control rendering safety

Risk: advanced mode selection used display labels rather than stable mode ids, default active mode depended on object order, and control widths could be rendered from unchecked numeric values.

Fix:

- Added explicit advanced mode id constants and default mode constant.
- Tracked selected advanced mode by stable id.
- Validated mode button actions against the official mode id list.
- Clamped control default values to 0-100 before rendering width.
- Added empty-state fallbacks for missing modes, controls, and quality dimensions.

### 20. Audio Studio static validation coverage

Risk: Audio Studio wiring could regress silently because existing validation scripts did not include feature-specific checks for Audio Studio files, command names, contracts, and hardening markers.

Fix:

- Added `scripts/validate_audio_studio.mjs`.
- Registered `validate:audio-studio` in `package.json`.
- Included `validate:audio-studio` in `validate:internal` and `validate:full`.
- The validator checks required Audio Studio files and required integration markers.

### 21. Audio Studio contract validator robustness

Risk: the static validator relied on the current working directory and text markers only, so manual invocation from a different directory or contract drift inside valid JSON could be missed.

Fix:

- Changed validator root detection to derive paths from `import.meta.url`.
- Added JSON parsing for Audio Studio metadata and advanced quality contracts.
- Added structural checks for contract schema, status, approved roots, take sources, and take states.
- Added explicit mismatch errors for missing or drifted contract values.

### 22. Audio Studio validation script chain enforcement

Risk: `validate:audio-studio` could be removed from `package.json` or excluded from `validate:internal` / `validate:full` without the Audio Studio validator noticing.

Fix:

- Added package script inspection to `validate_audio_studio.mjs`.
- The validator now checks that `validate:audio-studio` points to the Audio Studio validator script.
- The validator now checks that `validate:internal` includes `validate:audio-studio`.
- The validator now checks that `validate:full` includes `validate:audio-studio`.

### 23. Audio Studio cross-layer enum consistency validation

Risk: take sources, take states, command states, or advanced mode ids could drift between shared TypeScript definitions, Rust validation stubs, contracts, and advanced UI state.

Fix:

- Added source-code enum consistency checks to `validate_audio_studio.mjs`.
- The validator now checks shared take sources, take states, and command states.
- The validator now checks Rust-side take source and state validation markers.
- The validator now checks advanced mode ids and advanced binding hardening markers.

### 24. Audio Studio safety limit consistency validation

Risk: frontend import limits, frontend metadata caps, or Rust payload caps could be changed independently and create inconsistent validation behavior across UI and backend stubs.

Fix:

- Added limit consistency markers to `validate_audio_studio.mjs`.
- The validator now checks staged take limit, import count limit, and max audio file size limit.
- The validator now checks frontend title/detail limits.
- The validator now checks Rust take id/title/detail payload limits.

### 25. Audio Studio payload limit contract sync

Risk: safety limits could be enforced in source code but absent from the runtime metadata contract, making future metadata writers rely on implicit implementation details.

Fix:

- Added `payload_limits` to `AUDIO_STUDIO_PROJECT_METADATA_CONTRACT.json`.
- Added accepted import extensions to the payload limit contract.
- Added a metadata rule requiring payload limits to be enforced before writing metadata.
- Added `metadata_payload_limits_synced` to the advanced quality contract done definition.
- Updated the static validator to check payload limit contract values and the advanced contract sync marker.

## Current integration chains

### Launcher entry chain

```text
index.html
  -> src/main.ts
  -> LauncherController
```

### Audio Studio chain

```text
index.html
  -> src/audioStudioEntry.ts
  -> audioStudioThemeEntry.ts
  -> audioStudioBinding.ts
  -> audioStudioApi.ts
  -> shared/audioStudioTypes.ts
  -> Tauri invoke handler
  -> commands/audio_studio.rs
```

### Advanced panel chain

```text
src/audioStudioEntry.ts
  -> audioStudioAdvancedBinding.ts
  -> audioStudioAdvancedState.ts
  -> audioStudioBinding.ts direct-open fallback
```

## Still vulnerable until local validation

These areas cannot be closed from repository-side edits alone:

- TypeScript compile confirmation.
- Rust compile confirmation.
- Tauri launch confirmation.
- UI visual review inside the desktop shell.
- File import behavior in the desktop runtime.
- Guided reading runtime behavior.
- Approved storage path behavior.
- Real output behavior.
- Packaging behavior.

## Stability status

Repository-side issues found during this pass were fixed. The branch is cleaner and better integrated for the non-local scope, but still requires target-PC validation before runtime readiness is claimed.
