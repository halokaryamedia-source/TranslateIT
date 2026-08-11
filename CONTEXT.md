# TranslateIT — Current Context

This file stores stable current project facts. Active continuation belongs in `docs/knowledge/next-action.md`; durable reasoning belongs in `docs/knowledge/decision-log.md`.

## Authority

- Development authority: branch `New`.
- `V1-Advance`, older branches, and `DevelopingData` are historical/recovery evidence only.
- Product policy is owned by `docs/foundation/01-product-overview.md` and `02-product-requirements.md`.

## Product Target

TranslateIT is a local Windows translator focused on Indonesian and English.

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
├─ edit result
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
Tauri 2 desktop application
├─ Svelte frontend
├─ Rust desktop/runtime backend
└─ ONE Python local worker
```

Rust owns Meeting/session authority, Windows audio integration, routing, settings, paths, and desktop integration. The Python worker owns ASR, direction-based ID <-> EN translation, and TTS execution. Do not create a parallel engine, shell, readiness service, model selector, worker launcher, or second product-state owner.

## Frontend Architecture

The active frontend source is a plain Svelte 5 SPA inside Tauri:

```text
Tauri 2
+ Svelte 5
+ Vite
+ TypeScript
+ Tailwind CSS 4
+ semantic CSS custom-property tokens
+ selective Bits UI
+ @lucide/svelte
```

Current owner graph:

```text
src/main.ts
-> one Svelte mount
-> src/App.svelte
   ├─ pages/FirstSetup.svelte
   ├─ pages/Meeting.svelte
   │  └─ components/meeting/MeetingActivity.svelte
   ├─ pages/Text.svelte
   └─ pages/Settings.svelte

components/layout/Sidebar.svelte
components/ui/StatusBadge.svelte
components/ui/StatusRow.svelte

styles/tokens.css
styles/app.css

src/app/bridge/runtimeApi.ts
src/app/bridge/runtimeProductFacade.ts
-> retained Tauri/product runtime boundary
```

The former `active-launcher`, `simple-launcher`, vanilla First Setup, manual icon strings, and legacy root CSS owners are removed from the active source graph rather than left as a permanent dual frontend.

Frontend visual ownership is intentionally small. `tokens.css` owns semantic surface/text/action/state/shape/layout values. `app.css` owns Tailwind loading, base focus/reduced-motion behavior, page composition, and a bounded shared visual vocabulary. `StatusRow.svelte` exists because readiness/device rows repeat across current product surfaces.

## Frontend Product-State Contract

Frontend Phase 3 source audit reconciled the current UI against the initial-core requirements:

- Meeting Ready / Starting / Live / Stopping remain projected from the canonical Meeting runtime owner;
- a real frontend/runtime bridge-unavailable condition is presented as **Unavailable**, not mislabeled as Setup Needed;
- active Meeting continuity across Text/Settings remains explicit and navigation does not stop the session;
- safe application close distinguishes active Meeting, already-stopping, runtime-owner conflict, and unverifiable runtime state; unavailable close checks offer Retry Check rather than pretending Stop can execute;
- Text keeps explicit ID <-> EN direction, Translate, stale-source association, editable result, Copy, and Ctrl/Cmd+Enter;
- a translation result that returns after the user edits the target text does **not** overwrite that newer user edit;
- First Setup keeps five persisted checkpoints, candidate device probing, Set up later, repair, and real final readiness verification;
- Settings keeps Meeting-device selection, Mic Test, Check Setup, Advanced health, bounded Diagnostics, and explicit Verify Models.

Svelte state remains presentation/application state, not duplicate Rust/runtime truth.

No SvelteKit, frontend router, Redux-like state library, CSS-in-JS, heavy UI framework, full shadcn-svelte dump, or general animation framework is a current owner.

The Svelte source has **not** been dependency-installed, autofixed, typechecked, built, launched, clipboard-tested, or visually rendered in this ChatGPT -> GitHub channel. Source ownership/state mapping is established; executable/rendered proof remains pending by explicit user choice.

## Translation Contract

- Meeting required outbound: Indonesian -> English.
- Text supports Indonesian -> English and English -> Indonesian.
- Current worker routes `id->en` to `marianmt-id-en` and `en->id` to `marianmt-en-id`.
- Finalized stable speech is normal Meeting translation truth.
- Source text is not silently truncated and known incomplete generation is not promoted.
- Previous turns, History, and standalone Text are not automatic model context.
- Optional incoming EN -> ID may degrade/disable without blocking safe outbound.

## Meeting Ownership

`commands/meeting_session.rs` + `engine/runtime_state.rs` remain the application Meeting owner.

Start establishes one session/authority. Navigation does not stop/recreate it. Stop revokes output authority before resource cleanup, stops both audio lanes, cancels/joins Meeting work, clears transient conversation/audio state, and ends the session. Safe application close uses the same Stop owner and fails closed when session state cannot be verified.

The bounded committed-turn store is transient Live transcript state only; Meeting Stop has no History persistence dependency.

## Persisted Settings Contract

Current persisted settings schema is version 6:

```text
schema_version
source_language
target_language
meeting_setup_state
meeting_setup_checkpoint
audio.input_device_id
audio.output_device_id
```

`engine/settings.rs` is the single schema/deserialization/sanitization owner. The previous larger JSON shape is tolerated through ignored legacy keys; normal save writes only the small schema. There is no migration registry or second settings store.

## Rust / Backend Surface

The Rust engine remains reduced to current owners:

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

The old adapter/planning tree, History/Chat/session persistence, transcript-session planning, native inference candidates, CUDA/status/report scaffolding, duplicate RuntimeContracts, and handoff compatibility tombstones are removed.

Normal `loadProductRuntimeSnapshot()` reads only settings, Meeting status, helper status, input status, and worker capability when the helper is ready. Heavy diagnostic/model/native probing is not normal polling work.

## Release Boundary

Initial controlled release keeps the local sidecar Setup direction and does not use a SHA-256/checksum/revision identity framework, artifact registry, downloader, or package manager.

Installed Python execution is selected as:

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/
└─ PythonRuntime/
   └─ python.exe
```

Packaged source resolves only `PythonRuntime/python.exe`. Repository env/`.venv`/system-Python discovery is development-only. Persistent worker and Meeting Microphone provider share the same interpreter resolver and WorkerRuntime root. Models remain in `RuntimeAssets`.

Actual PythonRuntime bytes, vendored packages, installer placement, model execution, Meeting provider imports, and clean-machine behavior remain local release proof.

## Deferred Proof Boundary

The user has explicitly chosen to postpone local/integration testing while major frontend features are completed. This changes **when** proof is executed, not the acceptance standard.

Before release, accumulated proof still includes:

```text
frontend dependency install + regenerate package-lock
Svelte autofixer
svelte-check
Vite build/render
Rust/Tauri compile + launch
clipboard interaction
private PythonRuntime + worker/model execution
Windows Meeting audio/device validation
installer/installed-runtime proof
clean-machine proof
```

The removed old `package-lock.json` must not be treated as valid for the Svelte dependency graph until regenerated during that later dependency-materialization stage.
