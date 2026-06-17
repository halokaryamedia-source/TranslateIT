# EngineData

## Purpose

`EngineData` is the runtime ownership layer for TranslateIT.

It is split by responsibility so the tree is easy to read:

- `Frontend/` - UI ownership map, design review, app shell, and frontend naming rules.
- `Backend/` - backend ownership map, runtime core, local worker, and inference bridge rules.
- `LauncherApp/` - current active Rust/Tauri build route.
- `RuntimeAssets/` - local model, Piper, and runtime asset slots that stay out of Git.

## Current layout

```text
EngineData/
  README.md
  Frontend/
    README.md
    UI/
    AppShell/
    DesignReview/
  Backend/
    README.md
    RuntimeCore/
    LocalWorker/
  LauncherApp/
    README.md
    RustApp/              # active Rust/Tauri desktop app build route
    Workers/              # approved local AI worker route
  RuntimeAssets/
    README.md
    ASR/                  # Faster Whisper local model slot
    Translation/          # MarianMT and NLLB local model slots
    Voice/                # Piper local runtime and voice slot
```

## Active runtime route

The user-facing route is still the packaged Tauri app generated from:

```text
EngineData/LauncherApp/RustApp
```

This path is kept stable to avoid breaking the build while the root ownership is cleaned.

## Frontend ownership

Frontend runtime source currently lives inside RustApp because Tauri expects the app package there:

```text
EngineData/LauncherApp/RustApp/src/app
EngineData/LauncherApp/RustApp/src/app/launcher
EngineData/LauncherApp/RustApp/src/app/engineTranslate
EngineData/LauncherApp/RustApp/index.html
```

`EngineData/Frontend` documents the ownership boundary and future-safe naming for UI, app shell, and design review files.

## Backend ownership

Backend runtime source currently lives inside RustApp and the worker route:

```text
EngineData/LauncherApp/RustApp/src-tauri/src/commands
EngineData/LauncherApp/RustApp/src-tauri/src/engine
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

`EngineData/Backend` documents the ownership boundary for Rust runtime core, command bridge, inference bridge, and local worker logic.

## Runtime asset slots

```text
EngineData/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo/
EngineData/RuntimeAssets/Translation/ModelData/marianmt-id-en/
EngineData/RuntimeAssets/Translation/ModelData/nllb-200-distilled-600M/
EngineData/RuntimeAssets/Voice/Piper/
```

These local runtime assets are ignored by Git.

## Retired EngineData root folders

```text
EngineData/TranscriptEngine/
EngineData/TranslateEngine/
EngineData/VoiceEngine/
```

Those separate root folders were consolidated into clearer ownership routes so the runtime root is easier to understand.

## Rules

- Do not add active runtime code under `DevelopingData`.
- Do not add Python launcher/UI modules back under `EngineData/LauncherApp`.
- Do not add Python source modules under `RuntimeAssets`.
- Keep `RuntimeAssets` for local model/runtime assets and README ownership only.
- Keep user data, logs, cache, generated audio, and model binaries out of Git.
- Add new UI work under the frontend ownership map first.
- Add new runtime/backend work under the backend ownership map first.
- Keep the user-facing route inside the packaged Rust/Tauri app.
