# EngineData

## Purpose

`EngineData` is the runtime ownership layer for TranslateIT.

Target root split:

- `Frontend/` - UI ownership map, design review, app shell, and frontend naming rules.
- `Backend/` - backend ownership map, runtime core, local worker, runtime contracts, runtime assets, and inference bridge rules.
- `LauncherApp/` - temporary active Rust/Tauri build route that still needs build-path migration.

## Current layout

```text
EngineData/
  README.md
  Frontend/
    README.md
    UI/
    AppShell/
    DesignReview/
      DesignPreview/
      UIReference/
      UIPageTemplate.md
      UIReferenceGuide.md
  Backend/
    README.md
    RuntimeCore/
    LocalWorker/
    RuntimeContracts/
    RuntimeAssets/
  LauncherApp/              # temporary active build route
```

## Active runtime route

The user-facing route is still generated from:

```text
EngineData/LauncherApp/RustApp
```

This is the last non-final folder under `EngineData`. It remains only because moving it requires build-path migration.

## Frontend ownership

Frontend runtime source currently lives inside RustApp because Tauri expects the app package there:

```text
EngineData/LauncherApp/RustApp/src/app
EngineData/LauncherApp/RustApp/src/app/launcher
EngineData/LauncherApp/RustApp/src/app/engineTranslate
EngineData/LauncherApp/RustApp/index.html
```

Preview and UI reference material lives here:

```text
EngineData/Frontend/DesignReview
```

## Backend ownership

Backend runtime source currently lives inside RustApp and the worker route:

```text
EngineData/LauncherApp/RustApp/src-tauri/src/commands
EngineData/LauncherApp/RustApp/src-tauri/src/engine
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

Runtime contracts and model readiness manifests live here:

```text
EngineData/Backend/RuntimeContracts
```

Runtime asset slots live here:

```text
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
```

## Rules

- Do not add active runtime code under `DevelopingData`.
- Do not add Python launcher/UI modules back under `EngineData/LauncherApp`.
- Do not add Python source modules under runtime assets.
- Keep user data, logs, cache, generated audio, and model binaries out of Git.
- Keep UI review and reference files under `EngineData/Frontend/DesignReview`.
- Keep runtime contracts under `EngineData/Backend/RuntimeContracts`.
- Keep runtime assets under `EngineData/Backend/RuntimeAssets`.
- Keep report/checklist/evidence documents under `DevelopingData/Documentation/Reports/Engineering`.
- Move `LauncherApp` under backend ownership only after safe build-path migration.
