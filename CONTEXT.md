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

The active frontend is a plain Svelte 5 SPA inside Tauri:

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

The former `active-launcher`, `simple-launcher`, vanilla First Setup, manual icon strings, and legacy root CSS owners are removed rather than retained as a dual frontend.

Frontend visual ownership stays small. `tokens.css` owns semantic surfaces, text, action/state colors, shape, and desktop dimensions. `app.css` owns Tailwind loading, focus/reduced-motion behavior, page composition, and a bounded shared visual vocabulary. `StatusRow.svelte` and `StatusBadge.svelte` exist only for repeated status responsibilities.

## Familiar Translation UI Contract

`PR-166` makes familiar everyday translator interaction a durable product rule rather than a temporary design preference.

Normal UI now follows these source-level principles:

- source and target direction are immediately visible;
- Meeting Ready presents `You speak -> Meeting hears` before setup detail;
- Text uses a familiar two-pane `From / To` composition with `Swap`, `Translate`, editable result, and `Copy` close to the result;
- one primary Start/Translate action dominates each normal workflow;
- healthy `Ready` state is visually calm: redundant Ready badges are suppressed where the surrounding state is already clear;
- warning, unavailable, and recovery states receive stronger emphasis only when user action is needed;
- Meeting Live collapses internal transcribing/translating/synthesizing stages into user-facing `Listening / Translating / Speaking` states;
- mixed incoming meeting audio is labeled `MEETING`, not assigned a fabricated participant identity;
- normal-user copy avoids runtime/worker/model/provider/pipeline/lifecycle-internal language; technical vocabulary remains in Advanced / Diagnostics;
- Settings uses one page with `Meeting / Advanced` tabs instead of a second nested settings sidebar;
- First Setup preserves five persisted checkpoints and functional readiness checks, but its questions and instructions use ordinary meeting-language phrasing;
- sidebar/navigation is compact and product-facing rather than presenting a dashboard-style capability card.

This is an adaptation of familiar translation-product interaction, not a literal copy of another product's brand or layout.

## Frontend Product-State Contract

Current source reconciles the UI against the initial-core requirements:

- Meeting Ready / Starting / Live / Stopping remain projected from the canonical Meeting runtime owner;
- Meeting-facing readiness uses the current Meeting preflight as the authoritative readiness sample instead of rebuilding Meeting truth from independently sampled frontend calls;
- a real frontend/runtime bridge-unavailable condition is presented as **Unavailable**, not mislabeled as Setup Needed;
- settings transport failure remains unavailable and does not fabricate default settings or send the user into First Setup;
- active Meeting continuity across Text/Settings remains explicit and navigation does not stop the session;
- Meeting polling recomputes the product Meeting/readiness projection from the current Meeting status, while the committed transcript payload is refetched only when the Meeting status revision signals change;
- Start/Stop immediately consume the authoritative Meeting status returned by the Rust action instead of performing a full product refetch solely to rediscover that result;
- safe close still distinguishes active Meeting, already-stopping, runtime-owner conflict, and unverifiable runtime state; close verification remains deliberately fail-closed;
- Text keeps explicit ID <-> EN direction, Translate, stale-source association, editable result, Copy, and Ctrl/Cmd+Enter;
- Text translation returns translated text, product-facing failure copy, and technical blocker separately so normal UI does not expose worker/model/device failure detail;
- a translation result returning after the user edits the target text does **not** overwrite the newer edit;
- First Setup keeps five persisted checkpoints, candidate device probing, Set Up Later, setup checking, and real final readiness verification; microphone selection itself performs the candidate probe/save transaction so a second redundant microphone check is not required;
- Settings keeps Meeting-device selection, Mic Test, Check Setup, Advanced health, bounded Diagnostics, and explicit Verify Models; Diagnostics refreshes when explicitly opened;
- normal application settings are projected through `ProductRuntimeSnapshot.settings`; bootstrap `setupSettings` exists only before the normal product snapshot is available.

Svelte state remains presentation/application state, not duplicate Rust/runtime truth. No SvelteKit, frontend router, Redux-like state library, CSS-in-JS, heavy UI framework, full shadcn-svelte dump, general event bus, or animation framework is a current owner.

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

Start establishes one session/authority. Navigation does not stop/recreate it. Stop revokes output authority before resource cleanup, stops both audio lanes, cancels/joins Meeting work, clears transient conversation/audio state, and ends the session. Safe application close uses the same Stop owner and fails closed when session state cannot be verified. Windows suspend/resume window messages only enqueue a bounded nonblocking cleanup signal; a Rust lifecycle worker then converges through the same authority-first Meeting Stop owner.

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

