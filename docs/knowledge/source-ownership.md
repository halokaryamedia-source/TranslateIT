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
| Product shell/navigation | `src/main.ts`, First Setup, `SimpleLauncherController.ts` | **ALIGNED / VISUAL PARTIAL** | Normal app is Meeting / Text / History / Settings. |
| First Setup | First Setup + `RuntimeSettings` + product/audio facade | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Five-step flow, defer/resume, candidate-check -> commit. |
| Text AI execution | `text_translate.rs` -> helper scheduler -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent worker route; Text explicitly requests Quality. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **ALIGNED AUTHORITY / PRODUCT UI PARTIAL** | `session_id + generation + authority_active` is canonical. |
| Meeting capture | `audio/live_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | One CPAL capture owner; application Meeting capture also feeds the finalized producer while rolling audio remains separate. |
| Rolling audio / preview boundary | `audio/live_audio_buffer.rs` | **ALIGNED DIAGNOSTIC/PREVIEW OWNER** | ASR-ready rolling windows are not final speech and are not consumed by product Meeting output. |
| Finalized outbound utterance | `audio/finalized_utterance.rs` | **SOURCE ALIGNED / VAD PROOF LATER** | Audio-owned Realtime VAD state produces generation-scoped final utterances only after adaptive end silence; partial audio is not emitted. |
| Finalized WAV handoff | `audio/live_segment_writer.rs` | **SOURCE ALIGNED / FILESYSTEM PROOF LATER** | Each final utterance gets a unique temporary 16 kHz mono WAV; rolling `latest_live_target_segment.wav` is diagnostic-only. |
| Serialized Meeting outbound consumer | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | One consumer takes each final utterance once, runs canonical AI/output stages serially, then removes the temporary source WAV. |
| Meeting outbound AI mode | `meeting_session.rs` | **SOURCE ALIGNED / MODEL PROOF LATER** | Finalized outbound speech explicitly requests Realtime translation. |
| Helper scheduling / worker I/O | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **SOURCE ALIGNED / CONTENTION PROOF LATER** | One scheduler owns stdin/stdout; waiting Meeting > Text > Diagnostics. |
| Helper cancellation | helper bridge + Meeting generation authority | **SOURCE ALIGNED / TIMING PROOF LATER** | Stale Meeting work is rejected; matching in-flight Meeting work may hard-cancel the worker process. |
| Translation source bounds | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent tokenizer truncation; unknown/oversized model-token input is rejected. |
| Translation output completeness | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL EXECUTION PROOF LATER** | Generated translation is promoted only when EOS completion is verifiable. |
| English TTS voice selection | `realtime_local_worker.py` | **SOURCE ALIGNED / WINDOWS + ASSET PROOF LATER** | Piper requires English metadata; SAPI requires English culture and explicit `SelectVoice`. |
| Meeting outbound audio route | virtual-route owners | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware route cancellation exists; actual meeting-app delivery is unproved. |
| Model installation evidence | `model_manifest.json`, `runtime_inventory.rs` | **ALIGNED STATIC OWNER / METADATA PARTIAL** | Asset presence only, not model-load/inference proof. |
| Current AI capability availability | persistent worker `status` -> helper bridge | **SOURCE ALIGNED / LOAD-INFERENCE PROOF LATER** | ASR / Realtime translation / Quality translation / explicit-English TTS are scoped capabilities. |
| Product readiness | `runtimeProductFacade.ts` + `MeetingSessionPreflight` | **SOURCE ALIGNED / FRONTEND ACTION PARTIAL** | Text uses Quality capability; Meeting uses canonical preflight. Normal frontend still does not own canonical Meeting Start/Stop commands. |
| Python dependency/tooling ownership | `WorkerRuntime/pyproject.toml` | **SOURCE ALIGNED / LOCK + EXECUTION PROOF LATER** | One project owns runtime deps, optional route extra, Ruff, pytest; `uv.lock` is intentionally not fabricated. |
| Python deterministic proof | `WorkerRuntime/tests/test_worker_contract.py` + pytest config | **SOURCE ALIGNED / NOT EXECUTED** | Deterministic mode/bounds/EOS/voice/protocol tests exist; model/device quality is outside this proof. |
| Python source quality policy | Ruff config in `pyproject.toml` | **SOURCE ALIGNED / NOT EXECUTED** | Ruff is the single Python lint/format policy. |
| Persistent worker smoke | `run_realtime_worker_smoke.ps1` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One worker process is reused; evidence excludes conversation bodies/file paths. |
| History / Saved | `history_store.rs`, `history.rs`, frontend History | **TEXT ALIGNED / MEETING PARTIAL** | Canonical store is `UserData/SavedProject/History/{Recent,Saved}`. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Loopback -> EN ASR -> ID text and self-output suppression are not implemented. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Packaging/runtime assets | Tauri/NSIS + bridge Python discovery | **PARTIAL / STALE ASSUMPTIONS** | End-user packaged Python/runtime acquisition is unresolved; `uv` is not an end-user requirement. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve post-core; not current core blocker. |

## 1. Canonical Outbound Flow

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

Meeting outbound source path is now connected as:

```text
physical microphone
-> one CPAL live capture owner
   ├─ rolling buffer (preview/diagnostics only)
   └─ finalized_utterance.rs
      -> adaptive speech-end boundary
      -> FinalizedOutboundUtterance
         { session_id, generation, utterance_id }
      -> exactly-once queue take
      -> unique temporary PCM16 WAV
      -> process_authoritative_finalized_outbound_wav
         -> ASR
         -> generation check
         -> Realtime translation + verified completion
         -> generation check
         -> explicit English TTS
         -> generation check
         -> TranslateIT Meeting Microphone route
      -> temporary finalized source WAV removed
