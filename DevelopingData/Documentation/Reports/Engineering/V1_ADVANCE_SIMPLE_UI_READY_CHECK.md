# V1 Advance Simple UI Ready Check

## Current readiness position

The branch can be treated as source/build-ready when CI is green, but it should not be treated as runtime-user-ready until the desktop app is opened and tested on Windows.

## What CI now checks

CI/source validation now covers:

- Package script policy.
- Import integrity.
- File naming and active route policy.
- Translation flow wiring.
- Runtime UX simple-entry wiring.
- Simple UI contract.
- Startup readiness contract.
- V1 Advance CI scope.
- Virtual route engine/dev capability contract.
- Rust manifest preflight.
- Frontend build preflight.
- TypeScript compile.
- Vite frontend build.
- Tauri source/package preflight.

## Simple UI contract coverage

`validate_simple_ui_contract.mjs` verifies that the app keeps a simple main workflow:

```text
Type text -> click Translate -> read result.
```

It also verifies:

- `main.ts` uses `SimpleLauncherController`.
- Complex legacy UI bindings are not mounted by the main entry.
- The startup result area is empty until the user translates.
- The main shell contains the required minimal controls.
- The Translate button is wired to `runtimeProductFacade.runProductTranslation`.
- Translation results are rendered with `translationResultView`.
- Setup actions call `runtimeProductFacade.runProductSetupAction`.
- Diagnostics remains available as an escape hatch.
- Simple layout CSS is present.

## What CI cannot prove

CI cannot fully prove:

- Windows WebView rendering.
- Tauri command invocation in a live desktop process.
- Python worker availability on the owner machine.
- Microphone permissions and audio devices.
- Actual local model files.
- Real ASR/TTS audio behavior.
- Whether the final UI feels comfortable without opening the app.

## Definition of ready before PR/merge

Do not PR or merge yet. The next true readiness gate is a local Windows app test:

1. App opens without blank screen.
2. Simple main UI appears.
3. User can type text and click Translate.
4. The result area shows translation or a clear blocker.
5. Start Helper / Check Worker / Check Mic show feedback.
6. Settings opens and returns to Home.
7. Developer diagnostics opens without breaking the main flow.

## Current recommendation

If CI is green after the simple UI contract guard is added, the branch is safe for source-level continuation. It is still not guaranteed as a final usable product until local runtime testing is performed.
