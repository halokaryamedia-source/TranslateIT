# UserData

## Purpose
- Hold runtime cache, operational logs, and user-approved saved data.
- Keep user-facing persistence separate from development documentation and engine code.

## Allowed files
- `README.md`
- `CacheData/`
- `LogData/`
- `SavedData/`

## Current sections
- `CacheData/` - disposable runtime cache, audio segments, and session state
- `LogData/` - runtime logs, diagnostics, and validation reports
- `SavedData/` - user-approved saved sessions and persistent exports

## Must not be placed here
- Engine source files
- Project documentation
- Random developer scratch files
- Unapproved root-level folders
- Private user documents outside the approved runtime layout

## Naming rules
- Use English only.
- Keep user-data paths stable.
- Separate temporary material from saved material.

## Related documentation path
- `DevelopingData/DocumentationData/SourceDocument/MASTER_PROJECT_DOCUMENTATION.md`
