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
| Global Meeting cross-view presentation | existing shell + `GlobalMeetingShell.ts` -> canonical Meeting status/facade | **SOURCE ALIGNED / RENDER PROOF LATER** | Compact strip reads canonical Meeting state outside Meeting; no frontend lifecycle store. |
| Native safe-close lifecycle | `GlobalMeetingShell.ts` + `src-tauri/src/main.rs` -> canonical `stop_meeting_translation` | **SOURCE ALIGNED / NATIVE RUNTIME PROOF LATER** | Active/unknown Meeting state fails closed; Stop & Close destroys only after verified session clear. |
| First Setup / device preference | First Setup + `RuntimeSettings.audio` + product/audio facade | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Physical mic and Meeting Sound preferences preserve Follow Windows Default vs pinned-device intent. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | One application `session_id`; outbound Pause invalidates generation, Resume creates fresh generation. |
| Physical microphone capture | `engine/audio/live_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | One native input stream feeds rolling preview + outbound finalized speech. |
| Meeting Sound capture | `engine/audio/meeting_sound_capture.rs` | **SOURCE ALIGNED / LIVE DEFAULT-REBIND GAP / WINDOWS PROOF LATER** | Incoming lane resolves selected/default render endpoint at Start and opens one loopback stream; mid-session Windows Default endpoint rebinding is not yet implemented. |
| Finalized Meeting speech/event ordering | `engine/audio/finalized_utterance.rs` | **SOURCE ALIGNED / AUDIO PROOF LATER** | Independent lane VAD feeds one session-wide event `sequence` allocated at finalization before AI. |
| Finalized temporary WAV handoff | `engine/audio/live_segment_writer.rs` | **SOURCE ALIGNED / FILE I/O PROOF LATER** | Both `YOU` and `INCOMING` finalized events use the same bounded temporary WAV owner with lane/event identity. |
| Serialized Meeting outbound | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Final ID ASR -> verified Realtime EN translation -> TTS -> guarded Meeting route. |
| Serialized Meeting incoming | `meeting_session.rs` + one incoming consumer | **SOURCE ALIGNED / WINDOWS + MODEL PROOF LATER** | Final EN Meeting Sound ASR -> verified Realtime ID translation -> same committed-turn store; no incoming TTS. |
| Self-output suppression | `meeting_session.rs` transient gate -> `meeting_sound_capture.rs` | **SOURCE ALIGNED / WINDOWS MIX PROOF LATER** | Incoming samples are discarded/reset while TranslateIT's guarded TTS route is active. |
| Committed Meeting turn source | `meeting_session.rs` bounded transient store | **SOURCE ALIGNED / RUNTIME PROOF LATER** | One conversation-body owner stores ordered `YOU` + `INCOMING` turns; incoming has no delivery claim. |
| Meeting Live transcript read path | `get_meeting_committed_turns` -> `runtimeApi.ts` -> `MeetingLiveActivityPresentation.ts` | **SOURCE ALIGNED / TAURI + RENDER PROOF LATER** | Frontend rebuilds from one backend snapshot and renders both lanes without accumulating conversation state. |
| Meeting History finalization | `meeting_session.rs` Stop handoff -> `history_store.rs` | **SOURCE ALIGNED / FILESYSTEM + RENDER PROOF LATER** | Full Stop snapshots both committed lanes, applies History policy, then clears transient bodies. |
| History / Saved | `history_store.rs`, `history.rs`, frontend History | **SOURCE ALIGNED / FILESYSTEM + RENDER PROOF LATER** | Final Meeting detail renders lane-aware turns; Saved remains generic/explicit. |
| Helper scheduling / cancellation | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **SOURCE ALIGNED / CONTENTION PROOF LATER** | One scheduler: Meeting outbound > Meeting incoming > Text > Diagnostics; Stop cancels by Meeting session. |
| Text AI execution | `text_translate.rs` -> helper scheduler -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent worker route; Text requests Quality. |
| Translation tone/context | settings + current worker calls | **MISSING / PLAN NEXT** | Approved Auto/Formal/Casual + bounded committed Meeting context still do not reach canonical inference. |
| Meeting outbound audio route | virtual-route owners + provider | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware blocking route dispatch exists; actual delivery remains unproved. |
| Python dependency/tooling | `WorkerRuntime/pyproject.toml` | **SOURCE ALIGNED / LOCK + EXECUTION PROOF LATER** | One dependency/Ruff/pytest owner; `uv.lock` is not fabricated. |
| Packaging/runtime assets | Tauri/NSIS + helper discovery | **PARTIAL / STALE ASSUMPTIONS** | End-user packaged runtime/model acquisition remains unresolved. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve post-core; not current core blocker. |

## 1. One Application Meeting Authority

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

One application Meeting session remains authoritative. Audio lanes, frontend
presentation, History, and native close do not own/recreate it.

Outbound uses generation authority. Incoming uses the same application `session_id`
but is deliberately not tied to outbound generation so it can remain available while
outbound is Paused.

## 2. Distinct Audio Capture Owners

Physical microphone remains:

```text
RuntimeSettings.audio.input_device_id
-> live_capture.rs input stream
-> outbound finalized speech
```

Meeting Sound is now separate:

```text
RuntimeSettings.audio.output_device_id
-> meeting_sound_capture.rs render/output endpoint
-> output-loopback PCM
-> incoming finalized speech
```

At lane Start, `None` resolves Windows Default. A pinned missing Meeting Sound endpoint
fails the optional incoming lane rather than silently substituting another output
device.

The current dependency path uses the existing CPAL/WASAPI backend; no second audio
crate/runtime was introduced. `commands/audio.rs::probe_output_device_candidate()`
remains preference/readiness probing only and does not become a capture/session owner.

Actual Windows output-loopback audio, callback behavior, and device compatibility
remain local proof. **Mid-session Follow Windows Default output-endpoint change/rebind
is not source-implemented yet**; the current capture owner resolves the endpoint when
the incoming lane starts.

## 3. Shared Finalized Speech / Event Ordering

`engine/audio/finalized_utterance.rs` is the single finalized Meeting speech boundary.
It owns two lane-local VAD producer states but one session-wide event sequence:

```text
FinalizedMeetingUtterance
├─ session_id
├─ sequence                # allocated when speech finalizes, before AI
├─ lane                    # you | incoming
├─ generation              # outbound Some(...), incoming None
├─ utterance_id            # lane-local provenance
└─ finalized AudioFrame
```

This preserves PR-048 conversation order when outbound and incoming AI work complete at
different times.

New Start resets the shared sequence. Pause clears/replaces outbound finalization only;
incoming finalization and sequence continue. Resume attaches fresh outbound generation
to the same sequence. Full Stop clears both after consumers are stopped.

Incoming pending finalization remains bounded and freshness-biased: when its small
pending queue is full, older pending incoming speech is discarded rather than growing
an obsolete subtitle backlog.

## 4. One Canonical Dual-Lane Conversation Store

`meeting_session.rs` remains the only transient conversation-body owner:

```text
MeetingCommittedTurn
├─ session_id
├─ sequence
├─ generation: optional     # outbound only
├─ utterance_id
├─ lane: you | incoming
├─ source_text
├─ translated_text
├─ delivery_state: optional # outbound only
├─ created_unix_ms
└─ updated_unix_ms
```

Dedupe identity is `(session_id, sequence)`. Insertion and read snapshots preserve the
preassigned event sequence even when later events finish model work first.

Outbound retains `preparing_voice / speaking / output_complete / output_failed /
interrupted`. Incoming has `delivery_state = None` because it never performs voice
output.

## 5. Incoming AI Lane

The incoming consumer is session-scoped under `meeting_session.rs`:

```text
finalized INCOMING event
-> bounded temporary WAV
-> final English ASR
-> same application Meeting session still incoming-eligible
-> Realtime English -> Indonesian translation
-> same session check
-> commit INCOMING using preassigned sequence
```

Incoming helper requests carry:

```text
meeting_session_id
meeting_lane = incoming
meeting_sequence
utterance_id
```

They do not carry outbound `meeting_generation` authority. Failed/empty/canceled
incoming work does not become a committed turn. Incoming failure is reported as a
scoped degraded lane and does not convert a healthy required outbound path into a
failed Start.

No participant/process identity is inferred from mixed output-device audio.

## 6. Pause / Resume / Stop Semantics

```text
Start
-> required outbound commits Live
-> optional Meeting Sound capture + incoming consumer attempted

