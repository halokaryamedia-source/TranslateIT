# Frontend AppShell

## Purpose

`AppShell` documents the desktop shell and navigation ownership for TranslateIT.

Current active source is still inside:

```text
EngineData/LauncherApp/RustApp/src/app/launcher
```

## Owns

- App frame.
- Sidebar shell.
- Topbar shell.
- Settings shell.
- Window-level user flow.
- Frontend routing or page switching.

## Rules

- Keep shell logic separate from backend command logic.
- Keep desktop shell behavior inside the Tauri app route.
- Do not add alternate launcher routes here.
