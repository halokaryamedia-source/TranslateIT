# TranslateIT — Source Ownership

This map points to current semantic owners. File existence alone does not make a capability active.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` | ACTIVE |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / COMPACT |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / ONE SVELTE MOUNT |
| Frontend application owner | `src/App.svelte` | ACTIVE SOURCE / LOCAL PROOF PENDING |
| First Setup UI | `src/pages/FirstSetup.svelte` | ACTIVE SOURCE |
| Meeting UI | `src/pages/Meeting.svelte` | ACTIVE SOURCE |
| Meeting live transcript/activity | `src/components/meeting/MeetingActivity.svelte` | ACTIVE SOURCE |
| Text UI | `src/pages/Text.svelte` | ACTIVE SOURCE |
| Settings / Diagnostics UI | `src/pages/Settings.svelte` | ACTIVE SOURCE |
| Primary navigation | `src/components/layout/Sidebar.svelte` | ACTIVE SOURCE |
| Shared visible status primitive | `src/components/ui/StatusBadge.svelte` | ACTIVE SOURCE |
| Frontend semantic tokens | `src/styles/tokens.css` | ACTIVE SOURCE |
| Frontend base/layout styling | `src/styles/app.css` | ACTIVE SOURCE |
| Frontend Tauri bridge | `src/app/bridge/runtimeApi.ts` | ACTIVE / RETAINED |
| Product facade/readiness projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / RETAINED |
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
| Local frontend proof | Svelte autofixer + `svelte-check` + Vite build | DEFERRED BY USER / REQUIRED BEFORE RELEASE |
| Local Rust/runtime proof | local compile/runtime/device/model/package checks | DEFERRED BY USER / REQUIRED BEFORE RELEASE |

## Frontend Ownership

The active source architecture is:

```text
index.html
-> src/main.ts
-> mount(App.svelte)
-> FirstSetup / Meeting / Text / Settings
```

The previous manual-DOM owners are removed instead of kept in parallel:

```text
src/app/active-launcher/
src/app/simple-launcher/
src/app/first-setup/
src/app/shared/icons.ts
legacy root UI CSS files
```

The migration intentionally preserves the runtime boundary:

```text
Svelte UI
-> runtimeProductFacade.ts
-> runtimeApi.ts
-> Tauri commands
-> Rust / Python runtime owners
```

Svelte components may own presentation/application state such as selected page, dialog visibility, transient input, and current rendered snapshot. They must not become a second authority for Meeting lifecycle, persisted settings, model readiness, audio capability, or worker truth.

## Frontend Stack Ownership

Approved source stack:

```text
Svelte 5 + TypeScript + Vite
Tailwind CSS 4 + semantic CSS custom properties
Bits UI only for justified accessible complex primitives
Lucide Svelte for normal icons
```

Current selective Bits UI use is the native-close safety dialog. Native selects remain appropriate for current audio-device selection; no component library is required there.

No SvelteKit/router/global state framework/theme engine is a current owner.

## Meeting / Text / Setup Parity

`App.svelte` owns top-level composition and safe close. The Rust Meeting owner remains authoritative.

`Meeting.svelte` projects current Meeting readiness and action availability. `MeetingActivity.svelte` projects finalized committed turns and optional incoming status. It does not create transcript persistence or lifecycle truth.

`Text.svelte` keeps explicit Text Translate and ID <-> EN direction switching through the existing persisted settings/runtime facade.

`FirstSetup.svelte` keeps the five-step persisted checkpoint flow, candidate device probing, Setup Later, Fix Setup, and final readiness verification through the existing settings/facade owners.

`Settings.svelte` keeps Meeting device selection, Mic Test, setup recovery, bounded Diagnostics, and explicit Verify Models.

## Backend / Runtime Ownership

The Rust engine remains pruned to current audio/session/settings/path owners. The one Python worker remains the AI execution owner. No frontend migration creates a frontend AI/audio implementation or second runtime.

The packaged worker path remains:

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/
└─ PythonRuntime/python.exe
```

Packaged execution fails closed when the private interpreter is missing; repository Python fallbacks remain development-only.

## Proof Boundary

The Svelte source migration is source-aligned but has not been dependency-installed, autofixed, typechecked, built, launched, or rendered in the current ChatGPT -> GitHub channel. The user has deliberately postponed local testing while major features are being completed. This does not convert source/static checks into compile, rendered UI, Windows audio, model, installer, or clean-machine proof.
