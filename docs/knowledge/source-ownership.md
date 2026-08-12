# TranslateIT — Source Ownership

This map points to current semantic owners. File existence alone does not make a capability active.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope + familiar UI policy | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` including PR-166 | ACTIVE |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / COMPACT |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / ONE SVELTE MOUNT |
| Frontend application owner | `src/App.svelte` | ACTIVE SOURCE / COHERENT SNAPSHOT + GATED LIVE TRANSCRIPT |
| First Setup UI | `src/pages/FirstSetup.svelte` | ACTIVE SOURCE / FIVE PERSISTED CHECKPOINTS / ATOMIC DEVICE SELECTION |
| Meeting Ready UI | `src/pages/Meeting.svelte` | ACTIVE SOURCE / FAMILIAR SPEAK -> HEAR FLOW |
| Meeting live transcript/activity | `src/components/meeting/MeetingActivity.svelte` | ACTIVE SOURCE / LISTENING-TRANSLATING-SPEAKING |
| Text UI | `src/pages/Text.svelte` | ACTIVE SOURCE / FROM-TO + SWAP + TRANSLATE + EDIT + COPY / USER-SAFE FAILURES |
| Settings / Diagnostics UI | `src/pages/Settings.svelte` | ACTIVE SOURCE / MEETING-ADVANCED TABS / DIAGNOSTICS REFRESH ON OPEN |
| Primary navigation | `src/components/layout/Sidebar.svelte` | ACTIVE SOURCE / COMPACT PRODUCT NAV |
| Shared status badge | `src/components/ui/StatusBadge.svelte` | ACTIVE SOURCE / ATTENTION STATES |
| Shared readiness/status row | `src/components/ui/StatusRow.svelte` | ACTIVE SOURCE / OPTIONAL HEALTHY BADGE |
| Semantic visual tokens | `src/styles/tokens.css` | ACTIVE / SINGLE TOKEN OWNER |
| Base/layout/component styling | `src/styles/app.css` | ACTIVE / TAILWIND + BOUNDED SHARED CLASSES |
| Frontend Tauri bridge | `src/app/bridge/runtimeApi.ts` | ACTIVE / TRANSPORT BOUNDARY / EXPLICIT SETTINGS UNAVAILABLE |
| Product facade/readiness projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / MEETING-PREFLIGHT PROJECTION + USER-SAFE RESULT MAPPING |
| Shared frontend settings/error helpers | `src/app/shared/state.ts`, `types.ts`, `tauriBridge.ts` | ACTIVE / RETAINED |
| Tauri invoke registration | `src-tauri/src/commands/registry.rs` | ACTIVE / PRUNED |
| Meeting authority | `commands/meeting_session.rs`, `engine/runtime_state.rs` | ACTIVE |
| Physical microphone + Meeting Sound | `engine/audio/*` | ACTIVE |
| Audio-device selection transaction | `commands/settings.rs` + `commands/audio.rs` | ACTIVE / RUST PROBE + PRESERVE + SAVE OWNER |
| Mic Test lifecycle | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | ACTIVE / BOUNDED |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE / MATCHED ROUTE + RUST/CPAL DELIVERY |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE |
| Installed worker interpreter path | `engine/paths.rs`, `commands/bridge_paths.rs` | SOURCE ALIGNED: `LocalWorker/PythonRuntime/python.exe` |
| Full-product-release asset presence inventory | `runtime_inventory.rs` + `WorkerRuntime/model_manifest.json` | ACTIVE / FRESH EXPLICIT VERIFY / DOES NOT GATE MEETING START |
| Text translation | `text_translate.rs` -> helper -> worker | ACTIVE / TYPED RESULT: TRANSLATED TEXT + USER MESSAGE + BLOCKER |
| Persisted settings | `engine/settings.rs`, `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE / SCHEMA V6 |
| Source validation | small validators under `scripts/` | ACTIVE / SVELTE + PR-166 + RUNTIME-EFFICIENCY CONTRACT AWARE |
| Local frontend proof | dependency install + Svelte autofixer + `svelte-check` + Vite build/render | DEFERRED BY USER / REQUIRED BEFORE RELEASE |
| Local runtime proof | Rust/Tauri/Python/model/audio/package checks | DEFERRED BY USER / REQUIRED BEFORE RELEASE |

## Frontend Ownership

The active frontend path is singular:

```text
index.html
-> src/main.ts
-> mount(App.svelte)
-> FirstSetup / Meeting / Text / Settings
```

The retired manual-DOM owners remain removed. Runtime ownership stays separate:

```text
Svelte UI
-> runtimeProductFacade.ts
-> runtimeApi.ts
-> Tauri commands
-> Rust / Python runtime owners
```

Svelte owns page/dialog/input/presentation state. It does not become a second authority for Meeting lifecycle, persisted settings, models, audio capability, or worker truth.

Normal application settings have one active frontend projection through `ProductRuntimeSnapshot.settings`. `setupSettings` is only the bootstrap/First Setup holder before the normal snapshot exists.

## Runtime-Efficiency And Consistency Boundary

The frontend/backend boundary now follows these source-level rules:

```text
settings transport failure
-> explicit unavailable
-> never fabricate default settings / First Setup

Meeting status
-> canonical Meeting preflight owns Meeting readiness
-> App recomputes Meeting-facing product readiness with each current status

Live Meeting poll
-> lightweight Meeting status polling remains bounded
-> committed transcript snapshot is fetched only when Meeting status revision signals change

Start / Stop
-> consume authoritative status already returned by the Rust Meeting command
-> no immediate full product refetch solely to rediscover that result

audio-device change
-> one Rust transaction: load current -> probe candidate -> preserve or save -> return canonical settings
-> frontend does not own probe/save rollback semantics

Text translation
-> Rust returns translated text, normal-user message, and diagnostic blocker separately
-> normal Text UI does not display worker/model/device blocker detail
```

This is deliberately not a new frontend state framework, event bus, global store, or parallel readiness owner.

## Familiar Translation Interaction Ownership

PR-166 owns the product-level rule. Current source implements it through these boundaries:

```text
Meeting Ready
-> You speak: Indonesian
-> Meeting hears: English voice
-> microphone / Meeting Microphone / optional incoming
-> one Start Translation action

Text
-> From / To
-> Swap
-> source | result
-> Translate + Copy

Meeting Live
-> Listening / Translating / Speaking
-> chronological YOU / MEETING transcript
-> Stop Translation

Settings
-> Meeting | Advanced tabs
-> no nested settings sidebar
-> Diagnostics refreshes when explicitly opened

First Setup
-> five persisted technical checkpoints remain
-> questions/instructions use familiar meeting vocabulary
-> selecting a microphone already performs the required candidate verification
```

Healthy/Ready rows may omit a redundant badge. `StatusBadge.svelte` is reserved for meaningful current state or attention. `StatusRow.svelte` therefore allows an empty `status` and renders the badge only when one is supplied.

Normal-user copy must not expose worker/model/provider/CUDA/pipeline/lifecycle internals. `Settings.svelte` Diagnostics is the bounded technical surface where those details remain permitted.

## Product-State Mapping

`runtimeProductFacade.ts` is the single frontend product-state mapper. It projects capability states from runtime responses rather than forcing every failure into Setup Needed.

Current visible vocabulary includes:

```text
Checking
Ready
Live
Starting
Stopping
Setup Needed
Unavailable
In Use
```

A real `frontend_bridge_unavailable` condition maps to Unavailable. Settings transport failure also remains unavailable instead of being substituted with a default `meeting_setup_state = new` value.

`App.svelte` safe close consumes the Meeting status contract and separates:

```text
no Meeting session -> close
active app-owned Meeting -> Stop & Close
already stopping -> wait for Stop completion
runtime owner conflict -> keep open / no fake Stop action
unverifiable Meeting state -> keep open + Try Again
```

The copy is humanized, but the underlying safe-close semantics remain Rust/Meeting-owned.

## Visual System Ownership

Approved implementation remains intentionally small:

```text
Svelte 5 + TypeScript + Vite
Tailwind CSS 4
semantic CSS custom properties
selective Bits UI
@lucide/svelte icons
```

`tokens.css` owns durable surfaces, text, actions, state colors, shape/elevation, and desktop composition. `app.css` owns Tailwind loading, focus/reduced-motion rules, page composition, and the bounded shared panel/button/field/pill vocabulary.

The UI deliberately favors whitespace, typography, and alignment over nested cards and repeated badges. It does not add gradients, glow, glassmorphism, a large component kit, a second theme system, or a general animation dependency.

## Product Surface Parity

`App.svelte` owns top-level composition and safe-close presentation; canonical Meeting Stop remains Rust-owned. Meeting polling updates one coherent Meeting/readiness projection, while transcript payload retrieval is gated by current status changes rather than repeated unconditionally.

`Meeting.svelte` projects required outbound readiness plus optional incoming status. `MeetingActivity.svelte` collapses implementation stages into familiar normal-user activity states while still reading the canonical Meeting status/turn contracts. Mixed incoming audio uses `MEETING`, not a fabricated participant identity.

`Text.svelte` owns explicit ID <-> EN direction switching, Translate, editable result, Copy, keyboard submission, and stale-source/result feedback. Target-edit revision prevents a late async translation from overwriting newer user edits. Backend translation failures expose a product-safe user message separately from the diagnostic blocker.

`FirstSetup.svelte` retains five persisted checkpoints, candidate device checks, Set Up Later, setup checking, and final readiness verification. Candidate microphone selection is already a functional probe/save transaction, so a redundant second microphone check is not required. `Settings.svelte` retains Meeting devices, Mic Test, setup checks, bounded Diagnostics, and Verify Models while using horizontal `Meeting / Advanced` sections.

## Backend / Release Ownership

Rust/Python ownership is unchanged. The one private packaged interpreter remains:

```text
<runtime root>/EngineData/Backend/LocalWorker/PythonRuntime/python.exe
```

Packaged execution fails closed when that interpreter is missing; repository Python alternatives remain development-only.

Dependency and asset ownership is intentionally split:

```text
WorkerRuntime pyproject.toml + committed uv.lock
-> canonical resolved Python dependency graph

Worker status / provider preflight
-> current Meeting-required AI runtime capability

model_manifest.json + runtime_inventory.rs
-> full-product-release asset presence only
-> never a Meeting Start gate
```

## Proof Boundary

Remote Windows proof has now covered canonical dependency installation, source validators, Svelte typecheck/build, Rust cargo-check/release-link, native Tauri launch/presentation slices, clipboard behavior, real CPU model execution, and the B1-B5 backend source/tooling path. Those proofs do not substitute for target-PC hardware acceptance. NVIDIA CUDA execution, physical microphone/VB-Cable/meeting-app reception, sleep/wake hardware recovery, installer staging, and clean-machine execution remain explicit Windows target boundaries.
