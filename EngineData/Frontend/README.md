# EngineData Frontend

## Purpose

`Frontend` defines the UI-facing ownership area for TranslateIT.

The current active Tauri package path remains under `EngineData/LauncherApp/RustApp`. The approved target package name is `App`.

## Current active frontend paths

```text
EngineData/LauncherApp/RustApp/index.html
EngineData/LauncherApp/RustApp/src/app
EngineData/LauncherApp/RustApp/src/app/launcher
EngineData/LauncherApp/RustApp/src/app/engineTranslate
```

## Frontend responsibility split

```text
Frontend/
  README.md
  UI/        # visible UI components, pages, and interaction naming
  AppShell/  # desktop shell, top-level app frame, navigation ownership
```

## App-specific UI documentation

Preview files, UI references, and app UI templates stay inside:

```text
EngineData/LauncherApp/RustApp
```

## Rules

- Keep UI naming clear and user-facing.
- Do not place backend runtime code here.
- Do not place release-required files under `DevelopingData`.
- Keep app-specific UI documentation inside the active app package.
