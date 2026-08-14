# TranslateIT — Current Context

This file stores stable current project facts. Active continuation belongs in `docs/knowledge/next-action.md`; durable reasoning belongs in `docs/knowledge/decision-log.md`.

## Authority

- Development authority: branch `New`.
- `V1-Advance`, older branches, and `DevelopingData` are historical/recovery evidence only.
- Product policy is owned by `docs/foundation/01-product-overview.md` and `02-product-requirements.md`.

## Product Target

TranslateIT is a local Windows translator focused on Indonesian and English.

Approved target navigation is:

```text
Meeting
├─ Start Translation
├─ ID speech -> final ID transcript -> EN translation -> trained EN Voice Actor
├─ translated voice -> TranslateIT Meeting Microphone
├─ optional EN Meeting Sound -> ID text
└─ Stop Translation

Text
├─ ID <-> EN
├─ Translate
├─ edit result
└─ Copy

VoiceLab
├─ confirm voice ownership
├─ guided English recording
├─ replay / accept / retry
├─ train one GPT-SoVITS V2ProPlus Voice Actor
├─ held-out evaluation + user approval
└─ save reusable My Voice

Settings
├─ Meeting devices/setup
└─ Advanced / Diagnostics
```

Normal Meeting lifecycle remains:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

Pause/Resume, general History/Saved, Audio Studio/broadcast-production features, Documents, Tone/Context, partial translated subtitles, additional languages, user-facing Realtime/Quality modes, alternate custom-voice engines, quick-clone modes, and imported-audio VoiceLab branching remain outside the current approved boundary.

## VoiceLab Scope Reopened

On 2026-08-13 the user explicitly approved VoiceLab as required work **before** target-Windows validation. This supersedes only the former custom-voice deferral. The rest of the small-core simplification remains active.

Canonical VoiceLab direction:

```text
one product feature: VoiceLab
one custom-TTS engine: GPT-SoVITS V2ProPlus
one normal creation flow: guided English recording -> fine-tune -> evaluate -> approve
one daily inference owner: existing canonical Python local worker
one approved persistent actor: My Voice
```

Voice quality is prioritized over instant creation. Speaker adaptation/training happens as an explicit occasional build operation. Normal application startup, Meeting startup, and each translated utterance must **not** retrain the actor.

Training and an active Meeting are mutually exclusive in the first implementation. Do not add background training, automatic GPU arbitration, pause/resume training, or a second daily inference worker to make them concurrent.

The initial engineering baseline is pinned to upstream GPT-SoVITS commit:

```text
d523079fc05d9a8028d6085bffe4a2757c32abb6
```

The pin is for reproducible integration investigation only. It does not prove model quality, target hardware performance, or release readiness.

The first Voice Actor representation remains native trained GPT/SoVITS weights plus one canonical English reference recording/text. ONNX/TorchScript/quantization are deferred optimization candidates until native inference establishes a quality baseline and an optimized format proves useful without unacceptable fidelity loss.

### Current implementation state

The active `New` source implements VoiceLab creation, canonical-worker trained-actor inference, and Meeting atomic MyVoice authority through A6. Guided recording, build/evaluation, explicit `MyVoice` approval/promotion, actor-package revalidation, cached GPT-SoVITS V2ProPlus runtime reuse, bounded English `voice_actor_synthesize`, generation-bound Start proof, and Live actor-token enforcement are source-closed.

Meeting is now migrated to MyVoice inside the existing atomic Start transaction. Hosted source proof still does not establish target speaker fidelity, CUDA/VRAM practicality, real inference latency, staged/installed asset execution, or physical meeting-audio delivery.

## Runtime Architecture

```text
Tauri 2 desktop application
├─ Svelte frontend
├─ Rust desktop/runtime backend
└─ ONE Python local worker for normal ASR / translation / TTS inference
```

Rust owns Meeting/session authority, Windows audio integration, routing, settings, paths, and desktop integration. The Python worker owns ASR, direction-based ID <-> EN translation, and normal TTS inference. Do not create a parallel daily inference engine, shell, readiness service, model selector, worker launcher, or second product-state owner.

VoiceLab long-running training is a bounded one-shot build operation producing an actor for the same GPT-SoVITS engine family. A4/A5 preserve one application-local Python runtime/dependency graph and one existing daily worker; there is no second packaged Python environment or second daily inference owner.

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

Current implemented owner graph remains:

```text
src/main.ts
-> one Svelte mount
-> src/App.svelte
   ├─ pages/FirstSetup.svelte
   ├─ pages/Meeting.svelte
   │  └─ components/meeting/MeetingActivity.svelte
   ├─ pages/Text.svelte
   ├─ pages/VoiceLab.svelte
   │  └─ components/voice-lab/VoiceLabBuild.svelte
   └─ pages/Settings.svelte

components/layout/Sidebar.svelte
components/ui/StatusBadge.svelte
components/ui/StatusRow.svelte

styles/tokens.css
styles/app.css

src/app/bridge/runtimeApi.ts
src/app/bridge/runtimeProductFacade.ts
src/app/bridge/voiceLabApi.ts
src/app/bridge/voiceLabBuildApi.ts
-> retained Tauri/product runtime boundary
```

