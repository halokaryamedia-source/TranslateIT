# Dev-Pack Structure Audit Report

Branch: `Dev-Pack`
Base: `Dev-Rust`
Date: 2026-06-18
Scope: structure cleanup, frontend/backend boundary audit, Python worker isolation, runtime contract placement, hardening risk inventory.

## 1. Current root entries

Approved root layout is already documented as:

```text
DevelopingData/
EngineData/
UserData/
.gitattributes
.gitignore
README.md
TranslateIT.lnk
```

The current README and `RootFileRules.md` define the same ownership model. This audit treats those files as the current source of truth.

## 2. File/folder placement status

### Confirmed source-of-truth routes

```text
EngineData/LauncherApp/RustApp/
EngineData/Backend/LocalWorker/WorkerRuntime/
EngineData/Backend/RuntimeContracts/
EngineData/Backend/RuntimeAssets/
DevelopingData/Documentation/
UserData/
```

### Current caution

`EngineData/LauncherApp/RustApp` is still the active Tauri package path. Do not rename it to `App` until package path migration is performed atomically across npm scripts, package lock metadata, Tauri config, README references, tooling, shortcut, and CI/workflow references.

## 3. Retired paths check

Retired paths documented as forbidden:

```text
DeveloperData/
DevelopingData/DocumentationData/
DevelopingData/Reports/
DevelopingData/ToolKitData/
DevelopingData/Diagnostics/
DevelopingData/Docs/
DevelopingData/LauncherHelpers/
DevelopingData/SampleData/
DevelopingData/Tests/
EngineData/TranscriptEngine/
EngineData/TranslateEngine/
EngineData/VoiceEngine/
EngineData/RuntimeAssets/
EngineData/LauncherApp/Workers/
Launcher/
Launcher/Preview/
TranslateIT.vbs
TranslateIT.cmd
```

No retired path was intentionally recreated in this Dev-Pack audit commit. A full tree enumeration should still be run by `npm run validate:root` and `npm run validate:structure` before any cleanup is marked complete.

## 4. Frontend monolithic risk

Primary file inspected:

```text
EngineData/LauncherApp/RustApp/src/app/launcher/launcherController.ts
```

Observed responsibilities still centralized in the controller:

- Shell start and warmup lifecycle.
- Runtime status rendering.
- Chat session creation/listing/message append flow.
- Translation submit flow.
- Attachment ingestion.
- Recording start/stop flow.
- Audio input check.
- Settings save/reset/rendering.
- Developer diagnostics rendering.
- Language selector state.
- Notification/assistant message updates.

Existing positive split:

- `runtimeApi.ts` already centralizes Tauri command access and single-flight reads.
- `launcherEventBindings.ts` already separates initial shell-level event binding.
- `chatViews.ts`, `settingsViews.ts`, `warmupViews.ts`, and rule files already reduce some view/rule coupling.

Required next frontend refactor:

```text
src/app/launcher/
  controllers/
  bindings/
  views/
  state/
  services/
  validation/
  utils/
```

Recommended extraction order:

1. `services/notificationService.ts` for assistant notice and safe UI status messages.
2. `services/chatSessionService.ts` for chat session create/list/append/title logic.
3. `services/translationSubmitService.ts` for manual text submit state machine.
4. `services/attachmentService.ts` for text attachment ingestion and size/type validation.
5. `services/recordingService.ts` for start/stop capture button locking.
6. `controllers/settingsController.ts` for settings tab rendering and event rebinding.
7. `controllers/runtimeStatusController.ts` for runtime status bundle rendering.

## 5. Rust/Tauri backend monolithic risk

Primary file inspected:

```text
EngineData/LauncherApp/RustApp/src-tauri/src/main.rs
```

`main.rs` is currently acceptable as a thin command-registration entrypoint. It still imports many commands directly, so the next cleanup should introduce a command registry module to keep `main.rs` bootstrap-only.

Target Rust layout:

```text
src-tauri/src/
  main.rs
  command_registry.rs
  commands/
  services/
  runtime/
  worker/
  config/
  security/
  diagnostics/
  errors.rs
  state.rs
```

Recommended extraction order:

1. Add `command_registry.rs` and move `tauri::generate_handler![]` registration there.
2. Keep `commands/` as Tauri adapters only.
3. Move reusable business logic to `services/`.
4. Move helper bridge process lifecycle to `worker/`.
5. Move runtime manifest/readiness logic to `runtime/`.
6. Add unified safe error mapping in `errors.rs`.

