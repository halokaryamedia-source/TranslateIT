# V1 User Flow and Engine Flow Repair Report

Branch: `fix/v1-user-engine-flow-integrity`

## Purpose

Repair the current TranslateIT V1 application flow after review found that several UI components were present but not wired through a reliable frontend/engine path.

## Primary issues found

### P0 frontend bridge/import integrity

Several active frontend modules imported `../bridge/runtimeApi`, but the bridge file was missing from the active app package. This could break frontend build/startup and make multiple UI buttons appear missing or non-functional.

`main.ts` also imported watcher/binding modules that were not present in the active source tree:

- `audioDeviceListBinding.ts`
- `audioPipelineResultWatcher.ts`
- `realtimeStatusPayloadRefresh.ts`

### P1 user flow fragility

The UI had several visible controls with no reliable bridge path if one import failed. Because the app bootstraps many bindings at startup, one missing import can prevent the whole interface from becoming usable.

### P1 engine flow contradiction

`ProjectPaths::discover()` required `DevelopingData` as a runtime root marker even though repository rules state `DevelopingData` is development-only and can be removed for release. That could break packaged/runtime startup when release data excludes development docs/tooling.

## Repairs completed

### Runtime API bridge restored

Added:

```text
EngineData/Frontend/RustApp/src/app/bridge/runtimeApi.ts
```

This bridge now exposes the frontend-facing runtime API used by launcher modules:

- runtime status and diagnostics;
- helper bridge lifecycle;
- capture preparation/start/stop;
- audio input and device listing;
- settings load/save/default restore;
- chat session actions;
- text translation;
- model inventory and GPU policy;
- validation evidence reads.

The bridge records command errors and returns safe fallback values so the UI can show actionable messages instead of failing silently.

### Missing UI binding modules restored

Added:

```text
EngineData/Frontend/RustApp/src/app/active-launcher/audioDeviceListBinding.ts
EngineData/Frontend/RustApp/src/app/active-launcher/audioPipelineResultWatcher.ts
EngineData/Frontend/RustApp/src/app/active-launcher/realtimeStatusPayloadRefresh.ts
```

These modules are conservative bindings. They do not claim full voice runtime readiness; they restore wiring so the app can start and provide status feedback.

### Startup trace payload repaired

Updated:

```text
EngineData/Frontend/RustApp/src/app/active-launcher/startupDiagnostics.ts
```

The frontend now sends the expected `record` object to the Tauri `record_frontend_startup_trace` command.

### Release/runtime root discovery repaired

Updated:

```text
EngineData/Frontend/RustApp/src-tauri/src/engine/paths.rs
```

Runtime root detection now uses:

```text
EngineData + UserData
```

`DevelopingData` is treated as optional development context, not a runtime requirement.

### Import integrity validation added

Added:

```text
EngineData/Frontend/RustApp/scripts/validate_frontend_import_integrity.mjs
```

Updated `package.json`:

```text
npm run validate:imports
npm run validate:quick
```

`validate:quick` now checks script profiles, frontend import integrity, naming policy, TypeScript, Rust check, and frontend build.

## Remaining risk

This pass repairs P0/P1 flow integrity but does not complete all functional runtime features.

Remaining work:

1. Split `launcherController.ts` into feature controllers.
2. Route text translation through a single long-lived helper bridge instead of ad-hoc worker spawning where possible.
3. Improve helper setup UX so users see exact setup actions when worker/model/provider readiness is blocked.
4. Add local validation evidence after running `npm run validate:quick` on the target machine.
5. Continue replacing direct DOM mutation watchers with owned controller/view state.

## Required local validation

Run from:

```text
EngineData/Frontend/RustApp
```

Command:

```text
npm run validate:quick
```

If this passes, continue with app runtime test:

```text
npm run dev
```

Manual user-flow checks:

1. App opens to home after warmup.
2. Text can be typed and submitted with Enter.
3. Developer Diagnostics opens and shows command errors if a bridge command fails.
4. Audio Settings opens without crashing.
5. Start Helper gives a clear message when worker or venv is missing.
6. Voice capture blocks with a clear next action instead of silently failing.

## Current claim

This PR repairs broken flow wiring and import integrity. It does not claim that model files, CUDA provider readiness, or full voice translation runtime are complete on the target PC.