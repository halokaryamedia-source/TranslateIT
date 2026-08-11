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
└─ Copy/edit result

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

The active frontend source is now a plain Svelte 5 SPA inside the existing Tauri application:

```text
Tauri 2
+ Svelte 5
+ Vite
+ TypeScript
+ Tailwind CSS 4
+ semantic CSS custom-property tokens
+ selective Bits UI
+ Lucide Svelte
```

Current source ownership:

```text
src/main.ts
-> one Svelte mount
-> src/App.svelte
   ├─ FirstSetup.svelte
   ├─ Meeting.svelte
   │  └─ MeetingActivity.svelte
   ├─ Text.svelte
   └─ Settings.svelte

src/app/bridge/runtimeApi.ts
src/app/bridge/runtimeProductFacade.ts
-> retained Tauri/product runtime boundary
```

The former `active-launcher`, `simple-launcher`, vanilla First Setup, manual icon strings, and root legacy CSS owners are removed from the active source graph rather than left as a permanent dual frontend.

Frontend rules:

- one Svelte application root;
- Svelte state is presentation/application state, not duplicate Rust/runtime truth;
- no SvelteKit, frontend router, Redux-like state library, CSS-in-JS, heavy UI framework, full shadcn-svelte dump, or general animation framework by default;
- Tailwind handles ordinary layout/styling; CSS custom properties own durable semantic visual tokens;
- Bits UI is selective and currently serves the safe-close dialog boundary;
- Lucide Svelte is the default icon family;
- `runtimeApi.ts` and `runtimeProductFacade.ts` remain the product bridge/facade by default.

The migration source has **not** been dependency-installed, Svelte-autofixed, typechecked, built, launched, or visually rendered in this ChatGPT -> GitHub channel. Source ownership is established; executable/rendered proof remains pending.

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

The Rust engine graph remains reduced to current owners only:

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

## Validation And Deferred Proof

Persistent source validation remains intentionally small: frontend/startup source contract, internal Meeting route contract, Rust manifest preflight, and package/path preflight.

The user has explicitly chosen to postpone local/integration testing while major frontend work is still being assembled. That changes **when** proof is run, not the acceptance standard. Before release, the project still requires the relevant dependency install/lock regeneration, Svelte autofixer, `svelte-check`, frontend build, Tauri launch, Rust compile, Python/model execution, Windows audio/device validation, installed-runtime proof, and clean-machine proof.

`package-lock.json` must not be treated as valid for the new Svelte dependency graph until it is regenerated by the later local dependency-materialization step.
