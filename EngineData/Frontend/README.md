# EngineData Frontend

## Purpose

`Frontend` defines the UI-facing ownership area for TranslateIT.

The current active Tauri build path remains under `EngineData/LauncherApp/RustApp` to avoid breaking the package route. This folder clarifies which files are frontend-owned and how new UI work should be named.

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
  UI/            # visible UI components, pages, and interaction naming
  AppShell/      # desktop shell, top-level app frame, navigation ownership
  DesignReview/  # preview-only UI review notes and approval references
```

## Rules

- Keep UI naming clear and user-facing.
- Keep preview files separate from production runtime files.
- Do not place backend runtime code here.
- Do not place release-required files under `DevelopingData`.
