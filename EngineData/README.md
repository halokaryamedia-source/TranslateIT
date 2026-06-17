# EngineData

## Purpose

`EngineData` is the runtime ownership layer for TranslateIT.

Current root split:

- `Frontend/` - frontend ownership notes and naming guide.
- `Backend/` - backend runtime ownership map, worker, contracts, assets, and runtime-core rules.
- `LauncherApp/` - active desktop app package route.

## Current layout

```text
EngineData/
  README.md
  Frontend/
    README.md
    UI/
    AppShell/
  Backend/
    README.md
    RuntimeCore/
    LocalWorker/
      WorkerRuntime/
    RuntimeContracts/
    RuntimeAssets/
  LauncherApp/
    README.md
    RustApp/              # current physical package folder; approved target name is App
```

## Active desktop app route

Current physical route:

```text
EngineData/LauncherApp/RustApp
```

Approved target route for the next package-path migration:

```text
EngineData/LauncherApp/App
```

## App-owned documentation

App-specific preview, UI reference, report, checklist, and evidence documents stay inside the app package:

```text
EngineData/LauncherApp/RustApp/DesignPreview
EngineData/LauncherApp/RustApp/UI_PAGE_TEMPLATE.md
EngineData/LauncherApp/RustApp/UI_REFERENCE_GUIDE.md
EngineData/LauncherApp/RustApp/docs/ui-reference
EngineData/LauncherApp/RustApp/*REPORT*.md
EngineData/LauncherApp/RustApp/*REPORT*.json
EngineData/LauncherApp/RustApp/*CHECKLIST*.md
```

## Frontend ownership

```text
EngineData/LauncherApp/RustApp/src/app
EngineData/LauncherApp/RustApp/src/app/launcher
EngineData/LauncherApp/RustApp/src/app/engineTranslate
EngineData/LauncherApp/RustApp/index.html
```

## Backend ownership

```text
EngineData/LauncherApp/RustApp/src-tauri/src/commands
EngineData/LauncherApp/RustApp/src-tauri/src/engine
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py
EngineData/Backend/RuntimeContracts
EngineData/Backend/RuntimeAssets
```

## Runtime asset slots

```text
EngineData/Backend/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo/
EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en/
EngineData/Backend/RuntimeAssets/Translation/ModelData/nllb-200-distilled-600M/
EngineData/Backend/RuntimeAssets/Voice/Piper/
```

These local runtime assets are ignored by Git.

## Retired EngineData root folders

```text
EngineData/TranscriptEngine/
EngineData/TranslateEngine/
EngineData/VoiceEngine/
EngineData/RuntimeAssets/
EngineData/LauncherApp/Workers/
```

## Rules

- Do not add active runtime code under `DevelopingData`.
- Keep app-specific documentation inside `EngineData/LauncherApp/RustApp` until the physical rename to `App` is complete.
- Do not add Python launcher/UI modules back under `EngineData/LauncherApp`.
- Do not add Python source modules under runtime assets.
- Keep user data, logs, cache, generated audio, and model binaries out of Git.
- Keep runtime contracts under `EngineData/Backend/RuntimeContracts`.
- Keep runtime assets under `EngineData/Backend/RuntimeAssets`.
- Keep backend worker files under `EngineData/Backend/LocalWorker/WorkerRuntime`.