Pause
-> invalidate outbound generation
-> stop physical mic / outbound route / outbound consumer
-> keep healthy Meeting Sound capture + incoming consumer

Resume
-> fresh outbound generation
-> reopen outbound resources
-> retain healthy incoming lane + shared sequence

Stop
-> revoke outbound authority
-> stop physical mic
-> stop Meeting Sound capture
-> cancel helper by Meeting session
-> join outbound + incoming consumers
-> immutable final committed-turn snapshot
-> existing History policy
-> clear suppression / sequence / turns / session
```

If outbound Pause hard-cancels an active outbound helper request, the same helper owner
may be restarted so a healthy session-scoped incoming lane can continue. No second
worker is created.

## 7. Self-Output Suppression

`meeting_session.rs` owns one session-scoped atomic suppression handle. The Meeting
Sound capture owner only consumes that handle.

```text
about to route TranslateIT English TTS
-> reset incoming speech boundary
-> suppression ON
-> guarded blocking Meeting route dispatch

Meeting Sound callback while ON
-> discard samples
-> reset incoming speech boundary
-> finalize no INCOMING event from that interval

route returns/cancels
-> suppression OFF
-> reset incoming boundary
-> healthy incoming returns to listening
```

The guarded route is blocked if the suppression boundary itself is unavailable, rather
than risking TranslateIT's own English TTS becoming a remote-looking `INCOMING` turn.

Initial tradeoff remains intentional: participant speech mixed into Meeting Sound while
TranslateIT itself is speaking may be omitted. Acoustic echo cancellation,
fingerprinting, similarity heuristics, and participant separation are not current
owners.

## 8. One Helper Scheduler

`helper_bridge_runtime.rs` still owns one non-preemptive scheduler:

```text
Meeting outbound
> Meeting incoming
> Text
> Diagnostics / preload
```

Outbound requests retain generation checks. Incoming requests are checked against the
same application Meeting session before worker execution and again before promotion.
Full Stop can hard-cancel an active helper task by Meeting session; Pause uses only
outbound generation cancellation.

Actual contention/latency suitability remains local performance proof.

## 9. Product Presentation And History

`MeetingSessionStatus` remains conversation-body-free. It now carries one lightweight
`incoming` status for capture/stage/degraded/suppressed truth.

Live conversation bodies still use only:

```text
get_meeting_committed_turns
-> runtimeApi
-> MeetingLiveActivityPresentation
```

The frontend sorts by canonical `sequence` and renders:

```text
YOU
Indonesian primary
English secondary
outbound delivery state

