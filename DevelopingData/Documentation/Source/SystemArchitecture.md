# TranslateIT System Architecture

## Runtime route

TranslateIT has one user-facing runtime route:

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

## RustApp

`EngineData/LauncherApp/RustApp` owns:

- desktop app shell,
- Tauri/Rust commands,
- frontend UI,
- runtime status panels,
- build/package validation.

## Local AI worker

`EngineData/LauncherApp/Workers/realtime_local_worker.py` owns local inference orchestration for:

- Faster Whisper ASR,
- MarianMT realtime translation,
- NLLB quality translation,
- Piper TTS orchestration.

This worker is intentionally retained until local inference is rewritten natively or packaged through another approved local runtime.

## Model asset folders

- `EngineData/TranscriptEngine/ModelData/`
- `EngineData/TranslateEngine/ModelData/`
- `EngineData/VoiceEngine/Piper/`

These folders are local asset slots and should not store source code or committed model binaries.

## Validation route

RustApp validation scripts use:

```text
DevelopingData/Tooling/Scripts/Execution
```

Old `ToolKitData` paths are retired.