## 6. Python worker isolation

Approved Python runtime route:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py
```

Positive findings:

- Worker reads/writes through project-local `EngineData/Backend/RuntimeAssets` and `UserData/CacheData` routes.
- Worker uses JSON stdin/stdout handlers.
- Worker bounds request size, translation text size, TTS text size, transcript text size, and audio input size.
- Worker restricts input/output path resolution to allowed roots.

Risks to handle in next cleanup:

- Worker is still a large single Python module.
- It contains ASR, translation, TTS, SAPI, Piper, manifest, path validation, and request dispatch in one file.
- Safe future split:

```text
WorkerRuntime/
  realtime_local_worker.py
  worker_core/
    paths.py
    status.py
    asr.py
    translation.py
    tts.py
    protocol.py
    limits.py
```

Do not split until smoke scripts are ready to validate import paths.

## 7. Runtime contracts and asset slots

Approved contract route:

```text
EngineData/Backend/RuntimeContracts/
```

Expected files:

```text
ATTACHMENT_RUNTIME_CONTRACT.json
AUDIO_PIPELINE_RUNTIME_CONTRACT.json
TRANSLATION_RUNTIME_CONTRACT.json
MODEL_RUNTIME_MANIFEST.json
```

Approved asset slot route:

```text
EngineData/Backend/RuntimeAssets/
  ASR/ModelData/
  Translation/ModelData/
  Voice/Piper/
```

`.gitignore` already protects generated user data and model/runtime assets. Keep README placeholders only.

## 8. DevelopingData runtime dependency risk

`package.json` contains development/status/validation scripts that call `DevelopingData/Tooling/Scripts/Execution/...`.

This is acceptable for development tooling, but the release runtime must not depend on `DevelopingData`. The next validation must distinguish:

- Allowed: npm validation/status scripts depend on `DevelopingData`.
- Not allowed: Tauri app runtime, Rust backend, frontend runtime, or Python worker requiring `DevelopingData` to run.

## 9. Security risk inventory

Observed positive controls:

- Frontend bridge redacts local paths in command errors.
- Worker restricts path access to allowed roots.
- Worker applies request/text/audio limits.
- Helper commands use frontend timeout wrappers.

Open hardening items:

- Add backend-side safe error type/mapping for all commands.
- Confirm no command accepts arbitrary shell input from frontend.
- Confirm helper bridge child process lifecycle always stops on app exit.
- Confirm all status intervals have stop/dispose support.
- Confirm no runtime path leaks through user-facing UI beyond sanitized diagnostics.

## 10. Memory leak/performance risk inventory

Observed risks:

- `startHelperBridgeHealthMonitor()` starts a 15s interval and guards duplicate start, but does not expose a stop function.
- `startRealtimeStatusPayloadAutoRefresh()` exposes a stop function, but the current startup route ignores the returned disposer.
- Settings render functions replace DOM using `innerHTML` and rebind listeners. This is acceptable when old nodes are replaced, but should be centralized in controller modules.
- `launcherController.ts` keeps many pending-state flags in one class. Splitting services will reduce state coupling.

## 11. Recommended cleanup phases

### Phase 1 - Documentation and guardrails

- Create Dev-Pack audit report.
- Create progress report.
- Create frontend/backend module maps.
- Do not rename package path yet.

### Phase 2 - Low-risk frontend extraction

- Extract notification, chat, translation submit, attachment, and recording services.
- Keep existing UI visual baseline.
- Run typecheck/build frontend after each small extraction.

### Phase 3 - Runtime lifecycle hardening

- Add stop/dispose handlers for helper health monitor.
- Store realtime status disposer in launcher startup lifecycle.
- Confirm no duplicate intervals after app reload/navigation.

### Phase 4 - Rust command registry cleanup

- Add `command_registry.rs`.
- Keep behavior unchanged.
- Run cargo check.

### Phase 5 - Worker modularization

- Split Python worker only after smoke script path validation is available.
- Keep public stdin/stdout protocol stable.

## 12. Current audit verdict

Status: `PARTIAL_PASS_WITH_REFACTOR_REQUIRED`

The repository already has clear root ownership documents and an active Rust/Tauri route. The main blocker for professional maintainability is remaining controller/worker centralization and incomplete lifecycle hardening evidence, not the root policy itself.
