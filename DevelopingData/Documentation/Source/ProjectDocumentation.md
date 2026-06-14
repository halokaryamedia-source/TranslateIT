# TranslateIT Project Documentation

## Current direction

TranslateIT is a local desktop app for speech-to-text, translation, and voice output.

The current app direction is Rust/Tauri desktop shell plus a local AI worker for local inference orchestration. The project is not yet professionally ready until local validation evidence passes on the target PC.

## Current professional readiness position

Current repo structure and documentation readiness is around `±87%`.

Actual application/client readiness remains lower until these are proven locally:

- Rust/Tauri package build passes.
- Desktop app opens from `TranslateIT.vbs`.
- Local models are installed and detected.
- Persistent worker smoke test passes.
- Real microphone ASR works.
- Translation works for Realtime and Quality profiles.
- Piper TTS works.
- End-to-end latency is measured.

## Active runtime route

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

No alternate Python launcher, BAT helper, debug route, or legacy runtime route is allowed.

## Engine ownership

```text
EngineData/
  README.md
  LauncherApp/
    README.md
    RustApp/       # active desktop app shell and Rust/Tauri runtime
    Workers/       # approved local AI worker for ASR, translation, and TTS
  TranscriptEngine/ # local ASR model asset slot only
  TranslateEngine/  # local translation model asset slot only
  VoiceEngine/      # local Piper runtime asset slot only
```

## Approved Python boundary

The only approved Python file under `EngineData` is:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

This worker remains because current local inference uses Python ecosystem libraries for Faster Whisper, Transformers/MarianMT/NLLB, and Piper orchestration. It is not the app launcher or UI engine.

## Development ownership

```text
DevelopingData/
  Documentation/   # all documentation, guides, research, reports, templates
  Quality/         # diagnostics and test references
  Samples/         # safe sample references
  Tooling/         # executable validation and maintenance scripts
```

## Documentation ownership

All durable docs must be under:

```text
DevelopingData/Documentation
```

Do not restore or recreate:

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

Do not restore or recreate:

```text
DevelopingData/ToolKitData/
```

## Professional rules

- Keep root clean.
- Use English folder and file names.
- Keep documentation centralized under `DevelopingData/Documentation`.
- Keep runtime app code under `EngineData`.
- Keep user data and generated evidence under `UserData`.
- Do not add legacy Python app engines under `EngineData`.
- Do not claim commercial/client readiness without local evidence.
