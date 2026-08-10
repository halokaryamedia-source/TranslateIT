# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
**Branch:** `New`

This file maps product responsibilities to current semantic/source owners. It is not
a backlog, session log, or runtime proof report. `docs/knowledge/next-action.md` owns
the single active continuation.

Status vocabulary:

```text
ALIGNED   -> one current owner substantially matches approved behavior
PARTIAL   -> useful owner exists but required behavior/proof is incomplete
CONFLICT  -> more than one current path competes for the same responsibility
MISSING   -> approved capability has no complete current owner
STALE     -> source still expresses superseded behavior
RETIRED   -> inherited concept is no longer approved product scope
```

Static source/tooling alignment never becomes model-quality, latency,
scheduling-performance, VAD behavior, CUDA/CPU, Windows-device/audio, rendered-UI,
installed-runtime, persistence-runtime, native-event-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `shell.ts`, `lockedReferenceShellParts.ts`, `SimpleLauncherController.ts` | **ALIGNED / VISUAL PARTIAL** | Meeting / Text / History / Settings; navigation does not own/recreate Meeting runtime. |
| Global Meeting cross-view presentation | existing shell + `GlobalMeetingShell.ts` -> canonical Meeting status/facade | **SOURCE ALIGNED / RENDER PROOF LATER** | One compact strip reads canonical Meeting state outside Meeting; no frontend Meeting store or global lifecycle control plane. |
| Native safe-close lifecycle | `GlobalMeetingShell.ts` + `src-tauri/src/main.rs` -> canonical `stop_meeting_translation` | **SOURCE ALIGNED / NATIVE RUNTIME PROOF LATER** | Active/unknown Meeting state fails closed; Stop & Close reuses canonical Stop and destroys only after verified session clear. |
| First Setup / device preference | First Setup + `RuntimeSettings.audio` + product/audio facade | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Physical mic and Meeting Sound preferences preserve Follow Windows Default vs pinned-device intent. |
| Normal Meeting lifecycle bridge | `runtimeApi.ts` -> `runtimeProductFacade.ts` -> `SimpleLauncherController.ts` -> Meeting commands | **SOURCE ALIGNED / TAURI + RENDER PROOF LATER** | Start/Pause/Resume/Stop use the canonical application Meeting authority. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | One `session_id`; outbound Pause invalidates generation, Resume creates fresh generation. |
| Physical microphone capture | `engine/audio/live_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | One native input stream feeds rolling preview and current outbound finalized speech. |
| Finalized Meeting speech/event ordering | `engine/audio/finalized_utterance.rs` | **OUTBOUND SOURCE ALIGNED / DUAL-LANE RECONCILIATION NEXT** | Current source is outbound-only; planned owner will retain lane-local VAD but allocate one session-wide event sequence before AI. |
| Meeting Sound capture | planned `engine/audio/meeting_sound_capture.rs` | **OWNER DECIDED / IMPLEMENTATION NEXT** | Distinct Windows output-loopback responsibility for selected Meeting Sound endpoint; not a second Meeting runtime. |
| Serialized Meeting outbound | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Final ID ASR -> verified Realtime EN translation -> TTS -> guarded Meeting route. |
| Serialized Meeting incoming | `meeting_session.rs` + one incoming consumer | **OWNER DECIDED / IMPLEMENTATION NEXT** | Final EN ASR -> verified Realtime ID translation -> same committed-turn store; no incoming TTS. |
| Committed Meeting turn source | `meeting_session.rs` bounded transient store | **SOURCE ALIGNED OUTBOUND / DUAL-LANE RECONCILIATION NEXT** | Remains the only conversation-body owner; planned shape supports `YOU` + `INCOMING`, preassigned event sequence, optional outbound-only delivery state. |
| Meeting Live transcript read path | `get_meeting_committed_turns` -> `runtimeApi.ts` -> `MeetingLiveActivityPresentation.ts` | **SOURCE ALIGNED OUTBOUND / INCOMING RENDER NEXT** | Frontend rebuilds from backend snapshots; no browser conversation accumulator. |
| Meeting History finalization | `meeting_session.rs` Stop handoff -> `history_store.rs` | **SOURCE ALIGNED / FILESYSTEM + RENDER PROOF LATER** | Full Stop persists at most one allowed Recent Meeting snapshot, then clears transient bodies. |
| History / Saved | `history_store.rs`, `history.rs`, frontend History | **SOURCE ALIGNED / FILESYSTEM + RENDER PROOF LATER** | Text and finalized Meeting entries share `Recent/Saved`; lane field already supports `incoming`. |
| Self-output suppression | planned transient gate owned/orchestrated by `meeting_session.rs`, consumed by Meeting Sound capture | **OWNER DECIDED / IMPLEMENTATION NEXT** | Incoming samples are fail-closed while guarded TranslateIT TTS playback is active; no second echo/suppression runtime. |
| Helper scheduling / cancellation | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **SOURCE ALIGNED BASE / LANE PRIORITY RECONCILIATION NEXT** | One scheduler currently has Meeting > Text > Diagnostics; planned waiting order is outbound > incoming > Text > Diagnostics. |
| Text AI execution | `text_translate.rs` -> helper scheduler -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent worker route; Text requests Quality. |
| Translation bounds/completeness | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent input truncation; generated translation requires verifiable completion. |
| English TTS voice selection | `realtime_local_worker.py` | **SOURCE ALIGNED / WINDOWS + ASSET PROOF LATER** | Explicit English-capable Piper/SAPI voice required. |
| Meeting outbound audio route | virtual-route owners + provider | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware blocking route dispatch exists; actual delivery remains unproved. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Python dependency/tooling | `WorkerRuntime/pyproject.toml` | **SOURCE ALIGNED / LOCK + EXECUTION PROOF LATER** | One dependency/Ruff/pytest owner; `uv.lock` is not fabricated. |
| Packaging/runtime assets | Tauri/NSIS + helper discovery | **PARTIAL / STALE ASSUMPTIONS** | End-user packaged runtime/model acquisition remains unresolved. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve post-core; not current core blocker. |

## 1. Canonical Application Meeting Lifecycle

```text
Meeting workspace / global shell
-> runtimeProductFacade
-> runtimeApi
-> get_meeting_session_status
   / start_meeting_translation
   / pause_meeting_translation
   / resume_meeting_translation
   / stop_meeting_translation
