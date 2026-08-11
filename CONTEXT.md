# TranslateIT — Current Context

This file stores stable current project facts. Active continuation belongs in `docs/knowledge/next-action.md`; durable reasoning belongs in `docs/knowledge/decision-log.md`.

## Authority

- Development authority: branch `New`.
- `V1-Advance`, older branches, and `DevelopingData` are historical/recovery evidence only.
- Current product policy is `docs/foundation/01-product-overview.md` + `02-product-requirements.md`.

## Product Target

TranslateIT is a simple local Windows translator focused on Indonesian and English.

```text
Meeting
├─ Start Translation
├─ ID speech -> final ID transcript -> EN translation -> EN TTS
├─ translated voice -> TranslateIT Meeting Microphone
├─ optional EN Meeting Sound -> ID text
└─ Stop Translation

Text
├─ ID <-> EN
├─ Translate
└─ Copy

Settings
├─ Meeting devices/setup
└─ Advanced / Diagnostics
```

Normal Meeting lifecycle:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

Pause/Resume, History/Saved, Audio Studio, Documents, Tone/Context, partial translated subtitles, custom voice, additional languages, and user-facing Realtime/Quality modes are not initial core.

## Runtime Architecture

```text
Rust/Tauri desktop application
+
ONE Python local worker
```

The worker owns ASR, direction-based ID <-> EN translation, and TTS execution. Rust owns Meeting/session authority, Windows audio integration, routing, settings, and desktop integration. Do not create a parallel engine, shell, readiness service, model selector, or worker launcher architecture.

## Translation Contract

- Meeting required outbound: Indonesian -> English.
- Text: Indonesian -> English and English -> Indonesian.
- Current worker routes `id->en` to `marianmt-id-en` and `en->id` to `marianmt-en-id`.
- Finalized stable speech is normal Meeting translation truth.
- Source text is not silently truncated and known incomplete generation is not promoted.
- Previous turns, History, and standalone Text are not automatic model context.
- Optional incoming EN -> ID may degrade/disable without blocking safe outbound.

## Meeting Ownership

`commands/meeting_session.rs` + `engine/runtime_state.rs` remain the application Meeting owner.

Start establishes one session/authority. Navigation does not stop/recreate it. Stop revokes output authority before resource cleanup, stops both audio lanes, cancels/joins Meeting work, clears transient conversation/audio state, and ends the session. Safe application close delegates to the same Stop owner.

The bounded committed-turn store is transient Live transcript state only; Meeting Stop has no History persistence dependency.

The old pipeline/handoff state and its final no-state cleanup tombstones are removed. Meeting rollback/Stop now clean only resources and transient state that still exist.

## Current Product Runtime Surface

The frontend has one normal module entry: `src/main.ts`. The old parallel Audio Studio entry and retry polling are removed.

The frontend/Tauri product surface is bounded to current Meeting/Text/setup needs: Meeting status/turns/Start/Stop, helper status/start/worker status, Mic Test Start/Stop, audio status/device probes, settings load/save, Text Translate, and explicit Verify Models.

Meeting Microphone route modules remain internal dependencies of `meeting_session.rs`; they are not a manual frontend command surface.

## Rust Engine Surface

The Rust engine graph is reduced to current owners only:

```text
engine/
├─ audio/
├─ capture_lifecycle.rs
├─ logging.rs
├─ paths.rs
├─ runtime_settings.rs
├─ runtime_state.rs
├─ settings.rs
└─ state.rs
```

The old adapter/planning tree, History/Chat/session-save persistence, transcript-session planning, native inference/backend candidates, CUDA/status/report modules, domain/services scaffolding, related dry-run/orchestration leaves, and old handoff-state compatibility path are removed from `New`.

Backend `RuntimeContracts/` JSON scaffolding is removed because the current worker, active Tauri path, and current validators do not consume it; source/docs remain the contract authorities.

## Persisted Settings Contract

Current persisted settings schema is version 6 and contains only current product state:

```text
schema_version
source_language
target_language
meeting_setup_state
meeting_setup_checkpoint
audio.input_device_id
audio.output_device_id
```

The previous larger schema is tolerated by the same `engine/settings.rs` owner. Serde ignores retired keys while preserving the current values; the next normal save writes only the small schema. There is no generic migration framework or second settings store.

Removed persisted concepts include `language_focus_mode`, `runtime_profile`, `history_enabled`, old sensitivity/mode flags, CPU/degraded audio flags, autoplay flags, and custom voice/profile state.

## Normal Readiness Cost

Normal `loadProductRuntimeSnapshot()` reads only settings, Meeting session status, helper status, microphone/input status, and worker capability status when helper is ready. It does not fetch full status bundles, model inventory, or native GPU policy on every refresh.

Meeting preflight still checks required model presence through the cached Rust inventory; explicit Verify Models refreshes that cache.

## Validation Boundary

The old matrix/report-heavy validation system is removed. Current persistent source validation is intentionally small: core/startup source contract, internal Meeting route contract, Rust manifest preflight, and frontend build preflight. Package/path preflight remains separate. `check:tauri-rust-local` remains explicit local compile proof.

Static validators do not prove compile, Tauri launch, models, Windows audio, rendered UI, latency, installer behavior, or clean-machine operation.

## Release Boundary

Initial controlled release keeps the local sidecar Setup direction and does not use a SHA-256/checksum/revision identity framework, artifact registry, downloader, or package manager.

Installed Python execution is now decided:

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/   -> existing Python worker/provider scripts
└─ PythonRuntime/   -> one private embedded CPython runtime + vendored packages
```

Canonical installed interpreter is:

```text
EngineData/Backend/LocalWorker/PythonRuntime/python.exe
```

The persistent worker and Meeting Microphone Python provider must use that same interpreter. A copied `.venv` and a frozen PyInstaller/Nuitka worker are not selected for the initial release. End users do not install Python, pip, uv, create environments, set worker-Python overrides, or rely on system `python`/`py`.

Development may retain repository-scoped Python overrides/`.venv`/system interpreter discovery, but those paths must not silently become packaged-release success paths.

Models remain in `RuntimeAssets`; Python packages such as `ctranslate2`, `faster-whisper`, `torch`, `transformers`, `soundfile`, and the Meeting Microphone provider's `sounddevice` are part of the prepared private Python runtime payload.

No dependency lock/hash framework is required for the initial controlled release unless concrete release drift later proves it necessary. The useful acceptance boundary remains approved prepared payload + deterministic placement + real installed and clean-machine execution.

## Proof Boundary

ChatGPT -> GitHub can establish source structure, direct wiring, and static ownership. This repository state does not prove Rust/TypeScript compilation, validator execution, Python payload construction/execution, Tauri launch, Windows audio/device behavior, model presence/load/quality/latency, installer behavior, or clean-machine installation.
