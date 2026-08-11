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

The worker owns ASR, direction-based ID <-> EN translation, and TTS execution. Rust owns Meeting/session authority, Windows audio integration, routing, settings, and desktop integration. Do not create a parallel engine, shell, readiness service, or model selector.

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

Start establishes one session/authority. Navigation does not stop/recreate it. Stop revokes output authority before resource cleanup, stops both audio lanes, cancels/joins Meeting work, clears transient conversation/audio state, and ends the session. Safe application close delegates to the same Stop path.

The bounded committed-turn store is transient Live transcript state only; Meeting Stop has no History persistence dependency.

## Current Product Runtime Surface

The frontend has one normal module entry: `src/main.ts`. The old parallel Audio Studio entry and retry polling are removed.

The frontend/Tauri product surface is bounded to current Meeting/Text/setup needs: Meeting status/turns/Start/Stop, helper status/start/worker status, Mic Test Start/Stop, audio status/device probes, settings load/save, Text Translate, and explicit Verify Models.

Meeting Microphone route modules remain internal dependencies of `meeting_session.rs`; they are not a manual frontend command surface.

## Rust Engine Surface

The Rust engine graph has been reduced to current owners only:

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

The old adapter/planning tree, History/Chat/session-save persistence, transcript-session planning, native inference/backend candidates, CUDA/status/report modules, domain/services scaffolding, and related dry-run/orchestration leaves are removed from `New`.

The blanket `#![allow(dead_code)]` at the engine root is removed. Mic Test now owns only capture Start/Stop and refuses to stop a Meeting-owned session. `runtime_state.rs` owns current Meeting/Mic-Test session authority without the old realtime-handoff snapshot architecture.

Backend `RuntimeContracts/` JSON scaffolding is also removed because the current worker, active Tauri path, and current validators do not consume it; source/docs remain the contract authorities.

## Normal Readiness Cost

Normal `loadProductRuntimeSnapshot()` reads only settings, Meeting session status, helper status, microphone/input status, and worker capability status when helper is ready. It does not fetch full status bundles, model inventory, or native GPU policy on every refresh.

Meeting preflight still checks required model presence through the cached Rust inventory; explicit Verify Models refreshes that cache.

## Validation Boundary

The old matrix/report-heavy validation system is removed. Current persistent source validation is intentionally small: core/startup source contract, internal Meeting route contract, Rust manifest preflight, and frontend build preflight. Package/path preflight remains separate. `check:tauri-rust-local` remains explicit local compile proof.

Static validators do not prove compile, Tauri launch, models, Windows audio, rendered UI, latency, installer behavior, or clean-machine operation.

## Release Boundary

Initial controlled release keeps the local sidecar Setup direction but does not use a SHA-256/checksum/revision identity framework. Do not create an artifact registry, checksum service, payload identity controller, downloader, or package manager as a replacement.

The useful initial acceptance mechanism is approved prepared payload + deterministic placement + real installed worker/runtime execution.

## Remaining Simplification Boundary

The largest remaining inherited compatibility surface is persisted settings. Current Rust/frontend settings still carry fields for removed concepts such as `runtime_profile`, `history_enabled`, custom voice/profile paths, and several old audio toggles. Do not delete them blindly: first separate fields with current Meeting/Text/setup callers from obsolete deserialization compatibility, then migrate the schema once through the existing settings owner rather than keeping permanent aliases.

A small no-state cleanup compatibility function still exists in `runtime_state.rs` because current `meeting_session.rs` rollback/Stop calls the old handoff-clear boundary. It is not a second state owner; remove that tombstone only in a bounded caller cleanup.

## Proof Boundary

ChatGPT -> GitHub can establish source structure, direct wiring, and static ownership. This repository state does not prove Rust/TypeScript compilation, validator execution, Python execution, Tauri launch, Windows audio/device behavior, model presence/load/quality/latency, or clean-machine installation.
