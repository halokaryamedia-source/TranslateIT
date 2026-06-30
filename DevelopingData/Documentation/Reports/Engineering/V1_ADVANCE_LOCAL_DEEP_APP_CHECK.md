# V1 Advance Automated App Checks

## Purpose

The testing strategy is now split into two automated layers:

1. **Non-local GitHub CI checks** for source, UI contract, functional surface, build, and Tauri package preflight.
2. **Developer deep automated runner** for a fuller local machine report before any manual app usage.

The goal is not to jump to manual testing early. The goal is to make automated testing useful enough that a developer can see exactly which layer is broken.

## Non-local CI coverage

GitHub CI now checks these source-level areas without opening the desktop app:

1. Package script policy.
2. Frontend import integrity.
3. File naming and active route policy.
4. Translation flow contract.
5. Runtime UX contract.
6. Simple UI contract.
7. Functional surface contract.
8. Startup readiness contract.
9. V1 CI scope.
10. Virtual route engine/dev contract.
11. Rust manifest preflight.
12. Frontend build preflight.
13. TypeScript typecheck.
14. Vite frontend build.
15. Tauri package preflight.

## Functional surface contract

The functional surface validator checks the real application surface from UI to Rust command registry:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi
-> Rust command registry
```

It verifies:

- DOM IDs required by the controller exist in the shell.
- Required buttons have event bindings.
- Translate action routes through the facade.
- Setup actions route through the facade.
- Voice action has blocked/ready feedback.
- Settings and diagnostics remain reachable.
- Result rendering uses escaped display output.
- Runtime API command names exist.
- Rust registry exposes the expected command names.
- User-facing success/failure feedback strings exist.

## Developer deep automated runner

Run from the RustApp folder:

```powershell
node scripts/run_local_deep_app_check.mjs
```

This runner performs a fuller automated check and writes a developer-friendly report.

## What the deep runner checks

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

## What this is meant to solve

The automated checks should identify whether the failure is in:

- UI shell IDs.
- Controller event binding.
- Facade mapping.
- Runtime API command naming.
- Rust command registry exposure.
- Text translation path.
- Setup/helper path.
- Voice readiness path.
- Settings path.
- Result rendering safety.
- Frontend type/build.
- Tauri source/package readiness.
- Local Rust/Tauri compile proof.

## Remaining limitation

Even with these deeper automated checks, some behavior can only be proven when the desktop runtime is opened later:

- Windows WebView visual rendering.
- Live Tauri invocation from a running window.
- Microphone permission prompts.
- Real Python worker availability on the target machine.
- Real local model files.
- Real ASR/TTS output quality.

These are later-stage checks, not the current focus.
