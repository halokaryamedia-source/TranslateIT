# Dev-Pack Local Follow-Up

Branch: `Dev-Pack`
Date: 2026-06-18

## Purpose

This checklist records work that should be completed in the local development environment after the connector-side cleanup pass.

## Local tasks

1. Wire every remaining disposable frontend binding from `src/main.ts` or `LauncherController`.
2. Connect the cleanup callback returned by `bindLauncherEvents()`.
3. Add stale async render protection for developer evidence UI.
4. Add cleanup-safe messaging for voice output persistence UI.
5. Add duplicate-command protection for developer helper bridge UI actions.
6. Add stopped-state UI write protection for realtime status refresh.
7. Extend local path redaction in the Tauri bridge and verify it locally.
8. Run local validation commands:

```powershell
cd EngineData/LauncherApp/RustApp
npm run typecheck
npm run build:frontend
npm run validate:ui-reference
npm run validate:ui-template
npm run validate:runtime-flow
```

## Connector-completed items

- Lifecycle cleanup documentation created.
- Several launcher watchers and bindings now expose cleanup callbacks.
- Audio pipeline watcher can cancel result polling on unbind.
- Attachment warning timer is cleared on unbind.
- Reference UI timers are cleared on unbind.
- Audio device binding prevents overlapping device requests and avoids UI writes after unbind.
- Launcher event bindings use an `AbortController`.
