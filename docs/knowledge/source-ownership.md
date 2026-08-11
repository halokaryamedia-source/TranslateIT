# TranslateIT — Source Ownership

This map points to current semantic owners. File existence alone does not make a capability active.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope + familiar UI policy | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` including PR-166 | ACTIVE |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / COMPACT |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / ONE SVELTE MOUNT |
| Frontend application owner | `src/App.svelte` | ACTIVE SOURCE / LOCAL PROOF DEFERRED |
| First Setup UI | `src/pages/FirstSetup.svelte` | ACTIVE SOURCE / FIVE PERSISTED CHECKPOINTS / HUMANIZED COPY |
| Meeting Ready UI | `src/pages/Meeting.svelte` | ACTIVE SOURCE / FAMILIAR SPEAK -> HEAR FLOW |
| Meeting live transcript/activity | `src/components/meeting/MeetingActivity.svelte` | ACTIVE SOURCE / LISTENING-TRANSLATING-SPEAKING |
| Text UI | `src/pages/Text.svelte` | ACTIVE SOURCE / FROM-TO + SWAP + TRANSLATE + EDIT + COPY |
| Settings / Diagnostics UI | `src/pages/Settings.svelte` | ACTIVE SOURCE / MEETING-ADVANCED TABS |
| Primary navigation | `src/components/layout/Sidebar.svelte` | ACTIVE SOURCE / COMPACT PRODUCT NAV |
| Shared status badge | `src/components/ui/StatusBadge.svelte` | ACTIVE SOURCE / ATTENTION STATES |
| Shared readiness/status row | `src/components/ui/StatusRow.svelte` | ACTIVE SOURCE / OPTIONAL HEALTHY BADGE |
| Semantic visual tokens | `src/styles/tokens.css` | ACTIVE / SINGLE TOKEN OWNER |
| Base/layout/component styling | `src/styles/app.css` | ACTIVE / TAILWIND + BOUNDED SHARED CLASSES |
| Frontend Tauri bridge | `src/app/bridge/runtimeApi.ts` | ACTIVE / RETAINED |
| Product facade/readiness projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / RETAINED / UNAVAILABLE MAPPING |
| Shared frontend settings/error helpers | `src/app/shared/state.ts`, `types.ts`, `tauriBridge.ts` | ACTIVE / RETAINED |
| Tauri invoke registration | `src-tauri/src/commands/registry.rs` | ACTIVE / PRUNED |
| Meeting authority | `commands/meeting_session.rs`, `engine/runtime_state.rs` | ACTIVE |
| Physical microphone + Meeting Sound | `engine/audio/*` | ACTIVE |
| Mic Test lifecycle | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | ACTIVE / BOUNDED |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `virtual_audio_route_runtime.rs` | ACTIVE INTERNAL |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE |
| Installed worker interpreter path | `engine/paths.rs`, `commands/bridge_paths.rs` | SOURCE ALIGNED: `LocalWorker/PythonRuntime/python.exe` |
| Model presence inventory | `runtime_inventory.rs` | ACTIVE / CACHED |
| Text translation | `text_translate.rs` -> helper -> worker | ACTIVE |
| Persisted settings | `engine/settings.rs`, `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE / SCHEMA V6 |
| Source validation | small validators under `scripts/` | ACTIVE / SVELTE + PR-166 AWARE |
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

First Setup
-> five persisted technical checkpoints remain
-> questions/instructions use familiar meeting vocabulary
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

A real `frontend_bridge_unavailable` condition maps to Unavailable. This is distinct from a healthy runtime that merely needs setup.

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

`App.svelte` owns top-level composition and safe-close presentation; canonical Meeting Stop remains Rust-owned.

`Meeting.svelte` projects required outbound readiness plus optional incoming status. `MeetingActivity.svelte` collapses implementation stages into familiar normal-user activity states while still reading the canonical Meeting status/turn contracts. Mixed incoming audio uses `MEETING`, not a fabricated participant identity.

`Text.svelte` owns explicit ID <-> EN direction switching, Translate, editable result, Copy, keyboard submission, and stale-source/result feedback. Target-edit revision prevents a late async translation from overwriting newer user edits.

`FirstSetup.svelte` retains five persisted checkpoints, candidate device checks, Set Up Later, Fix Setup, and final readiness verification. The progress bar now has source-level progress semantics. `Settings.svelte` retains Meeting devices, Mic Test, setup recovery, bounded Diagnostics, and Verify Models while using horizontal `Meeting / Advanced` sections.

## Backend / Release Ownership

Rust/Python ownership is unchanged. The one private packaged interpreter remains:

```text
<runtime root>/EngineData/Backend/LocalWorker/PythonRuntime/python.exe
```

Packaged execution fails closed when that interpreter is missing; repository Python alternatives remain development-only.

## Proof Boundary

The current Svelte source is structurally aligned but has not been dependency-installed, Svelte-autofixed, typechecked, built, launched, clipboard-tested, or rendered through ChatGPT -> GitHub. The user has explicitly postponed local testing until the major feature set is ready. This postpones proof timing only; it does not reduce release acceptance requirements or prove the visual result is attractive in a real window.
