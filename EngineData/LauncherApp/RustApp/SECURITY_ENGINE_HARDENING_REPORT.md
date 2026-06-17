# TranslateIT Security and Engine Hardening Report

Branch: `Dev-Rust`
App route: `EngineData/LauncherApp/RustApp`

## Current progress

Overall hardening progress: 97%

## Completed changes

### Privacy log/evidence hardening

Status: Complete

- Audio pipeline evidence now uses redacted schema `translateit.audio_pipeline_evidence.v5.redacted`.
- Audio pipeline evidence stores metadata only, not full transcript text or full translated text.
- Runtime audio pipeline logs now record character counts and stage summaries instead of raw user speech/translation payloads.
- Audio/worker paths in audio pipeline evidence are reduced to safe file labels instead of full local paths.
- Manual translation fallback errors no longer include a source-text preview.
- Local hardening validation result is ignored by Git to reduce accidental commit of local path/error details.

Touched files:

- `src-tauri/src/engine/capture_lifecycle.rs`
- `src-tauri/src/engine/manual_translation.rs`
- `scripts/validate_security_hardening.mjs`
- `.gitignore`

### Tauri command surface hardening

Status: Complete for current UI runtime path

- Reduced the exposed Tauri command handler list to the command set used by the active desktop UI runtime.
- Removed internal planning/dry-run/native execution commands from the exposed invoke handler surface.
- Added security validator deny-markers for high-risk internal command names so they do not return unnoticed.

Touched files:

- `src-tauri/src/main.rs`
- `scripts/validate_security_hardening.mjs`

### Local worker payload hardening

Status: Complete

- Added max worker request size.
- Added max translation text size.
- Added max TTS text size.
- Added max transcript text size.
- Added max audio input file size.
- Added max generation token limit.
- Sanitizes worker command names before dispatch.
- Bounds numeric worker inputs such as ASR beam size, temperature, and translation generation tokens.

Touched file:

- `../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py`

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
- Added a panic-safe drop guard so the active-worker flag is released even if the background worker exits unexpectedly.

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
- Sanitized input/output audio device identifiers.
- Restricted voice actor profile root to approved relative directories.
- Blocks absolute paths, drive-letter paths, parent traversal, control characters, and long setting values.
- Runtime settings are now written through a temporary file before rename to reduce corruption risk.

Touched file:

- `src-tauri/src/engine/settings.rs`

### Runtime path discovery hardening

Status: Complete

- Project root discovery now checks both current working directory ancestors and executable directory ancestors.
- Discovery note now clearly reports whether runtime root markers were verified or whether fallback mode is being used.

Touched file:

- `src-tauri/src/engine/paths.rs`

### Runtime log growth control

Status: Complete

- Added max runtime log file size.
- Added `.previous.jsonl` rotation before append when the active log exceeds the safe size limit.
- Keeps log filename validation in place.

Touched file:

- `src-tauri/src/engine/logging.rs`

### Frontend attachment input hardening

Status: Complete

- Added max attachment filename length.
- Sanitizes attachment filenames before they are shown in UI notices or inserted into composer text.
- Removes control characters from attachment names.
- Replaces path separators in attachment names.

Touched file:

- `src/app/launcher/launcherController.ts`

### Tauri CSP hardening

Status: Complete

- Added `object-src 'none'`.
- Added `frame-src 'none'`.
- Added `base-uri 'none'`.
- Added `form-action 'none'`.
- Added explicit `media-src` for local media/asset usage.

Touched file:

- `src-tauri/tauri.conf.json`

### Dependency audit gate

Status: Added, pending local run

- Added `npm run audit:deps`.
- Included dependency audit in `validate:internal` and `validate:full`.

Touched file:

- `package.json`

### Security hardening validation gate

Status: Added, pending local run

- Added `npm run validate:security-hardening`.
- Checks required security-hardening markers across privacy log/evidence hardening, Tauri command surface, local worker payload limits, worker bridge, chat/session persistence, settings, logging, paths, frontend attachment handling, and CSP.
- Includes deny-markers for internal commands that should not be exposed by the active UI runtime command handler.
- Included in `validate:internal` and `validate:full`.

Touched files:

- `scripts/validate_security_hardening.mjs`
- `package.json`

### Local hardening validation runner

Status: Added, pending local run

- Added one-command local validation runner for Windows development machines.
- Runs npm install, security hardening validation, dependency audit, TypeScript typecheck, Rust cargo check, frontend build, and optional Tauri build.
- Writes `LOCAL_HARDENING_VALIDATION_RESULT.md` with pass/fail details.

Touched files:

- `scripts/run_local_hardening_validation.ps1`
- `package.json`

## Pending items

### Dependency security remediation

Status: Pending local validation

The previous validation report recorded `npm audit` findings in Vite/esbuild. The audit gate is now part of validation, but safe dependency remediation still requires running package-manager resolution locally so `package.json` and `package-lock.json` remain synchronized.

Required local command from `EngineData/LauncherApp/RustApp`:

```powershell
npm.cmd run validate:local-hardening
```

Do not manually fake `package-lock.json` integrity entries. If `npm install` updates `package-lock.json`, commit that lockfile update after the local validation run.

### Full build validation

Status: Pending local machine

The GitHub connector can update files but cannot run the local Windows/Tauri build pipeline. Run the command above before marking this hardening pass as release-ready.

## Current readiness estimate

- Internal testing readiness: 97/100
- Production/client readiness: 78/100

Production readiness remains blocked by dependency audit validation, full local build validation, and missing runtime model assets.
