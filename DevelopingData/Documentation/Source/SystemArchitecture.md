# TranslateIT System Architecture

## Runtime route

TranslateIT has one user-facing runtime route:

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

No other launcher route is approved.

## RustApp ownership

`EngineData/LauncherApp/RustApp` owns:

- desktop app shell,
- Tauri/Rust commands,
- frontend UI,
- runtime status panels,
- validation command exposure,
- build and package route.

## Local AI worker ownership

`EngineData/LauncherApp/Workers/realtime_local_worker.py` owns local inference orchestration for:

- Faster Whisper ASR,
- MarianMT Realtime translation,
- NLLB Quality translation,
- Piper TTS orchestration.

This worker is intentionally retained until local inference is rewritten natively or packaged through another approved local runtime. It is not a UI engine and must not become another app route.

## Runtime profiles

User-visible runtime profiles should remain simple:

- `Realtime` - lower latency path using MarianMT ID to EN.
- `Quality` - higher quality path using NLLB 200 distilled 600M.

Do not expose internal model names as confusing user-facing choices unless needed in diagnostics.

## Model asset folders

```text
EngineData/TranscriptEngine/ModelData/
EngineData/TranslateEngine/ModelData/
EngineData/VoiceEngine/Piper/
```

These folders are local asset slots. They should not contain committed source code or model binaries. Model binaries stay local and ignored by Git.

## Development and documentation route

Documentation:

```text
DevelopingData/Documentation
```

Tooling:

```text
DevelopingData/Tooling/Scripts/Execution
```

Quality references:

```text
DevelopingData/Quality
```

Samples:

```text
DevelopingData/Samples
```

## Retired paths

The following are retired and must not return:

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
```

## Validation route

RustApp validation scripts use:

```text
DevelopingData/Tooling/Scripts/Execution
```

Run from:

```text
EngineData/LauncherApp/RustApp
```

Core commands:

```powershell
npm run validate:internal
npm run validate:full
npm run smoke:worker
npm run status:readiness
```

## Readiness truth rule

Validation scripts and documentation must not mark the app professionally ready until evidence exists for local build/package, local model readiness, persistent worker smoke, real microphone ASR, translation, TTS, and end-to-end latency.
