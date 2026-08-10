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

The frontend has **one normal module entry: `src/main.ts`**. The old parallel Audio Studio entry and its 200ms/10s retry polling are removed.

The frontend bridge exposes only current product/setup calls:

```text
Meeting status / committed turns / Start / Stop
helper status / Start / worker capability status
Mic Test Start / Stop
input status / device list / input-output candidate probes
settings load / save
Text Translate
explicit Verify Models
```

The production Tauri registry mirrors that bounded surface. Audio Studio, History/Chat, professional-readiness, dev seed/handoff/smoke, generic capture-handoff, manual route-control, hardware-status, full runtime-diagnostics, model-setup, and GPU-policy commands are not registered.

Meeting Microphone route modules remain internal dependencies of `meeting_session.rs`; they are not a manual frontend command surface.

## Normal Readiness Cost

Normal `loadProductRuntimeSnapshot()` reads only:

```text
settings
+ Meeting session status
+ helper status
+ microphone/input status
+ worker capability status when helper is ready
```

It does not fetch status bundles, full Diagnostics, model inventory, or native GPU policy on every refresh. Meeting preflight still checks required model presence through the cached Rust inventory; explicit Verify Models refreshes that cache.

The duplicate frontend window-rescue routine and startup trace subsystem are removed. Native window setup remains owned by Tauri `app_bootstrap.rs`.

## Validation Boundary

The previous matrix/report-heavy validation system is removed. Current persistent source validation is intentionally small:

```text
startup/core source contract
internal Meeting route contract
Rust manifest preflight
frontend build preflight
```

Package/path preflight remains a separate release/path boundary. `check:tauri-rust-local` remains explicit local compile proof.

Static validators do not prove compile, Tauri launch, models, Windows audio, rendered UI, latency, installer behavior, or clean-machine operation.

## Release Boundary

Initial controlled release keeps the local sidecar Setup direction but **does not use a SHA-256/checksum/revision identity framework**. Do not create an artifact registry, checksum service, payload identity controller, downloader, or package manager as a replacement.

The useful initial acceptance mechanism is approved prepared payload + deterministic placement + real installed worker/runtime execution.

## Remaining Overdevelopment Boundary

The active frontend/command/validator surfaces are now pruned, but the deeper Rust `engine/` module graph still contains inherited simulation/planning/persistence modules and a blanket `allow(dead_code)`. Some persisted settings fields also describe removed product features.

Those deeper owners must be pruned only after direct internal reachability is established; do not mass-delete audio/session primitives that the current Meeting path still uses.

## Proof Boundary

ChatGPT -> GitHub can establish source structure, direct wiring, and static ownership. This repository state does **not** prove Rust/TypeScript compilation, Python execution, Tauri launch, Windows audio/device behavior, model presence/load/quality/latency, or clean-machine installation.
