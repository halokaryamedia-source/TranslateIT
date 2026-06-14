# UserData

## Purpose

`UserData` holds local runtime cache, operational logs, validation evidence, and user-approved saved project data.

## Current layout

```text
UserData/
  README.md
  CacheData/
  LogData/
  SavedProject/
```

## Folder ownership

- `CacheData/` - disposable runtime cache and temporary session material.
- `LogData/` - runtime logs, diagnostics, and validation evidence.
- `SavedProject/` - user-approved saved chat sessions and final work outputs.

## Rules

- Do not store engine source files here.
- Do not store project documentation here.
- Do not restore the retired `SavedData` route.
- Keep temporary material in `CacheData` and final user-visible saved work in `SavedProject`.
- Keep runtime logs and validation evidence in `LogData`.
