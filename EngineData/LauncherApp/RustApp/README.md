# TranslateIT App

## Purpose

`RustApp` is the current folder name for the active Tauri desktop package. The approved user-facing name for this package is `App`.

The physical folder rename from `RustApp` to `App` is reserved for a dedicated package-path migration. Until then, this folder keeps all app package files and app-specific documentation together.

## Current active build route

```text
EngineData/LauncherApp/RustApp
```

## Approved target name

```text
EngineData/LauncherApp/App
```

## Frontend source inside this package

```text
src/app/launcher/
src/app/engineTranslate/
index.html
```

## Backend source inside this package

```text
src-tauri/src/commands/
src-tauri/src/engine/
```

## App documentation kept here

```text
DesignPreview/
UI_PAGE_TEMPLATE.md
UI_REFERENCE_GUIDE.md
docs/ui-reference/
LOCAL_MODEL_ENGINE_SETUP_REPORT.md
LOCAL_VALIDATION_REPORT.md
MANUAL_TEST_REPORT_TEMPLATE.md
PRE_TEST_CHECKLIST.md
RUNTIME_EVIDENCE_FLOW.md
RUNTIME_GAP_ESTIMATE.json
TESTING_READY.md
MODEL_PREPARATION_REPORT.json
MODEL_VALIDATION_REPORT.json
```

## External backend-owned runtime folders

```text
EngineData/Backend/LocalWorker/WorkerRuntime/
EngineData/Backend/RuntimeContracts/
EngineData/Backend/RuntimeAssets/
```

## Rules

- Keep this package as the active Tauri app route until the physical rename to `App` is done safely.
- Keep app-specific documentation inside this package.
- Do not move this package documentation into `Frontend`, `Backend`, or `DevelopingData` unless it is no longer app-specific.
- Keep worker runtime files under `Backend/LocalWorker/WorkerRuntime`.
- Keep runtime contracts under `Backend/RuntimeContracts`.
- Keep runtime assets under `Backend/RuntimeAssets`.
- Keep local models and generated runtime data out of Git.