-> runtime_state.rs + meeting_session.rs
```

One application Meeting session remains authoritative. Navigation, global strip,
History, and native close presentation do not own/recreate it.

Pause revokes outbound generation authority while retaining the Meeting `session_id`.
Resume creates a fresh outbound generation for the same session. Stop is the single
full-session cleanup + History-finalization path.

## 2. Current Outbound Source

```text
physical microphone
-> live_capture.rs
-> finalized_utterance.rs
-> finalized WAV
-> meeting_session.rs serialized outbound consumer
-> final Indonesian ASR
-> generation check
-> verified Realtime English translation
-> committed YOU turn
-> English TTS
-> guarded Meeting Microphone route
```

Current outbound committed identity uses generation-local finalized utterance identity,
and current delivery states are `preparing_voice / speaking / output_complete /
output_failed / interrupted`.

The virtual-audio provider performs blocking WAV playback to the selected managed
Meeting Microphone route. That blocking boundary is the planned exact source-controlled
self-output interval for incoming suppression. Windows delivery remains local proof.

## 3. Current Meeting Sound Evidence

`RuntimeSettings.audio.output_device_id` already owns the Meeting Sound endpoint
preference.

`commands/audio.rs::probe_output_device_candidate()` currently proves only that the
selected Windows output device exists and has a usable output configuration. It
explicitly states that incoming Meeting Sound capture is a separate unimplemented
capability.

`engine/audio/live_capture.rs` selects an **input** device and owns one physical-
microphone input stream. It is therefore not the correct owner to masquerade as
Meeting Sound output-loopback capture.

No current `New` source exposes a Windows output-loopback capture owner.

## 4. Planned Meeting Sound Capture Owner

Create one distinct audio responsibility under the existing audio subsystem:

```text
engine/audio/meeting_sound_capture.rs
```

It owns only:

```text
selected Meeting Sound output endpoint
-> native Windows output-loopback PCM
-> incoming finalized-speech input
```

It does not own Meeting lifecycle, AI inference, conversation state, persistence, or
frontend state.

Device semantics remain canonical:

- `output_device_id = None` -> Follow Windows Default;
- explicit pinned device -> use that device only;
- pinned missing -> incoming unavailable/degraded, no silent substitution;
- incoming failure never blocks otherwise healthy required outbound.

Exact Windows loopback API/binding must be verified from current official platform /
selected binding documentation before the Developing patch.

## 5. Shared Finalized Speech / Event Ordering

`engine/audio/finalized_utterance.rs` remains the single finalized-speech boundary but
must be reconciled from outbound-only state into dual-lane Meeting finalization.

Planned conceptual event:

```text
FinalizedMeetingUtterance
├─ session_id
├─ sequence                # one session-wide event order, allocated before AI
├─ lane                    # you | incoming
├─ generation              # outbound Some(...), incoming None
├─ utterance_id            # lane-local provenance
└─ finalized AudioFrame
```

Lane VAD/producers remain independent, but the sequence allocator is shared. This is
required because PR-048 orders conversation by speech/event order, not asynchronous
ASR/translation completion order.

New Start resets session ordering. Pause disables/clears outbound finalization but
retains incoming finalization and the shared sequence. Resume attaches the fresh
outbound generation to the same sequence. Stop clears both only after consumers are
stopped.

## 6. Canonical Dual-Lane Committed Turns

`meeting_session.rs` remains the one bounded transient conversation-body owner.

Planned lane-neutral contract:

```text
MeetingCommittedTurn
├─ session_id
├─ sequence                 # supplied by finalized event boundary
├─ generation: optional     # outbound provenance only
├─ utterance_id
├─ lane: you | incoming
├─ source_text
├─ translated_text
├─ delivery_state: optional # outbound only
├─ created_unix_ms
└─ updated_unix_ms
```

The store deduplicates by `(session_id, sequence)` and presents turns in that sequence.
Outbound keeps existing delivery semantics. Incoming has `delivery_state = None`
because no voice delivery is performed.

Incoming commit rule:

```text
finalized INCOMING event
-> final English ASR
-> same application Meeting session still lane-eligible
-> verified Realtime English -> Indonesian translation
-> same session check
-> commit INCOMING using preassigned sequence
```

Partial/canceled/failed incoming work does not become a committed turn or normal
History content. No participant identity is created from mixed output-device audio.

## 7. Pause-Safe Incoming Authority

Incoming cannot be tied to `runtime_generation_is_authoritative()` because approved
Pause invalidates outbound generation while allowing incoming assistance to continue.

Planned authority check is read-only from existing runtime session state:

```text
same APPLICATION_MEETING_OWNER_ID
+ same session_id
+ phase still incoming-eligible
+ not stopping/ended
```

This helper carries no conversation data and creates no second authority.

Lifecycle integration:

```text
Start
-> required outbound commits Live
-> optional incoming capture/consumer attempt

