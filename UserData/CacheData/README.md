# CacheData

## Purpose

`CacheData` holds disposable runtime cache, temporary audio segments, temporary TTS output, and current session state.

## Allowed files

- `README.md`
- Temporary audio segments
- Temporary TTS audio
- Current session cache material
- Debug captures when debug mode is explicitly enabled

## Rules

- Do not place permanent transcript history here.
- Do not place user-approved saved sessions here.
- Do not place documentation or engine source files here.
- Move final user-approved outputs to `UserData/SavedProject`.
- Keep this folder disposable unless the user explicitly saves a session elsewhere.
