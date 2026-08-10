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
installed-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts` | **ALIGNED / VISUAL PARTIAL** | Normal app is Meeting / Text / History / Settings; navigation does not own/recreate Meeting runtime. |
| First Setup | First Setup + `RuntimeSettings` + product/audio facade | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Five-step flow, defer/resume, candidate-check -> commit. |
| Normal Meeting lifecycle bridge | `runtimeApi.ts` -> `runtimeProductFacade.ts` -> `SimpleLauncherController.ts` -> canonical Meeting commands | **SOURCE ALIGNED / TAURI + RENDER PROOF LATER** | Normal product reads application Meeting session directly; Start/Stop use canonical transactional commands; no frontend Meeting authority/store was added. |
| Text AI execution | `text_translate.rs` -> helper scheduler -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent worker route; Text explicitly requests Quality. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **ALIGNED AUTHORITY / PAUSE-RESUME MISSING** | `session_id + generation + authority_active` is canonical; backend Start/Stop and normal frontend use it. |
| Meeting capture | `audio/live_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | One CPAL capture owner; application Meeting capture feeds rolling preview and finalized speech paths separately. |
| Rolling audio / preview boundary | `audio/live_audio_buffer.rs` | **ALIGNED DIAGNOSTIC/PREVIEW OWNER** | ASR-ready rolling windows are not final speech and are not consumed by product Meeting output. |
| Finalized outbound utterance | `audio/finalized_utterance.rs` | **SOURCE ALIGNED / VAD PROOF LATER** | Realtime VAD state produces generation-scoped final utterances only after adaptive end silence; partial audio is not emitted. |
| Finalized WAV handoff | `audio/live_segment_writer.rs` | **SOURCE ALIGNED / FILESYSTEM PROOF LATER** | Each final gets a unique temporary 16 kHz mono WAV; rolling `latest_live_target_segment.wav` is diagnostic-only. |
| Serialized Meeting outbound consumer | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | One consumer takes each final utterance once, runs canonical AI/output stages serially, then removes the source WAV. |
| Meeting outbound AI mode | `meeting_session.rs` | **SOURCE ALIGNED / MODEL PROOF LATER** | Finalized outbound speech explicitly requests Realtime translation. |
| Helper scheduling / worker I/O | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **SOURCE ALIGNED / CONTENTION PROOF LATER** | One scheduler owns stdin/stdout; waiting Meeting > Text > Diagnostics. |
| Helper cancellation | helper bridge + Meeting generation authority | **SOURCE ALIGNED / TIMING PROOF LATER** | Stale Meeting work rejected; matching in-flight Meeting task may hard-cancel the worker process. |
| Translation source bounds | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent tokenizer truncation; unknown/oversized model-token input is rejected. |
| Translation output completeness | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL EXECUTION PROOF LATER** | Output is promoted only when EOS completion is verifiable. |
| English TTS voice selection | `realtime_local_worker.py` | **SOURCE ALIGNED / WINDOWS + ASSET PROOF LATER** | Piper requires English metadata; SAPI requires English culture and explicit `SelectVoice`. |
| Model installation evidence | `model_manifest.json`, `runtime_inventory.rs` | **ALIGNED STATIC OWNER / METADATA PARTIAL** | Asset presence only, not model-load/inference proof. |
| Current AI capability availability | persistent worker `status` -> helper bridge | **SOURCE ALIGNED / LOAD-INFERENCE PROOF LATER** | ASR / Realtime translation / Quality translation / explicit-English TTS capability states are scoped. |
| Product readiness | direct `MeetingSessionPreflight` + worker capability -> `runtimeProductFacade.ts` | **SOURCE ALIGNED / LOCAL PROOF LATER** | Text uses Quality capability; Meeting uses canonical application preflight/session rather than legacy gates. |
| Python dependency/tooling ownership | `WorkerRuntime/pyproject.toml` | **SOURCE ALIGNED / LOCK + EXECUTION PROOF LATER** | One Python project owns runtime deps, optional route extra, Ruff, and pytest. `uv.lock` is intentionally not fabricated. |
| Python deterministic proof | `WorkerRuntime/tests/test_worker_contract.py` + pytest config | **SOURCE ALIGNED / NOT EXECUTED** | Deterministic mode/bounds/EOS/voice/protocol test definitions exist. |
| Python source quality policy | Ruff config in `pyproject.toml` | **SOURCE ALIGNED / NOT EXECUTED** | Ruff is the single Python lint/format policy. |
| Local Python profiling | `py-spy` procedure in WorkerRuntime README | **DOCUMENTED / LOCAL ONLY** | Profile the actual persistent worker PID; py-spy is not a product dependency. |
| Persistent worker smoke | `run_realtime_worker_smoke.ps1` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One worker process is reused; evidence stores bounded stage/completion/voice metadata without conversation bodies/file paths. |
| History / Saved | `history_store.rs`, `history.rs`, frontend History | **TEXT ALIGNED / MEETING PARTIAL** | Canonical store is `UserData/SavedProject/History/{Recent,Saved}`. |
| Meeting outbound audio route | virtual-route owners | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware route cancellation exists; delivery unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Loopback -> EN ASR -> ID text and self-output suppression are not implemented. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Packaging/runtime assets | Tauri/NSIS + bridge Python discovery | **PARTIAL / STALE ASSUMPTIONS** | End-user packaged Python/runtime acquisition is unresolved; `uv` is not an end-user requirement. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve post-core; not current core blocker. |

