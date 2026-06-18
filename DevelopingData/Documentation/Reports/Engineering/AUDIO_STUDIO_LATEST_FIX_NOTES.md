# Audio Studio Latest Fix Notes

Branch: `Dev-Rust`

## Latest completed fix

### Audio Studio evidence-contract-driven local runner

Risk:

- The local validation runner could drift from the local validation evidence contract because output root, log pattern, summary pattern, summary schema, runtime claim, required steps, and optional steps were previously hardcoded in the runner.

Fix:

- Updated `EngineData/LauncherApp/RustApp/scripts/run_audio_studio_local_validation.mjs` to read `EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_LOCAL_VALIDATION_EVIDENCE_CONTRACT.json`.
- The runner now derives approved output root from `approved_output_root`.
- The runner now derives log and summary file names from `log_file_pattern` and `summary_file_pattern`.
- The runner now derives summary schema from `summary_schema`.
- The runner now derives runtime claim from `required_runtime_claim`.
- The runner now derives required validation steps from `required_steps`.
- The runner now uses `optional_steps` to decide whether `Tauri build` may be appended when requested.
- Added runner-side sanity checks for evidence contract schema, status, output root, runtime claim, required steps, and optional steps.
- Updated `validate_audio_studio.mjs` to check evidence-contract usage markers in the runner.

## Still not executed

- No `npm run validate:audio-studio:local` was executed in this environment.
- No TypeScript compile confirmation was executed in this environment.
- No Rust cargo check was executed in this environment.
- No frontend build was executed in this environment.
- No Tauri runtime launch or package build was executed in this environment.

## Target-PC command

```powershell
cd EngineData\LauncherApp\RustApp
npm run validate:audio-studio:local
```

Optional packaging pass:

```powershell
cd EngineData\LauncherApp\RustApp
npm run validate:audio-studio:local -- --include-tauri-build
```
