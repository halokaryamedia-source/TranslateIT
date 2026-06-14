# EngineData and DeveloperData Structure Cleanup Report

## Goal

Make `DeveloperData` and `EngineData` professional, modular, and easy to update after the Rust/Tauri migration.

## DeveloperData cleanup

Old structure retired:

```text
DeveloperData/TechnicalDocumentation/
```

New structure:

```text
DeveloperData/
  README.md
  Guides/
    Repository/
      README.md
      GitHubSetupGuide.md
  Research/
    VoiceLab/
      README.md
      VoiceLabResearchBrief.md
      VoiceLabResearchNotes.md
  Templates/
    Repository/
      gitignore_template.txt
```

Reason:

- `Guides` is for setup and maintenance instructions.
- `Research` is for exploratory documents that must not become runtime code.
- `Templates` is for reusable reference files.

## EngineData cleanup

New intended layout:

```text
EngineData/
  README.md
  LauncherApp/
    README.md
    RustApp/
    Workers/
  TranscriptEngine/
    README.md
    ModelData/
  TranslateEngine/
    README.md
    ModelData/
  VoiceEngine/
    README.md
    Piper/
```

Active route:

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

Approved Python exception:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

That worker remains because local ASR, translation, and TTS inference still depend on Python ecosystem libraries.

## Removed or retired direction

The cleanup removes the old idea of multiple runtime routes. Python UI/launcher modules, direct helper launchers, old translation engine modules, old transcript pipeline modules, and old TTS placeholder routes are not part of the new architecture.

## New validation guard

Added checker:

```text
DevelopingData/ToolKitData/Scripts/Execution/check_engine_developer_structure.py
```

It validates:

- `DeveloperData` uses the new modular layout.
- old `TechnicalDocumentation` path is gone.
- `EngineData` has RustApp, Workers, TranscriptEngine, TranslateEngine, and VoiceEngine ownership docs.
- `EngineData` Python is limited to the approved local AI worker.
- old launcher helpers are not present.

## Remaining truth

The structure is now cleaner, but professional app readiness still depends on local build/package and runtime smoke evidence on the target PC.