Pause
-> stop outbound generation resources
-> keep healthy incoming capture/consumer

Resume
-> fresh outbound generation
-> keep existing healthy incoming lane

Stop
-> revoke outbound authority
-> stop both captures
-> cancel/join both consumers
-> final committed-turn snapshot
-> existing History policy
-> transient/session clear
```

## 8. Self-Output Suppression

One session-scoped transient atomic gate is controlled by `meeting_session.rs` around
current guarded outbound TTS route playback.

```text
route about to play TranslateIT TTS
-> suppression ON

Meeting Sound capture while ON
-> discard samples
-> reset in-progress incoming VAD
-> finalize no INCOMING speech from that interval

blocking route returns/cancels
-> suppression OFF
-> incoming resumes from fresh boundary
```

The gate is safety/transport state only, not Meeting lifecycle truth.

Initial tradeoff is intentional: mixed participant speech during TranslateIT's own
speaking interval may be omitted rather than risking a false self-generated INCOMING
turn. No content-similarity heuristic, waveform fingerprint database, acoustic-echo
service, or speculative second suppression runtime is planned in this slice.

## 9. One Helper Scheduler, Lane-Aware Waiting Priority

The persistent worker and scheduler remain single owners.

Planned waiting order:

```text
Meeting outbound
> Meeting incoming
> Text
> Diagnostics / preload
```

This remains non-preemptive for already-running work.

Outbound tasks retain `meeting_generation` authority checks. Incoming tasks carry the
Meeting `session_id` plus incoming lane identity and are rejected before execution /
promotion after the canonical session becomes Stopping/ended. Pause generation
cancellation therefore does not kill session-scoped incoming work; full Stop still
prevents late incoming promotion.

Incoming finalized queues remain bounded and prefer current comprehension: stale older
pending incoming speech is discarded before an old subtitle backlog grows.

## 10. Read-Only Product Presentation / History

`MeetingSessionStatus` stays body-free. It may gain one lightweight `incoming` runtime
status for capture/stage/degradation/suppression truth.

`get_meeting_committed_turns` remains the only Live conversation projection. Frontend
must render by lane without accumulating state:

```text
YOU
Indonesian primary
English secondary
outbound delivery state

