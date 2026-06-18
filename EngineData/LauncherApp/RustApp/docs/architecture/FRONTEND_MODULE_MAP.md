# Frontend Module Map

Branch: `Dev-Pack`
Package route: `EngineData/LauncherApp/RustApp`
Frontend source route: `EngineData/LauncherApp/RustApp/src`

## Purpose

This document defines the intended frontend ownership boundary for the Dev-Pack cleanup. It is a guardrail for future refactors and must be kept in sync when modules are moved.

## Current active entrypoint

```text
src/main.ts
```

Responsibilities:

- Import global CSS files.
- Mount `LauncherController` into `#app`.
- Start supporting UI bindings and status monitors.
- Store and dispose monitor cleanup callbacks during window unload.

Keep this file small. It should not contain business logic.

## Current launcher area

```text
src/app/launcher/
```

Current important files:

```text
launcherController.ts
launcherEventBindings.ts
dom.ts
shell.ts
chatViews.ts
settingsViews.ts
warmupViews.ts
launcherAttachmentRules.ts
launcherLanguageRules.ts
launcherTextRules.ts
launcherDeveloperLog.ts
helperBridgeHealthMonitor.ts
realtimeStatusPayloadRefresh.ts
```

## Implemented Dev-Pack lifecycle cleanup

The following lifecycle items have already been started in `Dev-Pack`:

- `helperBridgeHealthMonitor.ts` exposes a stop callback for its interval.
- `realtimeStatusPayloadRefresh.ts` removes its visibility listener during stop and uses single-flight refresh protection.
- `audioPipelineResultWatcher.ts` is explicitly bound and disposable, with polling cancellation during unbind.
- `attachmentLimitWatcher.ts` is disposable and clears its delayed warning timer during unbind.
- `audioDeviceListBinding.ts` is disposable and prevents overlapping audio device requests.
- `developerEvidenceBinding.ts`, `developerHelperBridgeBinding.ts`, `referenceUiBinding.ts`, `runtimeReadinessUiGuard.ts`, and `voiceOutputPersistenceBinding.ts` now expose unbind functions.
- `launcherEventBindings.ts` uses an `AbortController` so launcher event listeners can be removed by the caller.
- `main.ts` currently wires cleanup for several monitors and bindings. Remaining cleanup wiring should be completed in small patches.

This is not a complete frontend refactor yet. It reduces interval/listener leak risk while keeping the UI and runtime behavior unchanged.

## Target launcher structure

```text
src/app/launcher/
  controllers/
    launcherController.ts
    settingsController.ts
    runtimeStatusController.ts
    recordingController.ts
  bindings/
    launcherEventBindings.ts
    attachmentDropBinding.ts
    settingsEventBindings.ts
  services/
    notificationService.ts
    chatSessionService.ts
    translationSubmitService.ts
    attachmentService.ts
    recordingService.ts
    runtimeStatusService.ts
  views/
    shell.ts
    chatViews.ts
    settingsViews.ts
    warmupViews.ts
  state/
    launcherState.ts
    pendingState.ts
    languageSelectorState.ts
  validation/
    launcherAttachmentRules.ts
    launcherLanguageRules.ts
    launcherTextRules.ts
  utils/
    dom.ts
    developerLog.ts
```

## Boundary rules

### controllers/

Controllers orchestrate UI flow only. They can call services and views, but should not contain long business logic.

Allowed:

- Call services.
- Call view renderers.
- Update high-level UI state.
- Bind route-level events.

Not allowed:

- Direct model/runtime business logic.
- Direct worker protocol handling.
- Large validation functions.
- Large DOM templates.

### bindings/

Bindings attach event listeners. They should not perform runtime work directly.

Allowed:

- `addEventListener` calls.
- Passing events to typed handlers.
- One-time shell bindings.

Not allowed:

- Translation logic.
- Recording logic.
- Settings persistence logic.
- Direct Tauri command calls.

### services/

Services own use-case logic and pending-state handling.

Examples:

- `chatSessionService.ts`: create/list/append local chat messages.
- `translationSubmitService.ts`: validate text, lock send UI, call runtime API, return result state.
- `attachmentService.ts`: read text files, compact content, enforce type/size limits.
- `recordingService.ts`: start/stop recording, lock buttons, refresh runtime status.
- `notificationService.ts`: update assistant notice consistently.

### views/

Views return HTML strings or mount static DOM. They must stay deterministic and side-effect-light.

Allowed:

- Template generation.
- Display formatting.

Not allowed:

- `invoke()` calls.
- Async runtime work.
- Event listener registration, except when explicitly documented as a binding.

### state/

State modules hold typed state objects and helper mutators.

Do not scatter pending flags across unrelated classes when a state object can own them.

### validation/

Validation modules own limits and validation rules.

Examples:

- Attachment type/size rules.
- Manual text length rules.
- Supported language rules.

### utils/

Low-level helpers only. Avoid putting product logic here.

## Refactor sequence

Use small commits in this order:

1. Complete caller-side cleanup wiring for disposable bindings.
2. Move notification methods into `services/notificationService.ts`.
3. Move chat session logic into `services/chatSessionService.ts`.
4. Move attachment ingestion into `services/attachmentService.ts`.
5. Move recording start/stop button-lock flow into `services/recordingService.ts`.
6. Move manual text submit flow into `services/translationSubmitService.ts`.
7. Move settings rendering/rebinding into `controllers/settingsController.ts`.
8. Move runtime status rendering into `controllers/runtimeStatusController.ts`.

## Validation after each extraction

Run when environment supports it:

```powershell
cd EngineData/LauncherApp/RustApp
npm run typecheck
npm run build:frontend
npm run validate:ui-reference
npm run validate:ui-template
npm run validate:runtime-flow
```

## Do not change during first extraction pass

- UI visual baseline.
- Tauri command names.
- Runtime contracts.
- Worker protocol.
- Active package path `RustApp`.
