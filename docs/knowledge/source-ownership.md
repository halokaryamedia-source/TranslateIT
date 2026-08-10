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

Static source alignment never becomes model-quality, latency, scheduling-performance,
CUDA/CPU, Windows-device/audio, rendered-UI, installed-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `FirstSetupBootstrap.ts`, `SimpleLauncherController.ts`, active shell | **ALIGNED / VISUAL PARTIAL** | Normal app is Meeting / Text / History / Settings. |
| First Setup | `FirstSetupBootstrap.ts`, `RuntimeSettings`, `runtimeProductFacade.ts`, audio commands | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Five-step flow, defer/resume, and candidate-check -> commit device selection exist. |
| Text AI execution | `commands/text_translate.rs` -> helper bridge -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent worker route; Text explicitly requests Quality. No manual/rule/alternate-worker fallback. |
| Meeting outbound AI mode | `commands/meeting_session.rs` | **SOURCE ALIGNED / FINALIZED AUDIO MISSING** | Generation-aware outbound translation explicitly requests Realtime. |
| Helper scheduling / worker I/O | `commands/helper_bridge.rs`, `helper_bridge_runtime.rs` | **SOURCE ALIGNED / RUNTIME CONTENTION PROOF LATER** | One scheduler owns worker stdin/stdout. Waiting Meeting work outranks Text; Text outranks Diagnostics. Blocking inference no longer holds the general helper-state mutex. |
| Helper cancellation | helper bridge + Meeting generation authority | **SOURCE ALIGNED / RUNTIME TIMING PROOF LATER** | Revoked/stale Meeting work is rejected; matching in-flight Meeting work hard-cancels the worker process. Meeting Stop does not kill an unrelated standalone Text task. |
| Translation input bounds | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL-RUNTIME PROOF LATER** | No `truncation=True`; tokenizer/model token limit must be known and oversized input is rejected before inference. |
| Model installation evidence | `model_manifest.json`, `runtime_inventory.rs` | **ALIGNED STATIC OWNER / METADATA PARTIAL** | Installation/presence only; not model-load/inference proof. |
| Current AI capability availability | persistent worker `status` -> helper bridge | **SOURCE ALIGNED / LOAD-INFERENCE PROOF LATER** | Process/current dependency+asset capability states are scoped by ASR / Realtime translation / Quality translation / TTS. Individual task results do not redefine all-provider health. |
| Product readiness mapping | `runtimeProductFacade.ts` + `MeetingSessionPreflight` | **SOURCE ALIGNED / LOCAL PROOF LATER** | Text readiness uses Quality capability. Meeting readiness uses canonical Meeting preflight. Legacy readiness gates do not make normal product Ready. |
| Meeting application session | `engine/runtime_state.rs`, `commands/meeting_session.rs` | **ALIGNED AUTHORITY / OUTBOUND RUNTIME PARTIAL** | `session_id + generation + authority_active` is canonical. Start remains fail-closed while finalized speech source is disconnected. |
| History / Saved | `history_store.rs`, `commands/history.rs`, frontend History owners | **TEXT ALIGNED / MEETING PARTIAL** | Canonical store is `UserData/SavedProject/History/{Recent,Saved}`. |
| Meeting outbound audio route | `virtual_audio_route_runtime.rs`, virtual-route owners | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware route cancellation exists; real meeting-app delivery is unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Loopback -> EN ASR -> ID text and self-output suppression are not implemented. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Python dependency/runtime reproducibility | WorkerRuntime requirements/setup + bridge Python discovery | **PARTIAL / NEXT CONSOLIDATION BOUNDARY** | No canonical `pyproject.toml`/lock owner yet; repo/system Python fallback remains. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve post-core; not current core blocker. |
| Packaging/runtime assets | Tauri/NSIS direction + path/assets owners | **PARTIAL / STALE ASSUMPTIONS** | Repo/system-Python assumptions remain; clean install proof later. |

## 1. Canonical AI Execution

Standalone Text:

```text
Text UI
-> runtimeProductFacade
-> runtimeApi.translateText
-> commands/text_translate.rs
-> one helper scheduler
-> persistent realtime_local_worker.py `translate`
-> Quality result
```

Meeting outbound after a finalized utterance eventually exists:

```text
finalized Indonesian audio
-> Meeting `session_id + generation + utterance_id`
-> helper scheduler [Meeting]
-> transcribe
-> generation check
-> translate [Realtime]
-> generation check
-> synthesize
-> generation check
-> Meeting Microphone route
```

Retired from product execution:

```text
manual_translation.rs
manual_translation_accelerated.rs
realtime_local_worker_entry.py
realtime_local_worker_accelerated.py
rule/dictionary/preview translation success
legacy capture-owned ASR -> Translate -> TTS one-shot execution
silent Realtime <-> Quality retry
```

## 2. Caller-Owned Modes

Product mode authority is now caller-owned:

```text
Meeting outbound -> Realtime
Standalone Text  -> Quality
```

`commands/text_translate.rs` sends `Quality` directly and accepts successful product
output only when the worker response reports `mode=Quality`.

