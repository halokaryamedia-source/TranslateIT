# TranslateIT RustApp

## Purpose

`RustApp` is the active Tauri desktop package for TranslateIT.

This folder keeps the current build route stable. The wider ownership split is documented under:

```text
EngineData/Frontend/
EngineData/Backend/
```

## Current active build route

```text
EngineData/LauncherApp/RustApp
```

## Frontend source inside this package

```text
src/app/launcher/
src/app/engineTranslate/
index.html
```

Frontend ownership guide:

```text
EngineData/Frontend/
```

UI preview and UI reference documents are no longer stored at the RustApp root. They live under:

```text
EngineData/Frontend/DesignReview/
```

## Backend source inside this package

```text
src-tauri/src/commands/
src-tauri/src/engine/
../Workers/
```

Backend ownership guide:

```text
EngineData/Backend/
```

Runtime contracts and model manifest files live under:

```text
EngineData/Backend/RuntimeContracts/
```

Runtime assets live under:

```text
EngineData/RuntimeAssets/
```

## Development-only material

Reports, checklists, evidence templates, and validation notes belong under:

```text
DevelopingData/Documentation/Reports/Engineering/
```

Packaged runtime must not depend on `DevelopingData`.

## Rules

- Keep RustApp as the active Tauri package route until a safe build-path migration is approved.
- Keep user-facing UI code in frontend-owned paths.
- Keep runtime command and inference logic in backend-owned paths.
- Keep local models and generated runtime data out of Git.
- Do not put active runtime engine files under `DevelopingData`.