VoiceLab extends the same Svelte application and bridge architecture; it does not create a second frontend shell or product-state owner.

The former `active-launcher`, `simple-launcher`, vanilla First Setup, manual icon strings, and legacy root CSS owners are removed rather than retained as a dual frontend.

Frontend visual ownership stays small. `tokens.css` owns semantic surfaces, text, action/state colors, shape, and desktop dimensions. `app.css` owns Tailwind loading, focus/reduced-motion behavior, page composition, and a bounded shared visual vocabulary. `StatusRow.svelte` and `StatusBadge.svelte` exist only for repeated status responsibilities.

## Familiar Translation UI Contract

`PR-166` makes familiar everyday translator interaction a durable product rule rather than a temporary design preference.

Normal UI follows these source-level principles:

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

VoiceLab must follow the same human-facing rule: users see recording, review, training, preview, approval, and My Voice—not GPT/SoVITS submodels, checkpoints, epochs, dependency graphs, or provider internals.

## Frontend Product-State Contract

Current source reconciles the UI against the pre-VoiceLab implementation requirements:

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
- Approved and active required outbound TTS authority is the trained GPT-SoVITS V2ProPlus My Voice actor.
- A6 now binds the Start-proven MyVoice actor identity to the authoritative Meeting generation; Live synthesis requires that exact identity and fails closed if it changes or becomes unavailable. Piper/SAPI are not fallback authorities for required outbound Meeting voice.

## Voice Actor Storage Contract

Approved ownership is:

```text
UserData/CacheData/VoiceLab/
-> guided takes
-> prepared training data
-> candidate checkpoints
-> held-out generated evaluations
-> temporary build evidence

UserData/SavedProject/VoiceLab/
-> explicitly approved My Voice actor only
```

A rebuild must not remove or replace the currently approved actor until the new build has completed, been evaluated, and been explicitly approved. General History/Saved conversation persistence remains separate and deferred.

## Meeting Ownership

`commands/meeting_session.rs` + `engine/runtime_state.rs` remain the application Meeting owner.

Start establishes one session/authority. Navigation does not stop/recreate it. Stop revokes output authority before resource cleanup, stops both audio lanes, cancels/joins Meeting work, clears transient conversation/audio state, and ends the session. Safe application close uses the same Stop owner and fails closed when session state cannot be verified. Windows suspend/resume window messages only enqueue a bounded nonblocking cleanup signal; a Rust lifecycle worker then converges through the same authority-first Meeting Stop owner.

Required outbound activation is transactional before `Live`: after the application Meeting generation owns `Starting` authority, the required microphone capture opens, A6 performs generation-bound ASR/ID->EN/MyVoice functional proof and binds the approved actor identity, the exact prepared virtual output endpoint must build/start a bounded silent CPAL stream and produce a native callback, and the serialized outbound consumer must be created. A final readiness recheck must still pass before the same generation may commit `Live`. Optional incoming Meeting Sound remains independent and starts after required outbound is Live. The silent callback probe proves native endpoint execution only; actual virtual-cable/meeting-app reception remains target-Windows evidence.

The current Meeting Microphone route consumes an already-installed matched virtual-audio pair. Provider installation/distribution is not owned by the route source. The repository has not approved bundling VB-Cable, Voicemeeter, another third-party driver, or a custom TranslateIT driver; release distribution for that provider is a separate product/licensing decision.

VoiceLab extends this same Start authority without another lifecycle. Live synthesis uses the Start-proven MyVoice actor identity; actor disappearance/change/load/synthesis failure is fail-closed and requires a later Start rather than a silent fallback voice.

The bounded committed-turn store is transient Live transcript state only; Meeting Stop has no History persistence dependency. Outbound timing is attached to the same transient Meeting owner: finalized speech records the detected finalization point and speech-boundary delay, the Meeting consumer records queue/audio-preparation/AI-stage durations, and Rust/CPAL output reports first translated playback from CPAL's predicted device-playback timestamp. No latency threshold is hardcoded before target-PC evidence, and C2 adds no persistent conversation/telemetry log.

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

VoiceLab does not automatically reintroduce the retired `voice_actor_profile_id`, `use_custom_voice_actor`, or configurable profile-root settings. The first approved product has one My Voice actor in a canonical user-data location. Add persisted selection/schema fields only if a real current requirement later needs them.

`commands/settings.rs` owns the bounded audio-device selection transaction at the desktop boundary: load the current preference, functionally verify a requested microphone through a short CPAL stream/callback check (while routine status remains configuration-only), probe Meeting Sound through the existing output-device owner, preserve the old preference on failure, persist on success, and return the canonical resulting settings. The microphone verification retains no PCM/audio body. The frontend does not duplicate that rollback rule.

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

