# TranslateIT

TranslateIT is a local speech-to-text, translation, and voice-output desktop application.

## Current status

The project is in Rust/Tauri migration and structure-cleanup phase. The source tree is organized around a single desktop runtime route and a single development workspace.

Do not claim the application is professionally ready until local build, packaging, local model readiness, persistent worker smoke, microphone ASR, translation, TTS, and end-to-end latency evidence pass on the target PC.

## Root layout

Only these root folders/files are expected:

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

## Root ownership

- `DevelopingData/` - all developer documentation, research, reports, samples, quality references, validation scripts, and tooling.
- `EngineData/` - Rust/Tauri app, approved local AI worker, and local model/runtime asset slots.
- `Launcher/` - reserved launcher packaging assets.
- `UserData/` - local runtime cache, logs, saved work, and validation evidence.
- `TranslateIT.vbs` - the only user-facing root launcher entry point.

## Active app route

Use only:

```text
TranslateIT.vbs
```

The launcher resolves to:

```text
EngineData/LauncherApp/RustApp
```

Do not add alternate Python launcher, BAT helper, debug route, browser-only route, or old runtime path.

## Approved Python exception

The only approved Python file under `EngineData` is:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

This file is retained because local ASR, translation, and TTS currently use Python ecosystem libraries:

- Faster Whisper for ASR.
- MarianMT for Realtime translation.
- NLLB for Quality translation.
- Piper orchestration for TTS.

It is not a launcher, UI engine, or legacy desktop route.

## Retired roots and folders

Do not recreate:

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

## Safety and cleanliness rules

- Keep root clean: no loose Python files, BAT/CMD/PS1 scripts, logs, cache folders, build output, or duplicate documentation roots.
- Runtime cache, logs, local models, and user-generated data stay out of Git.
- Keep documentation under `DevelopingData/Documentation`.
- Keep executable validation tooling under `DevelopingData/Tooling`.
- Keep runtime app code under `EngineData`.
- Keep user runtime outputs under `UserData`.
