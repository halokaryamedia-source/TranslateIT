# CacheData

## Purpose
- Hold temporary session data, temporary replay media, and debug-only cache material.
- Keep the entire folder disposable unless the user explicitly saves a session elsewhere.

## Allowed files
- `README.md`
- Temporary audio segments
- Temporary TTS audio
- Current session cache material
- Debug captures when debug mode is enabled

## Current subfolders
- `audio_segments/` - generated segment-level audio and TTS metadata
- `RuntimeLogs/` - cache-side runtime traces and guard records
- `session_cache/` - per-session disposable cache material

## Must not be placed here
- Permanent transcript history
- User-approved saved sessions
- Documentation files
- Engine code

## Naming rules
- Use English only.
- Use clear session and segment names.
- Keep cache material disposable unless a user explicitly saves the session.

## Related documentation path
- `../../DevelopingData/DocumentationData/SourceDocument/MASTER_PROJECT_DOCUMENTATION.md`
