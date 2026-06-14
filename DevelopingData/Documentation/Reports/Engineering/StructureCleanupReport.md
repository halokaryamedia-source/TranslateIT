# Structure Cleanup Report

## Result

TranslateIT development files are now consolidated under:

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
  TranscriptEngine/
  TranslateEngine/
  VoiceEngine/
```

## Active routes

Application route:

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

Documentation route:

```text
DevelopingData/Documentation/
```

Tooling route:

```text
DevelopingData/Tooling/Scripts/Execution/
```

Validation evidence route:

```text
UserData/LogData/RustAppValidation/
```

## Retired paths

These paths are retired and should not return:

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

## Python policy

The only approved Python file under `EngineData` is:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

All other Python launcher/UI/engine modules under `EngineData` are retired. Python validation scripts may live under `DevelopingData/Tooling/Scripts/Execution`.

## Root policy

Expected root:

```text
.github/
DevelopingData/
EngineData/
Launcher/
UserData/
.gitattributes
.gitignore
README.md
TranslateIT.vbs
```

Do not add loose scripts, logs, cache, build output, alternate launcher files, or duplicate documentation roots to the repository root.

## Important rule

Do not create parallel documentation, tooling, or runtime folders. Add future documentation under `DevelopingData/Documentation`, future validation tooling under `DevelopingData/Tooling`, runtime code under `EngineData`, and user/runtime output under `UserData`.

## Readiness truth

The structure is cleaner, but professional application readiness still requires target-PC validation evidence for build, packaging, local model readiness, persistent worker smoke, microphone ASR, translation, TTS, and latency.