INCOMING
Indonesian translation primary
English source secondary
no participant identity
no voice-delivery state
```

The frontend does not accumulate a second transcript store. Incoming-only degradation
stays scoped to Meeting rather than the global outbound safety strip.

History finalization reuses the same `HistoryTurn.lane` and nullable delivery state.
Meeting History detail applies the same lane presentation as Live. Persistent History
still owns only finalized Stop snapshots; it is never the Live source.

## 10. Global Shell / Safe Close

Existing source-aligned behavior remains:

- compact cross-view Meeting strip reads canonical lifecycle status only;
- `Open Meeting` reuses current navigation;
- close-request fails closed on active/unknown Meeting state;
- `Stop & Close` reuses canonical Stop and verifies no session before destroy;
- orderly native exit delegates to the same backend Stop owner.

Incoming work did not add another global lifecycle/control plane.

## 11. Static Regression Definition

`validate_startup_runtime_readiness.mjs` now defines source checks for:

- distinct physical-mic and Meeting-Sound capture ownership;
- selected output-device loopback path without a new session/conversation owner;
- one shared event sequence allocated before lane AI work;
- lane-aware finalized WAV identity;
- one dual-lane committed-turn store ordered by event sequence;
- incoming English ASR -> Indonesian translation without outbound generation or TTS;
- self-output suppression wrapping the guarded route interval;
- Pause retaining incoming while Stop cleans both lanes;
- one helper scheduler with outbound > incoming > Text > Diagnostics waiting order;
- lane-aware Live and History rendering;
- preservation of prior History/global-strip/safe-close ownership boundaries.

The validator definition has **not** been executed in this channel. Its Stop-order
check is scoped to the active Stop branch rather than accidentally matching cleanup in
the idempotent already-stopped branch.

## 12. Remaining Core Work

```text
plan translation tone + bounded Meeting context consumption
Meeting Sound Follow Windows Default mid-session rebind/recovery
Text Copy/direct Save
multi-instance enforcement + sleep/hibernate lifecycle
uv.lock + real dependency resolution
Ruff / pytest / TypeScript / Rust execution proof
scheduler contention measurement
actual model translation/TTS quality + performance
Windows microphone/VAD/Meeting Sound/self-suppression/Meeting route/native-close proof
packaging/clean-machine reconciliation
```

Documents remains retired. Audio Studio remains post-core. Svelte remains a separate
future frontend architecture decision after core runtime contracts stabilize.

## Current Mode / Continuation

Current mode: **Plan**.  
Execution channel: `ChatGPT -> GitHub`.

Canonical Incoming Meeting Sound + Self-Output Suppression is source-aligned at the
bounded initial capture/processing ownership claims above. Mid-session default-endpoint
rebinding remains a named source gap. No TypeScript/Rust compilation, validator
execution, Windows loopback/device behavior, self-output suppression effectiveness,
model/audio quality, rendered UI, persistence runtime, race timing, or performance
proof has been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`.
