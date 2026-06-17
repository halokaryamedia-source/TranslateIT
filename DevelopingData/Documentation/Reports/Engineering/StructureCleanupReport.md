# Structure Cleanup Report

## Current result

TranslateIT root is restricted to the approved root areas and files:

```text
DevelopingData/
EngineData/
UserData/
.gitattributes
.gitignore
README.md
TranslateIT.lnk
```

## Development-only route

```text
DevelopingData/
  Documentation/
  Quality/
  Samples/
  Tooling/
```

`DevelopingData` must not contain active runtime engine files.

## Runtime route

```text
EngineData/
  Frontend/
  Backend/
  LauncherApp/
```

## Active app package route

Current physical package folder:

```text
EngineData/LauncherApp/RustApp
```

Approved target package folder for a later package-path migration:

```text
EngineData/LauncherApp/App
```

App-specific preview, UI reference, reports, checklists, and evidence notes stay inside the app package until that physical rename is completed.

## Backend runtime routes

```text
EngineData/Backend/LocalWorker/WorkerRuntime/
EngineData/Backend/RuntimeContracts/
EngineData/Backend/RuntimeAssets/
```

## User runtime output route

```text
UserData/CacheData/
UserData/LogData/
UserData/SavedProject/
```

Runtime outputs are ignored by Git except folder README placeholders.

## Retired paths confirmed unused

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
EngineData/RuntimeAssets/
EngineData/LauncherApp/Workers/
TranslateIT.vbs
Launcher/
Launcher/Preview/
```

## Python policy

The only approved Python runtime file route is:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py
```

Python validation scripts are not active runtime files and must not be restored into `DevelopingData` root-level legacy folders.

## Ignore policy

`.gitignore` protects:

```text
UserData/CacheData/**
UserData/LogData/**
UserData/SavedProject/**
EngineData/Backend/RuntimeAssets/ASR/ModelData/**
EngineData/Backend/RuntimeAssets/Translation/ModelData/**
EngineData/Backend/RuntimeAssets/Voice/Piper/**
EngineData/RuntimeAssets/**
```

`.gitattributes` exists at root and marks text/binary handling for scripts, images, icons, and the root shortcut.

## Remaining planned migration for Codex

Physical rename still pending:

```text
EngineData/LauncherApp/RustApp -> EngineData/LauncherApp/App
```

This must be done as a full package-path migration so Tauri, npm scripts, README references, shortcuts, tooling scripts, and package lock metadata are updated together.

## Readiness truth

The structure is cleaner, but professional application readiness still requires target-PC validation evidence for build, packaging, local model readiness, persistent worker smoke, microphone ASR, translation, TTS, and latency.
