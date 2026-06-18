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