## 1. Canonical Product Meeting Lifecycle

Normal product frontend does not keep a second Meeting session truth.

```text
Meeting workspace
-> runtimeProductFacade
-> runtimeApi
-> get_meeting_session_status / start_meeting_translation / stop_meeting_translation
-> application Meeting session authority
```

`runtimeProductFacade.mapProductMeetingState()` maps backend state into product-level
`Ready / Starting / Live / Stopping / In Use / Setup Needed` behavior and recognizes
only `translateit_application_meeting` as product Meeting ownership.

Primary Meeting action:

```text
idle + preflight ready -> Start Translation
Live                   -> Stop Translation
starting/stopping      -> disabled transition label
blocked/conflict       -> disabled Start + setup/recovery path
```

Navigation to Text, History, or Settings only changes presentation. It does not call
Meeting Start/Stop or create a new session. A later global Meeting strip may expose
this same authority across views; it must not introduce another lifecycle store.

Mic Test/direct capture is blocked while a runtime session owns Meeting resources,
so diagnostic `start_capture/stop_capture` cannot silently replace or tear down an
application Meeting session.

Actual Tauri invocation, rendered transition behavior, navigation while Live, and
window lifecycle remain local/rendered proof.

## 2. Canonical Outbound Speech / AI Execution

Standalone Text:

```text
Text UI
-> runtimeProductFacade
-> runtimeApi.translateText
-> commands/text_translate.rs [Quality]
-> helper scheduler [Text]
-> persistent realtime_local_worker.py
-> verified-complete Quality result
```

Application Meeting:

```text
physical microphone
-> application-owned live capture
   +-> rolling buffer [preview/diagnostic only]
   +-> finalized utterance producer
-> session_id + generation + utterance_id
-> one-shot finalized queue pop
-> unique temporary WAV
-> serialized Meeting consumer
-> ASR
-> generation check
-> Realtime translation + verified completion
-> generation check
-> explicit English TTS
-> generation check
-> guarded Meeting Microphone route
```

`latest_live_target_segment.wav` remains diagnostic-only. Product Meeting uses unique
finalized temporary WAVs and removes them after the outbound attempt.

Retired from product execution:

```text
manual_translation.rs
manual_translation_accelerated.rs
realtime_local_worker_entry.py
realtime_local_worker_accelerated.py
rule/dictionary/preview translation success
legacy capture-owned one-shot AI pipeline
silent Realtime <-> Quality retry
rolling-ASR-window polling as Meeting output
```

## 3. Scheduler / Cancellation

Mode authority:

```text
Meeting outbound -> Realtime
Standalone Text  -> Quality
```

One scheduler exists in the helper bridge. Waiting priority is:

```text
Meeting > Text > Diagnostics / preload
```

This is **queue priority, not preemption**. A Meeting request arriving after active
Text inference still waits for that current task. Local contention/latency proof is
required before calling it realtime-optimal.

