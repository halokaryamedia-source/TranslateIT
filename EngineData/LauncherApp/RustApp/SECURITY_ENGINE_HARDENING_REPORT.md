# TranslateIT Security and Engine Hardening Report

Branch: `Dev-Rust`
App route: `EngineData/LauncherApp/RustApp`

## Current progress

Overall hardening progress: 82%

## Completed changes

### Worker bridge safety

Status: Complete

- Added timeout guard for Rust-to-Python worker calls.
- Kills worker child process when the worker exceeds the timeout.
- Limits worker stdout reads to prevent oversized JSON payloads from consuming memory.
- Applies to manual text translation and audio pipeline handoff.

Touched files:

- `src-tauri/src/engine/manual_translation.rs`
- `src-tauri/src/engine/capture_lifecycle.rs`

### Audio pipeline overlap guard

Status: Complete

- Added a single-flight guard for the audio pipeline background worker.
- Prevents repeated stop/capture actions from spawning overlapping ASR > Translate > TTS pipeline workers.

Touched file:

- `src-tauri/src/engine/capture_lifecycle.rs`

### Chat/session persistence limits

Status: Complete

- Added max message size limit.
- Added max messages per session.
- Added max chat session file size.
- Added max chat list scan rows and returned rows.
- Added atomic-style temporary-file write for chat session saves.
- Removed `system` as a persisted chat role from launcher chat storage; unknown roles now fall back to `user`.

Touched file:

- `src-tauri/src/engine/session_chat.rs`

### Runtime settings hardening

Status: Complete

- Sanitized voice actor profile ID.
- Restricted voice actor profile root to approved relative directories.
- Blocks absolute paths, drive-letter paths, parent traversal, control characters, and long setting values.

Touched file:

- `src-tauri/src/engine/settings.rs`

### Runtime log growth control

Status: Complete

- Added max runtime log file size.
- Added `.previous.jsonl` rotation before append when the active log exceeds the safe size limit.
- Keeps log filename validation in place.

Touched file:

- `src-tauri/src/engine/logging.rs`

### Tauri CSP hardening

Status: Complete

- Added `object-src 'none'`.
- Added `frame-src 'none'`.
- Added `base-uri 'none'`.
- Added `form-action 'none'`.
- Added explicit `media-src` for local media/asset usage.

Touched file:

- `src-tauri/tauri.conf.json`

## Pending items

### Dependency security remediation

Status: Pending local validation

The previous validation report recorded `npm audit` findings in Vite/esbuild. The safe dependency update requires running package-manager resolution locally so `package.json` and `package-lock.json` remain synchronized.

Required local commands from `EngineData/LauncherApp/RustApp`:

```powershell
npm.cmd install
npm.cmd audit --audit-level=moderate
npm.cmd run typecheck
npm.cmd run check:rust
npm.cmd run build:frontend
npm.cmd run build
```

Do not manually fake `package-lock.json` integrity entries.

### Full build validation

Status: Pending local machine

The GitHub connector can update files but cannot run the local Windows/Tauri build pipeline. Run the commands above before marking this hardening pass as release-ready.

## Current readiness estimate

- Internal testing readiness: 82/100
- Production/client readiness: 62/100

Production readiness remains blocked by dependency audit validation, full local build validation, and missing runtime model assets.
