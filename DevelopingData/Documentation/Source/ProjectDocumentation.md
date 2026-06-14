# TranslateIT Project Documentation

## Current direction

TranslateIT is a local desktop app for speech-to-text, translation, and voice output.

The current app direction is a Rust/Tauri packaged desktop app plus a local AI worker for local inference orchestration. The project is not yet professionally ready until local validation evidence passes on the target PC.

## Current professional readiness position

Current repo structure and documentation readiness is around `±90%`.

Actual application/client readiness remains lower until these are proven locally:

- Rust/Tauri package build passes.
- Packaged TranslateIT app opens normally after install/build.
- Startup warmup screen completes and reports clear readiness state.
- Local models are installed and detected.
- Persistent worker smoke test passes.
- Real microphone ASR works.
- Translation works for Realtime and Quality profiles.
- Piper TTS works.
- End-to-end latency is measured.

## Active runtime route

```text
TranslateIT.cmd -> packaged TranslateIT app or NSIS installer
EngineData/LauncherApp/RustApp -> Tauri packaged TranslateIT app
```

`TranslateIT.cmd` is a convenience root shortcut only. It must not start the dev server, browser route, Python UI, or worker directly. Developer mode remains inside `EngineData/LauncherApp/RustApp` through npm/Tauri commands.

## Engine ownership

```text
EngineData/
  README.md
  LauncherApp/
    README.md
    RustApp/        # active desktop app shell and Rust/Tauri runtime
    Workers/        # approved local AI worker for ASR, translation, and TTS
  RuntimeAssets/    # local model, Piper, and runtime asset slots only
    ASR/
    Translation/
    Voice/
```

## Approved Python boundary

The only approved Python file under the active project runtime is:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

This worker remains because current local inference uses Python ecosystem libraries for Faster Whisper, Transformers/MarianMT/NLLB, and Piper orchestration. It is not the app launcher, UI engine, or repository validation system.

## Runtime asset ownership

Local model/runtime assets belong under:

```text
EngineData/RuntimeAssets/ASR/ModelData/
EngineData/RuntimeAssets/Translation/ModelData/
EngineData/RuntimeAssets/Voice/Piper/
```

The old separated asset roots are retired:

```text
EngineData/TranscriptEngine/
EngineData/TranslateEngine/
EngineData/VoiceEngine/
```

## Development ownership

```text
DevelopingData/
  Documentation/   # current source docs, concise reports, templates
  Quality/         # diagnostics and test references
  Samples/         # safe sample references
  Tooling/         # Node and PowerShell validation/maintenance scripts
```

## Documentation ownership

All durable docs must be under:

```text
DevelopingData/Documentation
```

Retired documentation roots:

```text
DeveloperData/
DevelopingData/DocumentationData/
DevelopingData/Reports/
```

## Tooling ownership

All executable validation and maintenance scripts must be under:

```text
DevelopingData/Tooling/Scripts/Execution
```

Current active tooling uses:

```text
translateit_tooling.mjs
run_rustapp_final_validation.ps1
```

Repository, Rust/Tauri, CI, evidence, and structure checks should use Node or PowerShell. Python validation scripts are retired from `DevelopingData`.

Retired tooling root:

```text
DevelopingData/ToolKitData/
```

## Retired root launcher

```text
TranslateIT.vbs
```

## UI preview

```text
Launcher/Preview/TranslateIT_UI_Preview.html
```

This preview is for design review only and is not a runtime route.

## Professional rules

- Keep root clean.
- Use English folder and file names.
- Keep documentation centralized under `DevelopingData/Documentation`.
- Keep runtime app code under `EngineData/LauncherApp/RustApp`.
- Keep runtime model/Piper slots under `EngineData/RuntimeAssets`.
- Keep user data and generated evidence under `UserData`.
- Do not add legacy Python app engines under `EngineData`.
- Do not claim commercial/client readiness without local evidence.