`commands/settings.rs` owns the bounded audio-device selection transaction at the desktop boundary: load the current preference, probe the requested microphone/Meeting Sound through the existing audio owner, preserve the old preference on failure, persist on success, and return the canonical resulting settings. The frontend does not duplicate that rollback rule.

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

Normal post-setup `loadProductRuntimeSnapshot()` lazily starts the one helper only when its lifecycle is known `not_started`/`stopped`, then reads Meeting status/preflight, helper status, input status, and worker capability when the helper is ready. Fresh `meeting_setup_state = new` boot does not enter this normal snapshot path and therefore does not start Python. Heavy diagnostic/model/native probing is not normal polling work. During an active Meeting, the recurring frontend path polls Meeting status; the larger committed-turn snapshot is conditional on a status revision change rather than fetched unconditionally on every interval.

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

Actual packaged PythonRuntime bytes, vendored-package placement, Meeting provider imports, installer placement, and clean-machine behavior remain local release proof. Separate GitHub-hosted P2.3 evidence now proves the locked persistent worker can execute the primary ASR model, both MarianMT directions, English Windows SAPI TTS, and explicit CPU fallback; real CUDA execution still requires a GPU-capable Windows target.

## Deferred Proof Boundary

The user currently postpones **user-local-PC**, real Windows audio/device, installer, and clean-machine testing. Model execution is no longer wholly deferred: the locked WorkerRuntime has now been executed remotely on a GitHub-hosted Windows CPU environment. This changes **where/when** the remaining proof is executed, not the acceptance standard; actual CUDA execution still requires a GPU-capable Windows target.

Remote GitHub-hosted Windows proof has already established the following executable/frontend boundaries:

```text
frontend dependency materialization in proof runners
official Svelte autofixer analysis
svelte-check -> 0 errors / 0 warnings
Vite production build
Meeting / Text / Settings browser render
Windows Rust cargo check
optimized native Tauri release link/build
fresh-profile translateit.exe launch/bootstrap
native Tauri/WebView First Setup pixel render
native startup / medium / near-minimum resize render
native Step 1 keyboard focus traversal + visible focus indicators
canonical package-lock.json + deterministic clean npm ci proof
remote Text Copy browser Clipboard API success + truthful failure feedback
fresh real Rust settings/new-state -> native First Setup projection with zero Python descendants
real locked Python worker/model execution -> ASR + ID<->EN + English TTS on CPU fallback
```

Fresh First Setup remote proofs remain intentionally before capability execution and have shown zero Python child processes. Those startup proofs themselves do **not** prove Python inference, physical microphone behavior, Meeting virtual-audio routing, real Meeting-app reception, sleep/wake behavior during a live session, latency/stability, installer placement, or clean-machine execution. Separate P2.3 run `31595127627` now proves real persistent-worker ASR/translation/TTS execution on the hosted CPU path; it does not prove CUDA execution or any Windows Meeting-audio/device behavior.

Before release, remaining proof/materialization still includes:

```text
post-setup runtime-state projection together with deferred device/model acceptance
private PythonRuntime packaging + GPU-capable CUDA execution proof
Windows Meeting audio/device validation
Start / Stop / Safe Close / power lifecycle runtime acceptance
latency / stability / long-session measurement
installer / installed-runtime proof
clean-machine proof
```

`EngineData/Frontend/RustApp/package-lock.json` is now the canonical npm lockfile for the current Svelte/Vite/Tauri frontend dependency graph. It was generated with Node 22.16.0 / npm 10.9.2, its root dependency set matches `package.json`, and a separate fresh GitHub-hosted Windows checkout passed strict `npm ci`, `svelte-check` with 0 errors / 0 warnings, and the Vite production build using the committed lockfile only.

Remote Text clipboard proof exercised the current `Text.svelte` Copy path on GitHub-hosted Windows. The translation response was simulated only at the existing Tauri `translate_text` boundary so no Python/model execution occurred; clipboard success used the real browser Clipboard API and was read back, while an injected `writeText` rejection verified truthful failure feedback without changing the previous clipboard value.

Fresh real Rust settings/default-state projection has now also been proven remotely: an isolated Windows profile resolves to `meeting_setup_state = new`, and the native app projects that state to First Setup with `Set Up Later` and `Continue` while starting zero Python descendants. Once setup is no longer `new`, the normal product snapshot requests Meeting status and input status; Meeting preflight and route status cross real Windows audio-device enumeration. That post-setup projection therefore remains part of the deferred device/model runtime acceptance rather than a remote-safe proof target.