```

The audio finalizer never calls ASR/translation/TTS itself. AI orchestration remains
owned by Meeting/helper runtime.

## 2. Finalized Speech Boundary

`audio/finalized_utterance.rs` is the canonical audio-side finalization owner.

Current source contract:

- it activates only for the application Meeting capture owner;
- it uses the existing `Realtime` runtime VAD profile rather than introducing a
  second fixed-chunk policy;
- non-speech immediately before speech is bounded as pre-roll;
- speech-like callbacks extend one in-progress utterance;
- trailing non-speech accumulates until adaptive end silence is satisfied;
- end silence is based on the current VAD profile and current boundary energy rather
  than a polling timer that treats every rolling window as final;
- minimum confirmed speech is required before finalization;
- the speech portion is VAD-checked again before promotion;
- a generation that loses authority clears producer state rather than emitting;
- each successfully queued final gets the next utterance id exactly once;
- consumer ownership is `VecDeque::pop_front()`, so one queued final cannot be read
  repeatedly like a snapshot;
- queue/long-utterance limits are internal fail-closed safety bounds, not product
  speech-boundary promises or forced chunking rules.

Local microphone/VAD behavior is still required before these tuning mechanics can be
called production-ready.

## 3. Rolling Audio Is Not Product Output

`live_audio_buffer.rs` remains useful for rolling preview/diagnostic state and legacy
ASR-ready snapshots. Its `ready_for_target_asr_frame` flag is not a final utterance
signal.

`write_latest_live_target_segment_wav()` remains diagnostic-only. Product Meeting
code does not call it. Finalized output uses
`write_finalized_outbound_utterance_wav()` with a unique identity-bearing filename.

Raw finalized WAV files are temporary cache artifacts and are removed by the
serialized consumer after the AI/output attempt.

## 4. Generation / Exactly-Once / Stop Safety

The finalized producer stores the current Meeting generation and checks canonical
`runtime_generation_is_authoritative()` while ingesting and while taking queue work.

Meeting outbound has one consumer thread for the active generation. It processes one
finalized item at a time; there is no second polling/AI loop.

Stop order remains authority-first:

```text
revoke Meeting generation
-> signal Meeting route cancellation
-> stop capture + clear rolling/finalized audio
-> cancel matching in-flight helper work
-> join serialized outbound consumer
-> clear handoff/session state
```

This ordering prevents stale finalized work from being promoted after Stop is
accepted while allowing a consumer blocked inside helper inference to be released by
helper cancellation before the lifecycle waits for its thread to join.

Pause/Resume product commands are not implemented yet. The finalizer's generation
invalidation contract is ready for a future Pause/Resume owner, but that future UI/
lifecycle behavior is not claimed by this source slice.

## 5. Caller-Owned Modes / Scheduler / AI Correctness

Mode authority remains:

```text
Meeting outbound -> Realtime
Standalone Text  -> Quality
```

One helper scheduler remains canonical. Waiting order is:

```text
Meeting > Text > Diagnostics / preload
```

This is queue priority, not preemption: a Text inference already running is not
interrupted by a later Meeting request. Local contention measurement remains needed.

Translation input rejects unverifiable/oversized token windows instead of silently
truncating. Translation output is promoted only when EOS completion is verifiable.
TTS must identify an English-capable Piper/SAPI voice explicitly before synthesis.
Actual inference/voice quality remains local proof.

## 6. Python Project / Proof Baseline

Canonical Python dependency/tooling owner remains:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml
```

Retired duplicate/side-channel owners remain absent:

```text
requirements-realtime.txt
requirements-virtual-audio-route.txt
realtime_stack_manifest.json
setup_pytorch_cuda.ps1
setup_ctranslate2_translation_model.py
```

`uv.lock` is not present by design yet. Ruff and pytest are configured but not run in
this channel. `py-spy` is a later local operator profiler, not a runtime dependency.

The static `validate_translation_flow_integrity.mjs` now also guards that Meeting
consumes the finalized producer and does not call the rolling diagnostic WAV writer.
This is source-contract proof only.

## 7. Remaining Source Work

Source-side gaps still include:

```text
normal frontend bridge methods for get/start/stop Meeting session
normal Start Translation action wiring
Meeting Live rendering + app-level/global cross-view Meeting state
Pause/Resume lifecycle and pending-output semantics
translation tone/context consumption
incoming Meeting Sound lane + self-output suppression
Meeting History after committed Meeting turns
Text Copy/direct Save
Windows microphone-permission deep-link
packaging/runtime asset reconciliation
model source revision/checksum metadata
```

Deferred local proof includes:

```text
uv.lock + dependency resolution
Ruff / pytest / Rust / TypeScript execution
real microphone capture and VAD boundary behavior
exactly-once runtime behavior under speech/backlog/Stop races
actual Marian/NLLB EOS behavior and quality
English Piper/SAPI availability + synthesis/audio quality
scheduler contention/latency/RAM/VRAM/CUDA/CPU behavior
Meeting Microphone delivery to a real meeting application
clean installed operation
```

Do not solve these by adding another capture pipeline, finalizer, worker, scheduler,
readiness store, dependency owner, or generic framework.

## 8. Other Product Boundaries

Windows audio remains outside AI ownership. Incoming Meeting Sound is a separate
future lane and must not be folded into the outbound finalizer.

Canonical History remains:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Documents remains retired. Audio Studio remains post-core. Svelte remains a separate
frontend architecture decision after the current product runtime contracts stabilize.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Engine Consolidation Slices 1-5 plus the finalized outbound utterance source slice are
source-aligned at their bounded claims. No compile/typecheck/uv-resolution/Ruff/
pytest/model/Windows runtime/VAD/audio-quality/performance proof has been obtained in
this channel.

The single continuation is `docs/knowledge/next-action.md`.
