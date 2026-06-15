# Launcher UI Modules

This folder contains the desktop Launcher UI layer only.

## Files
- `launcherController.ts`: main Launcher UI orchestrator. It wires user actions to runtime API calls and coordinates page state.
- `shell.ts`: static desktop shell/template for sidebar, home workspace, composer, and settings container.
- `dom.ts`: DOM lookup and strongly typed UI references.
- `settingsViews.ts`: Settings page view templates for General, Audio, Translate, and Developer tabs.
- `chatViews.ts`: chat list/card view helpers.
- `warmupViews.ts`: startup warmup progress view helpers.

## Boundary
Launcher modules should not call Tauri command names directly. Use `../engineTranslate/runtimeApi.ts` for backend access.

## Maintenance rule
Keep reusable UI fragments in small view helper modules. Keep `launcherController.ts` focused on orchestration and event wiring only.
