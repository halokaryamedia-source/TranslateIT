# V1 Advance Local Deep App Check

## Purpose

This check is a developer-facing automated test runner before final manual app testing.

It is intended to answer:

```text
Which part is broken: source contract, UI wiring, translation command surface, TypeScript, frontend build, Tauri preflight, or Rust/Tauri compile?
```

## Command

Run from the RustApp folder:

```powershell
node scripts/run_local_deep_app_check.mjs
```

Or from the repository root:

```powershell
Set-Location -LiteralPath 'D:\Work\AI Stuff\TranslateIT\Developing\Version 0.1\EngineData\Frontend\RustApp'; node scripts/run_local_deep_app_check.mjs
```

## What it checks

The runner executes these steps in order:

1. Package script policy.
2. Frontend import integrity.
3. File naming and active route policy.
4. Translation flow contract.
5. Runtime UX contract.
6. Simple UI contract.
7. Functional surface contract.
8. Startup readiness contract.
9. Virtual route engine/dev contract.
10. Rust manifest preflight.
11. Frontend build preflight.
12. TypeScript typecheck.
13. Vite frontend build.
14. Tauri package preflight.
15. Local Tauri/Rust cargo check.
16. Diagnostic contract reports.

## Functional surface contract

The functional surface validator checks that the main UI actions are connected through the stack:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi
-> Rust command registry
```

It verifies these functional areas:

- Translate text.
- Runtime status.
- Diagnostics.
- Load/save/default settings.
- Helper bridge status/start/worker task.
- Model inventory/verify models.
- GPU policy.
- Audio device list.
- Audio input status.
- Voice prepare/start/stop.
- Chat create/append/list command surface.
- UI bindings for Translate, Attach text, Start Helper, Check Worker, Check Mic, Voice, Settings, Developer Diagnostics.
- Inline success/failure feedback.

## Reports

The runner writes reports to:

```text
UserData/LogData/RuntimeTestReports/latest-local-deep-app-check.json
UserData/LogData/RuntimeTestReports/latest-local-deep-app-check.md
```

Each step also gets a detailed log:

```text
UserData/LogData/RuntimeTestReports/local-deep-app-check-<step-id>.log
```

## Important limitation

This is still not a replacement for final manual testing. It cannot fully prove:

- Windows WebView visual rendering.
- Live Tauri command behavior inside an opened app window.
- Real microphone permission behavior.
- Python worker availability on the owner machine.
- Local model file correctness.
- Real ASR/TTS output quality.
- Whether the UI feels comfortable to use.

## Recommended flow

1. CI green.
2. Run local deep app check.
3. Fix any failed blocking step.
4. Run local deep app check again until PASS.
5. Only then open the app for manual test.
