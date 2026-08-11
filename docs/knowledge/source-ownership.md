# TranslateIT — Source Ownership

This map points to current semantic owners. File existence alone does not make a capability active.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` | ACTIVE |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / COMPACT |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / ONE SVELTE MOUNT |
| Frontend application owner | `src/App.svelte` | ACTIVE SOURCE / LOCAL PROOF DEFERRED |
| First Setup UI | `src/pages/FirstSetup.svelte` | ACTIVE SOURCE / FIVE-STEP FLOW |
| Meeting UI | `src/pages/Meeting.svelte` | ACTIVE SOURCE / PRODUCT STATES |
| Meeting live transcript/activity | `src/components/meeting/MeetingActivity.svelte` | ACTIVE SOURCE |
| Text UI | `src/pages/Text.svelte` | ACTIVE SOURCE / TRANSLATE + SWAP + EDIT + COPY |
| Settings / Diagnostics UI | `src/pages/Settings.svelte` | ACTIVE SOURCE |
| Primary navigation | `src/components/layout/Sidebar.svelte` | ACTIVE SOURCE |
| Shared status badge | `src/components/ui/StatusBadge.svelte` | ACTIVE SOURCE |
| Shared readiness/status row | `src/components/ui/StatusRow.svelte` | ACTIVE SOURCE / REUSED |
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
| Source validation | small validators under `scripts/` | ACTIVE / SVELTE-AWARE |
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

The retired manual-DOM owners stay removed:

```text
src/app/active-launcher/
src/app/simple-launcher/
src/app/first-setup/
src/app/shared/icons.ts
legacy root UI CSS files
```

Runtime ownership remains separate:

```text
Svelte UI
-> runtimeProductFacade.ts
-> runtimeApi.ts
-> Tauri commands
-> Rust / Python runtime owners
```

Svelte owns page/dialog/input/rendered-snapshot presentation state. It does not become a second authority for Meeting lifecycle, persisted settings, models, audio capability, or worker truth.

## Product-State Mapping

`runtimeProductFacade.ts` is the one frontend product-state mapper. It projects capability states from current runtime responses rather than forcing every failure into Setup Needed.

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

A real `frontend_bridge_unavailable` condition is mapped to Unavailable for the affected product capability. This is distinct from a healthy runtime that merely needs setup.

`App.svelte` safe close consumes the Meeting status contract and separates:

```text
no Meeting session -> close
active app-owned Meeting -> Stop & Close
already stopping -> wait for canonical Stop completion
runtime owner conflict -> keep open / no fake Stop action
unverifiable Meeting state -> keep open + Retry Check
```

## Visual System Ownership

Approved visual implementation remains intentionally small:

```text
Svelte 5 + TypeScript + Vite
Tailwind CSS 4
semantic CSS custom properties
selective Bits UI
@lucide/svelte icons
```

`tokens.css` owns durable roles only: surfaces, text, primary action, success/warning/danger states, shape/elevation, and desktop composition widths/padding. `app.css` owns Tailwind loading, base focus/reduced-motion rules, desktop page composition, shared panel/button/field/pill patterns, and a small repeated visual vocabulary.

`StatusRow.svelte` exists because readiness/device rows repeat across Meeting, First Setup, and Settings with one visible responsibility. Trivial wrappers remain inline instead of being extracted only to increase component count.

## Product Surface Parity

`App.svelte` owns top-level composition and safe close; canonical Meeting Stop remains Rust-owned.

`Meeting.svelte` projects required outbound readiness plus optional incoming status and distinguishes Unavailable from Setup Needed. `MeetingActivity.svelte` projects finalized committed turns and visible outbound/incoming stages without inventing persistence or lifecycle truth.

`Text.svelte` owns explicit ID <-> EN direction switching, Translate, editable result, Copy, keyboard submission, and stale-source/result feedback. It also tracks target-edit revision while a translation request is running: a late translation result cannot overwrite a newer target edit made by the user.

`FirstSetup.svelte` retains five persisted checkpoints, device candidate checks, Setup Later, Fix Setup, and final readiness verification. `Settings.svelte` retains Meeting devices, Mic Test, setup recovery, bounded Diagnostics, and Verify Models.

## Backend / Release Ownership

Rust/Python ownership is unchanged by frontend professionalization. The one private packaged interpreter remains:

```text
<runtime root>/EngineData/Backend/LocalWorker/PythonRuntime/python.exe
```

Packaged execution fails closed when that interpreter is missing; repository Python alternatives remain development-only.

## Proof Boundary

Frontend Phase 1–3 source is aligned but has not been dependency-installed, Svelte-autofixed, typechecked, built, launched, clipboard-tested, or rendered in the current ChatGPT -> GitHub channel. The user has deliberately postponed local testing while major features are completed. This postpones proof timing only; it does not reduce release acceptance requirements.
