# Structure Cleanup Report

## Result

TranslateIT development files are consolidated under:

```text
DevelopingData/
  Documentation/
  Quality/
  Samples/
  Tooling/
```

Runtime files are isolated under:

```text
EngineData/
  LauncherApp/
  RuntimeAssets/
```

## Active routes

Application route:

```text
EngineData/LauncherApp/RustApp -> Tauri packaged TranslateIT app
```

Documentation route:

```text
DevelopingData/Documentation/
```

Tooling route:

```text
DevelopingData/Tooling/Scripts/Execution/
```

Runtime asset route:

```text
EngineData/RuntimeAssets/
```

Validation evidence route:

```text
UserData/LogData/RustAppValidation/
```

## Retired paths

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
TranslateIT.vbs
```

## Python policy

The only approved Python file in the active project runtime is:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

Rust/Tauri, repository, structure, evidence, and CI checks use Node or PowerShell tooling. Python validation scripts are retired from `DevelopingData`.

## Important rule

Do not create parallel documentation, tooling, or runtime folders. Add future documentation under `DevelopingData/Documentation`, future validation tooling under `DevelopingData/Tooling`, runtime app code under `EngineData/LauncherApp/RustApp`, runtime assets under `EngineData/RuntimeAssets`, and user runtime output under `UserData`.

## Readiness truth

The structure is cleaner, but professional application readiness still requires target-PC validation evidence for build, packaging, local model readiness, persistent worker smoke, microphone ASR, translation, TTS, and latency.
