# Launcher

## Purpose

`Launcher` stores release-launcher support assets and visual preview references for TranslateIT.

## Current layout

```text
Launcher/
  README.md
  Preview/
    TranslateIT_UI_Preview.html
```

## Rules

- Do not place runtime engine source here.
- Do not place Python worker code here.
- Keep the real app route inside `EngineData/LauncherApp/RustApp`.
- Keep root `TranslateIT.cmd` as a convenience shortcut to the packaged app or installer only.
- Preview files are for design review only and are not runtime routes.