Meeting Stop revokes application generation first. Matching in-flight Meeting
inference may terminate the persistent worker; finalizer/consumer state is
cleared/joined after authority revoke. Actual process/race timing remains local proof.

## 4. Finalized Utterance Boundary

`audio/finalized_utterance.rs` owns application Meeting speech finalization.
`audio/live_audio_buffer.rs` remains rolling/preview/diagnostic ownership.

```text
bounded pre-roll
-> existing Realtime VAD speech evidence
-> one in-progress utterance
-> trailing non-speech
-> adaptive end-silence threshold
-> revalidate speech portion
-> FINAL
```

Final identity is `session_id + generation + utterance_id`. Pending finals are bounded
and consumed with one `pop_front()` owner. Overlong/overloaded audio is dropped
fail-closed; safety bounds do not manufacture fixed chunk boundaries or partial
output. Generation loss clears/rejects producer state.

Actual microphone/VAD boundary quality and exactly-once race behavior remain local
proof.

## 5. Translation / TTS Correctness

Translation source input is tokenized with `truncation=False`; unknown or exceeded
model context limits are rejected before inference.

Generated output must have verifiable EOS completion. Non-EOS ceiling/termination or
an unverifiable completion contract is not product success.

TTS requires an explicit English-capable voice:

```text
Piper -> .onnx + matching metadata with English language code
SAPI  -> English VoiceInfo Culture + explicit SelectVoice
```

The implicit Windows default voice and arbitrary first Piper model are not accepted.
Actual model/voice execution and audio quality remain `LOCAL PROOF REQUIRED`.

## 6. Installation / Capability / Readiness

Static installation owner:

```text
model_manifest.json -> runtime_inventory.rs
```

Asset presence is installation evidence only. Current AI capability comes from
persistent worker `status`; one request outcome does not redefine provider health.

Normal product truth:

```text
Text    -> worker Quality capability
Meeting -> direct MeetingSessionStatus + MeetingSessionPreflight
```

`RuntimeStatusBundle` remains useful for Diagnostics but is not the normal Meeting
lifecycle owner. Legacy live/internal/professional/migration gates do not make normal
product Ready.

## 7. Canonical Python Project / Proof Baseline

`WorkerRuntime/pyproject.toml` is the sole Python dependency/tooling owner. Retired
parallel requirements/stack/CUDA setup owners remain absent. `uv.lock` is intentionally
not fabricated and awaits verified local resolution.

Ruff and pytest are configured but not executed through ChatGPT -> GitHub. The
persistent-worker smoke remains local proof and stores privacy-bounded metadata only.
`py-spy` remains an external local profiler for the actual persistent worker PID.

## 8. Remaining Core Work

```text
Meeting Pause/Resume generation lifecycle
full Meeting Live transcript/activity presentation
global/cross-view Meeting strip and close-live handling
incoming Meeting lane + self-output suppression
Meeting History after canonical committed lifecycle
translation tone/context consumption
Text Copy/direct Save
uv.lock generation + real dependency resolution
Ruff / pytest / TypeScript / Rust execution proof
non-preemptive active-Text contention measurement
actual model EOS/completion + translation quality
actual English TTS voice availability + synthesis/audio quality
model revision/checksum/source reproducibility
model quality + latency + RAM/VRAM profiling/benchmark
Windows microphone/VAD/route proof
packaging/clean-machine reconciliation
```

Do not add a second worker, finalizer, scheduler, readiness service, Meeting lifecycle
store, dependency manifest, lint stack, or test framework to solve these.

## 9. Other Product Boundaries

Windows audio remains outside AI ownership. Incoming Meeting Sound remains separate
from core outbound and is not implemented by current source.

Canonical History remains:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Documents remains retired. Audio Studio remains post-core. Svelte remains a separate
future frontend architecture decision after core runtime contracts stabilize.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Engine Consolidation Slices 1-5, finalized outbound utterance production, and normal
product Meeting Start/Stop/Live-state wiring are source-aligned at their bounded
claims. No compile/typecheck/validator execution/model/Windows runtime/rendered UI,
audio-quality, or performance proof has been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`.
