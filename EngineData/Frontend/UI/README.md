# Frontend UI

## Purpose

`UI` documents visible interface ownership for TranslateIT.

Current active source is still inside the Tauri package:

```text
EngineData/LauncherApp/RustApp/src/app/launcher
```

## Owns

- Main chat page layout.
- Sidebar navigation.
- Composer input.
- Settings pages.
- Status indicators.
- Microphone and send button presentation.
- User-facing copy and labels.

## Rules

- Keep UI simple, readable, and close to the approved ChatGPT-like direction.
- Keep component names understandable.
- Keep UI-only files separate from backend runtime files.