`commands/meeting_session.rs` already sends `Realtime` directly for outbound Meeting
translation.

`RuntimeSettings.runtime_profile` is now a compatibility field, not engine mode
authority. The settings command exposes/persists it as `Quality` so inherited Text UI
labels and Text History metadata remain truthful. Meeting code must not read it to
choose Meeting mode.

No requested mode may silently retry the other mode merely to obtain output. CPU
fallback remains a device fallback inside the requested mode.

## 3. One Helper Scheduler / I/O Authority

Canonical scheduler lives in the existing helper bridge/runtime owners; no scheduler
service or second worker was added.

Initial queue policy:

```text
Meeting
  > Text
    > Diagnostics / preload
```

Source contract:

- one task at a time owns persistent-worker stdin/stdout;
- each admitted task receives a unique helper request id;
- Meeting tasks carry the existing `meeting_generation` identity;
- waiting Meeting work is selected before waiting Text work;
- waiting Text work is selected before diagnostics work;
- the general helper runtime mutex is released before blocking model inference/read;
- worker process identity is protected by the helper generation token when handles
  are restored after inference;
- a cancelled/replaced worker cannot have an older response reattached as current
  runtime state.

Important bounded limitation: this scheduler is **queue-priority, not preemptive**.
If a standalone Text inference has already started, a newly queued Meeting request
waits for that current request to end. Local contention/latency proof is required
before enabling Meeting Live; do not call this realtime-optimal yet.

## 4. Generation-Safe Cancellation

Meeting work is checked against canonical application generation authority:

1. after scheduler admission and before writing to the worker;
2. again before a worker result is promoted.

A revoked queued generation returns stale without executing.

During Meeting Stop, application generation authority is revoked first. The inherited
helper-cancel command detects that revoked Meeting generation and scopes cancellation
to it:

- matching in-flight Meeting task -> terminate persistent worker process and advance
  helper generation;
- unrelated standalone Text/diagnostic task -> do not kill it as collateral;
- no matching in-flight task -> queued revoked Meeting work will be rejected before
  execution.

Outside a Meeting Stop context, Developer Diagnostics may still hard-cancel an active
helper task by terminating the persistent worker.

Actual Windows/process timing and blocked-read interruption remain `LOCAL PROOF
REQUIRED`.

## 5. Truthful Translation Input Bounds

Canonical worker translation now requires explicit `Realtime` or `Quality`.
Unknown/missing mode is rejected.

For source input:

```text
character limit check
-> tokenize with truncation=False
-> determine actual tokenizer/model input-token limit
-> count input tokens
-> unknown limit/count => reject
-> over limit => reject before inference
-> otherwise infer
```

The previous `truncation=True, max_length=256` path is removed. Oversized source text
cannot be silently cut while reporting success.

Remaining correctness gap: generation still uses a bounded `max_new_tokens`. The
source does not yet prove that a non-EOS result reaching that generation ceiling is
reported as incomplete rather than accepted as a complete translation. Keep this as
a bounded worker-correctness item; do not claim long-output completeness yet.

## 6. Installation, Capability, And Product Readiness

Static install owner:

```text
model_manifest.json
-> runtime_inventory.rs
```

Vocabulary describes `installed / missing_required / missing_optional / metadata
incomplete`; file presence is not runtime `PASS`.

The stale source-tree `MODEL_RUNTIME_MANIFEST.json` remains removed.

Current worker status reports scoped capability **availability** and loaded-cache
state separately. It must not be described as model-quality or inference verification.
The normal product facade uses:

```text
Text -> worker Quality capability availability
Meeting -> MeetingSessionPreflight
```

A real translation request remains the truth for that request's inference success.
Before Meeting Start is eventually enabled, transactional Start still needs required
runtime/preload behavior consistent with the approved lifecycle.

Legacy live/internal/professional/migration gates may remain in Diagnostics while a
real diagnostic consumer exists; they do not make normal Text/Meeting Ready.

## 7. Remaining Engine Work

Still unresolved or intentionally deferred:

```text
non-preemptive current-request contention under Meeting load
translation output-completion / max_new_tokens ceiling detection
canonical Python project/dependency lock
Ruff / pytest executable worker proof baseline
py-spy local profiling of the actual persistent worker
realtime_stack_manifest / requirements authority cleanup
model source revision/checksum reproducibility
explicit English TTS voice/provider selection
model quality + latency + memory/VRAM benchmark
finalized outbound utterance producer
incoming Meeting lane
```

Do not add a second worker/scheduler/readiness service to solve these.

## 8. Other Product Boundaries

Windows audio remains outside AI ownership. Physical microphone capture, VAD/final
utterance production, Meeting Sound loopback, and Meeting Microphone delivery stay
with the Windows audio/runtime boundary.

Canonical History remains:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Documents remains retired. Audio Studio remains post-core. Svelte remains a separate
future frontend architecture decision after Engine contracts stabilize.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Engine Consolidation Slices 1-3 are source-aligned at their bounded claims. No
compile/model/Windows runtime or scheduling-performance proof has been obtained in
this channel.

The single continuation is `docs/knowledge/next-action.md`.