VoiceLab now has the bounded `voice_lab_build.rs` build-process owner plus A5 inference tasks in the existing canonical Python worker. This does not create a generic service framework, model registry, second settings store, second daily worker launcher, or alternate readiness owner.

Normal post-setup `loadProductRuntimeSnapshot()` lazily starts the one helper only when its lifecycle is known `not_started`/`stopped`, then reads Meeting status/preflight, helper status, input status, and worker capability when the helper is ready. Fresh `meeting_setup_state = new` boot does not enter this normal snapshot path and therefore does not start Python. Heavy diagnostic/model/native probing is not normal polling work. During an active Meeting, the recurring frontend path polls Meeting status; the larger committed-turn snapshot is conditional on a status revision change rather than fetched unconditionally on every interval.

Required outbound AI Start readiness is generation-bound functional truth rather than preload-only truth. A6 uses `voice_actor_preflight` and `voice_actor_synthesize` for approved `MyVoice` warm/cache + bounded functional synthesis while preserving generation-bound cache/invalidation semantics and the existing real ASR/translation checks. Diagnostic generation `0` may prove functional setup readiness but cannot yield Live actor authority.

## Release Boundary

Initial controlled release keeps one local Windows application/runtime architecture and does not add a SHA-256 identity framework, artifact registry, downloader, package manager, second installer, or first-use model download flow.

Installed Python execution remains:

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/
└─ PythonRuntime/
   └─ python.exe
```

Packaged source resolves only `PythonRuntime/python.exe`. Repository env/`.venv`/system-Python discovery is development-only. Models remain under `EngineData/Backend/RuntimeAssets`.

P3 now source-closes the deterministic runtime/model packaging contract:

```text
controlled release payload staging
-> scripts/validate_release_payload.mjs
-> scripts/build_release.ps1
-> Tauri build with src-tauri/tauri.release.conf.json
-> NSIS bundle input
```

`tauri.release.conf.json` maps only the production WorkerRuntime files, private `PythonRuntime`, required ASR/translation model roots, and GPT-SoVITS VoiceLab root into the same `EngineData/Backend` installed layout consumed by `ProjectPaths`. It does not bundle the whole repository or whole WorkerRuntime.

The private/model payload bytes are controlled release inputs and remain outside Git. Release payload validation fails closed when required Python/model/GPT-SoVITS/FFmpeg/NLTK inputs are missing, when the GPT-SoVITS revision marker does not match the approved pin, or when known unapproved GPT-SoVITS WebUI/server/UVR/ASR baggage is staged.

The one-private-runtime architecture remains the approved VoiceLab integration target. Full GPT-SoVITS upstream requirements are not accepted as product dependencies by default; only dependencies earned by the approved English training/inference path may enter the canonical lock. WebUI, Gradio, FastAPI server, FunASR, ModelScope, UVR/audio-separation features, and unrelated language tooling must not be bundled solely because upstream ships them.

P3 source proof establishes resource-map ownership and fail-closed release-input contracts only. Actual private Python/model bytes, successful NSIS generation, installed runtime execution, clean-machine behavior, and Meeting audio provider provisioning remain release/target proof or unresolved distribution policy.

## Deferred Proof Boundary

The user currently postpones **user-local-PC**, real Windows audio/device, installer, and clean-machine testing. This changes where/when proof is executed, not the acceptance standard.

Remote GitHub-hosted Windows proof already established the pre-VoiceLab executable/frontend boundaries:

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
real locked Python worker/model execution -> ASR + ID<->EN + pre-VoiceLab English TTS on CPU fallback
```

Hosted Windows proofs now also establish VoiceLab A4 build/evaluation source closure, A5 canonical-worker trained-actor inference, A6 generation-bound MyVoice Meeting integration, the final VoiceLab source closure, and P3 deterministic runtime/model/private-Python packaging source ownership. They still do **not** prove real target MyVoice quality, staged GPT-SoVITS/private-Python payload execution, CUDA/VRAM practicality, actual custom-TTS latency, physical microphone behavior, provider provisioning, Meeting virtual-audio delivery, real Meeting-app reception, sleep/wake behavior during a live custom-voice session, installed execution, or clean-machine behavior.

Before release, remaining proof/materialization or product decisions include:

```text
Meeting audio provider distribution/provisioning policy
actual controlled PythonRuntime + ASR/translation/GPT-SoVITS payload staging
successful NSIS installer generation with those controlled inputs
real trained Voice Actor quality and rebuild acceptance on target Windows
installed private PythonRuntime + model execution and GPU-capable CUDA proof
Windows Meeting audio/device validation
Start / Stop / Safe Close / power lifecycle runtime acceptance
trained Voice Actor latency / stability / long-session measurement
installer / installed-runtime proof
clean-machine proof
```

`EngineData/Frontend/RustApp/package-lock.json` remains the canonical npm lockfile for the current Svelte/Vite/Tauri frontend dependency graph.
