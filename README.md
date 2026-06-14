# TranslateIT

TranslateIT is a local speech-to-text, translation, and voice-output desktop application.

## Current status

The project is in Rust/Tauri migration and structure-cleanup phase. The source tree is organized around a packaged desktop runtime route and a single development workspace.

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
TranslateIT.cmd
```

## Root ownership

- `TranslateIT.cmd` - root Windows shortcut launcher for the packaged app or installer only.
- `DevelopingData/` - developer documentation, concise reports, samples, quality references, and Node/PowerShell tooling.
- `EngineData/` - Rust/Tauri app, approved local AI worker, and local model/runtime asset slots.
- `Launcher/` - release-launcher support assets and static UI preview references.
- `UserData/` - local runtime cache, logs, saved work, and validation evidence.

## Active app route

The professional entry is still the packaged Tauri desktop app generated from:

```text
EngineData/LauncherApp/RustApp
```

The root shortcut:

```text
TranslateIT.cmd
```

only opens the packaged release executable or the NSIS installer when available. It must not start dev server, browser route, Python UI, or worker directly.

Developer mode remains inside RustApp only:

```powershell
cd EngineData/LauncherApp/RustApp
npm run dev
```

## UI preview

Static design preview for correction:

```text
Launcher/Preview/TranslateIT_UI_Preview.html
```

This preview is for visual review only and is not the runtime app route.

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

It is not a launcher, UI engine, repository validator, or legacy desktop route.

## Retired roots and folders

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

## Safety and cleanliness rules

- Keep root clean: only `TranslateIT.cmd` is allowed as root launcher shortcut.
- Runtime cache, logs, local models, and user-generated data stay out of Git.
- Keep documentation under `DevelopingData/Documentation`.
- Keep executable validation tooling under `DevelopingData/Tooling`.
- Keep runtime app code under `EngineData/LauncherApp/RustApp`.
- Keep runtime assets under `EngineData/RuntimeAssets`.
- Keep user runtime outputs under `UserData`.
