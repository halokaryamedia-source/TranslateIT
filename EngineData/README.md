# EngineData

## Purpose

`EngineData` is the runtime layer for TranslateIT. It is intentionally split into only two top-level responsibilities:

- `LauncherApp/` - the active desktop app route and approved local AI worker.
- `RuntimeAssets/` - local model, Piper, and runtime asset slots that stay out of Git.

## Current layout

```text
EngineData/
  README.md
  LauncherApp/
    README.md
    RustApp/              # active Rust/Tauri desktop app
    Workers/              # approved local AI worker
  RuntimeAssets/
    README.md
    ASR/                  # Faster Whisper local model slot
    Translation/          # MarianMT and NLLB local model slots
    Voice/                # Piper local runtime and voice slot
```

## Active runtime route

The only user-facing app route is:

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

The Rust/Tauri app may call the approved local worker:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

That Python worker is intentionally retained for local ASR, translation, and TTS inference orchestration. It is not a legacy launcher or UI engine.

## Runtime asset slots

```text
EngineData/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo/
EngineData/RuntimeAssets/Translation/ModelData/marianmt-id-en/
EngineData/RuntimeAssets/Translation/ModelData/nllb-200-distilled-600M/
EngineData/RuntimeAssets/Voice/Piper/
```

These local runtime assets are ignored by Git.

## Retired EngineData root folders

Do not recreate:

```text
EngineData/TranscriptEngine/
EngineData/TranslateEngine/
EngineData/VoiceEngine/
```

Those separate root folders were consolidated into `EngineData/RuntimeAssets/` to keep the runtime root easier to understand.

## Rules

- Do not add Python launcher/UI modules back under `EngineData/LauncherApp`.
- Do not add Python source modules under `RuntimeAssets`.
- Keep `RuntimeAssets` for local model/runtime assets and README ownership only.
- Keep user data, logs, cache, generated audio, and model binaries out of Git.
- Add new runtime features inside Rust/Tauri first, then bridge to the worker only when local inference is required.
- Do not create another app route beside `TranslateIT.vbs -> EngineData/LauncherApp/RustApp`.