INCOMING
Indonesian translation primary
English source secondary
no participant identity / no voice-delivery state
```

Incoming-only degradation stays scoped to Meeting and must not become a global
outbound failure.

History finalization remains unchanged in ownership. Existing `HistoryTurn.lane`
already distinguishes `incoming`; global Meeting entry ID->EN metadata continues to
represent the primary outbound workflow while lane determines per-turn direction.

Partial incoming subtitles are optional and remain out of this implementation slice.

## 11. Global Shell / Safe Close

Current source-aligned shell behavior remains:

- compact cross-view Meeting strip reads canonical status only;
- `Open Meeting` reuses current navigation;
- close-request fails closed on active/unknown Meeting state;
- `Stop & Close` reuses canonical Stop and verifies no session before destroy;
- orderly native exit delegates to the same backend Stop owner.

Incoming implementation must not add another global lifecycle control plane or bypass
Stop finalization.

## 12. Static Regression Contract

`validate_startup_runtime_readiness.mjs` currently protects the existing lifecycle,
transcript, History, global-strip, and safe-close boundaries. The incoming Developing
slice must extend it to prove statically:

- physical microphone and Meeting Sound have distinct capture owners;
- one shared finalized-event sequence exists for both lanes;
- the committed store remains the only conversation-body owner;
- incoming is session-scoped and Pause-safe, while Stop prevents late promotion;
- self-output gate wraps the existing blocking outbound route and prevents incoming
  finalization during the gate;
- one helper scheduler implements outbound > incoming > Text > Diagnostics waiting
  priority;
- frontend reads one committed-turn snapshot and maps `INCOMING` truthfully;
- no second History/session/scheduler/suppression runtime appears.

Static validator execution has not yet occurred for the incoming slice because the
slice is not implemented.

## 13. Remaining Core Work

```text
implement canonical Incoming Meeting Sound + self-output suppression
translation tone/context consumption
Text Copy/direct Save
multi-instance enforcement + sleep/hibernate lifecycle
uv.lock + real dependency resolution
Ruff / pytest / TypeScript / Rust execution proof
scheduler contention measurement
actual model translation/TTS quality + performance
Windows microphone/VAD/Meeting Sound/Meeting route/native-close proof
packaging/clean-machine reconciliation
```

Documents remains retired. Audio Studio remains post-core. Svelte remains a separate
future frontend architecture decision after core runtime contracts stabilize.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Engine consolidation, finalized outbound production, canonical Start/Stop,
Pause/Resume, committed outbound turns, Meeting History finalization, global
cross-view Meeting state, and safe Stop & Close are source-aligned at their bounded
claims. Incoming ownership, shared event ordering, session-scoped Pause semantics,
self-output suppression, and lane scheduler priority are now decided but not yet
source-implemented.

No compile/typecheck/validator execution, Windows Meeting Sound loopback, suppression
runtime, model/audio/device/rendered UI, persistence runtime, race timing, or
performance proof has been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`.