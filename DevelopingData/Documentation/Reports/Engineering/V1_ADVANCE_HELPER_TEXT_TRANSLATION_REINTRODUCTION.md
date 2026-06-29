# V1-Advance Helper Text Translation Reintroduction

Branch: `V1-Advance`
Status: source-side preparation started

## Purpose

This note records the current reintroduction path for helper-backed text translation.

## Current behavior

`commands::text_translate::translate_text` now prefers the already-running helper bridge for text translation when helper stdin/stdout/child are available.

If the helper bridge is not running, the command falls back to the existing engine text translation path.

If the helper bridge is running but translate fails, the command returns a blocked translation result instead of silently hiding the helper failure.

## Why this is useful

This prepares the real product direction:

```text
Rust/Tauri UI command -> long-running Python helper worker -> local translation model -> translated text
```

It avoids spawning a separate worker per text translation once the helper bridge is already running.

## Not claimed yet

This source change does not prove local Rust compile, helper spawn, model loading, or translation quality.

The next proof remains local Windows validation.
