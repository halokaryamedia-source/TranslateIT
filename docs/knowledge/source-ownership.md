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
scheduling-performance, CUDA/CPU, Windows-device/audio, rendered-UI,
installed-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, First Setup, `SimpleLauncherController.ts` | **ALIGNED / VISUAL PARTIAL** | Normal app is Meeting / Text / History / Settings. |
| First Setup | First Setup + `RuntimeSettings` + product/audio facade | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Five-step flow, defer/resume, candidate-check -> commit. |
| Text AI execution | `text_translate.rs` -> helper scheduler -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent worker route; Text explicitly requests Quality. |
| Meeting outbound AI mode | `meeting_session.rs` | **SOURCE ALIGNED / FINALIZED AUDIO MISSING** | Generation-aware outbound translation explicitly requests Realtime. |
| Helper scheduling / worker I/O | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **SOURCE ALIGNED / CONTENTION PROOF LATER** | One scheduler owns stdin/stdout; waiting Meeting > Text > Diagnostics. |
| Helper cancellation | helper bridge + Meeting generation authority | **SOURCE ALIGNED / TIMING PROOF LATER** | Stale Meeting work rejected; matching in-flight Meeting task may hard-cancel the worker process. |
| Translation source bounds | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent tokenizer truncation; unknown/oversized model-token input is rejected. |
| Translation output completeness | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL EXECUTION PROOF LATER** | Generated translation is promoted only when EOS completion is verifiable; non-EOS ceiling/termination is blocked. |
| English TTS voice selection | `realtime_local_worker.py` | **SOURCE ALIGNED / WINDOWS + ASSET PROOF LATER** | Piper requires English metadata; SAPI requires English culture and explicit `SelectVoice`. Arbitrary first/default voice is not accepted. |
| Model installation evidence | `model_manifest.json`, `runtime_inventory.rs` | **ALIGNED STATIC OWNER / METADATA PARTIAL** | Asset presence only, not model-load/inference proof. |
| Current AI capability availability | persistent worker `status` -> helper bridge | **SOURCE ALIGNED / LOAD-INFERENCE PROOF LATER** | ASR / Realtime translation / Quality translation / explicit-English TTS capability states are scoped. |
| Product readiness | `runtimeProductFacade.ts` + `MeetingSessionPreflight` | **SOURCE ALIGNED / LOCAL PROOF LATER** | Text uses Quality capability; Meeting uses canonical preflight. |
| Python dependency/tooling ownership | `WorkerRuntime/pyproject.toml` | **SOURCE ALIGNED / LOCK + EXECUTION PROOF LATER** | One Python project owns runtime deps, optional route extra, Ruff, and pytest. `uv.lock` is intentionally not fabricated. |
| Python deterministic proof | `WorkerRuntime/tests/test_worker_contract.py` + pytest config | **SOURCE ALIGNED / NOT EXECUTED** | Deterministic mode/bounds/EOS/voice/protocol test definitions exist; model/device quality is outside this proof. |
| Python source quality policy | Ruff config in `pyproject.toml` | **SOURCE ALIGNED / NOT EXECUTED** | Ruff is the single Python lint/format policy. |
| Local Python profiling | `py-spy` procedure in WorkerRuntime README | **DOCUMENTED / LOCAL ONLY** | Profile the actual persistent worker PID; py-spy is not a product dependency. |
| Persistent worker smoke | `run_realtime_worker_smoke.ps1` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One worker process is reused; evidence stores bounded stage/completion/voice metadata without conversation bodies/file paths. |
| Meeting application session | `runtime_state.rs`, `meeting_session.rs` | **ALIGNED AUTHORITY / OUTBOUND PARTIAL** | `session_id + generation + authority_active` is canonical. |
| History / Saved | `history_store.rs`, `history.rs`, frontend History | **TEXT ALIGNED / MEETING PARTIAL** | Canonical store is `UserData/SavedProject/History/{Recent,Saved}`. |
| Meeting outbound audio route | virtual-route owners | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware route cancellation exists; delivery unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Loopback -> EN ASR -> ID text and self-output suppression are not implemented. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Packaging/runtime assets | Tauri/NSIS + bridge Python discovery | **PARTIAL / STALE ASSUMPTIONS** | End-user packaged Python/runtime acquisition is unresolved; `uv` is not an end-user requirement. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve post-core; not current core blocker. |

## 1. Canonical AI Execution

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

Meeting outbound once finalized speech exists:

```text
finalized Indonesian audio
-> session_id + generation + utterance_id
-> helper scheduler [Meeting]
-> ASR
-> generation check
-> translation [Realtime + verified completion]
-> generation check
-> explicit English TTS voice
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
legacy capture-owned one-shot AI pipeline
silent Realtime <-> Quality retry
```

## 2. Caller-Owned Modes / Scheduler / Cancellation

Mode authority:

```text
Meeting outbound -> Realtime
Standalone Text  -> Quality
```

`RuntimeSettings.runtime_profile` is compatibility-only and no longer selects
Meeting mode.

One scheduler exists in the helper bridge. Each admitted request has a helper request
id; Meeting requests additionally carry canonical `meeting_generation`.

Queue order:

```text
Meeting
  > Text
    > Diagnostics / preload
```

The helper state mutex is released during blocking inference/read. A helper process
generation prevents killed/replaced worker handles from being restored by an old
response.

This is **queue priority, not preemption**. A Meeting request that arrives after Text
inference starts still waits for that active Text task. Local contention/latency proof
is required before calling the scheduler realtime-optimal.

Meeting Stop revokes application generation first. Matching in-flight Meeting
inference may then terminate the persistent worker; unrelated Text is not
intentionally killed. Actual process interruption timing remains local proof.

## 3. Translation Correctness Boundaries

### Source input

```text
character limit
-> tokenize with truncation=False
-> determine tokenizer/model input-token limit
-> verify token count
-> unknown/over limit => reject before inference
-> otherwise infer
```

Source text is not silently cut to fit a hardcoded tokenizer window.

### Generated output

Translation generation uses structured generation output and inspects the produced
sequence before decoding/promoting it.

```text
generate
-> generation sequences available?
-> EOS id available?
-> generated token count verifiable?
-> final token is EOS?
   yes -> decode/promote
   no  -> reject
          - at token ceiling: output_hit_token_ceiling_without_eos
          - before ceiling: output_ended_without_eos
```

A missing/unverifiable generation sequence or EOS contract is also blocked. This is
source correctness logic; actual Marian/NLLB EOS behavior remains model/runtime proof.

## 4. Explicit English TTS Contract

TTS availability is no longer equivalent to "some Piper ONNX" or "some Windows
voice".

Piper selection:

```text
piper.exe
+ <voice>.onnx
+ matching <voice>.onnx.json
+ metadata language code is English
-> candidate
```

A filename that merely looks English is insufficient without voice metadata. `en-US`
is preferred when multiple verified English candidates are available, then another
English locale deterministically.

Windows SAPI selection:

```text
installed voice Name + Culture
-> Culture is en / en-*
-> deterministic candidate (en-US preferred)
-> SpeechSynthesizer.SelectVoice(selected name)
-> synthesize
```

The implicit Windows default voice is not the outbound TTS contract. If no explicit
English-capable Piper/SAPI candidate can be identified, TTS is unavailable rather
than using an arbitrary voice.

Actual voice installation, synthesis success, English intelligibility, audio quality,
and Windows behavior remain `LOCAL PROOF REQUIRED`.

## 5. Installation / Capability / Product Readiness

Static install owner:

```text
model_manifest.json
-> runtime_inventory.rs
```

Asset presence is installation evidence only. The stale
`MODEL_RUNTIME_MANIFEST.json` remains removed.

Current runtime capability availability comes from persistent worker `status`.
Individual task success/failure does not redefine all-provider health. TTS capability
now requires the current worker to identify an explicit English voice candidate.

Normal readiness:

```text
Text    -> worker Quality capability
Meeting -> MeetingSessionPreflight
```

Legacy live/internal/professional/migration gates may remain diagnostic-only while a
real consumer exists. They do not make the normal product Ready.

## 6. Canonical Python Project / Executable Proof Baseline

Canonical dependency/tooling owner:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml
```

It owns base local-AI dependencies, optional `virtual-audio-route`, Ruff, and pytest.
Retired duplicate/side-channel owners remain absent:

```text
requirements-realtime.txt
requirements-virtual-audio-route.txt
realtime_stack_manifest.json
setup_pytorch_cuda.ps1
setup_ctranslate2_translation_model.py
```

`uv.lock` is not present by design yet. It must come from an actual verified local
resolution, not fabricated pins.

Deterministic test definitions now cover:

```text
unknown translation mode rejection
no Realtime -> Quality mode fallback
character overflow rejection
input-token limit helper
non-EOS token-ceiling rejection
verified-EOS completion acceptance
English SAPI candidate selection
Piper English metadata requirement
Piper filename-only rejection
newline-JSON unknown-command response
```

pytest and Ruff remain **configured but not executed** through ChatGPT -> GitHub.
Their source presence is not an executable PASS.

`run_realtime_worker_smoke.ps1` is a later local proof. It reuses one persistent
process and stores only bounded stage/completion/voice metadata such as
`complete`, `finished_with_eos`, token counts, `voice_id`, and `language_code`;
conversation bodies and runtime file paths are excluded from saved evidence.

`py-spy` remains a documented local profiler for the actual persistent worker PID,
not a runtime dependency.

## 7. Remaining Engine Work

Still unresolved or intentionally deferred:

```text
uv.lock generation + real dependency resolution
Ruff execution
pytest execution
non-preemptive active-Text contention measurement
actual model EOS/completion behavior
actual English TTS voice availability + synthesis/audio quality
model revision/checksum/source reproducibility
model quality + latency + RAM/VRAM profiling/benchmark
finalized outbound utterance producer
incoming Meeting lane
translation tone/context consumption
```

Do not add a second worker, scheduler, readiness service, dependency manifest, lint
stack, or test framework to solve these.

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

Engine Consolidation Slices 1-5 are source-aligned at their bounded claims. No
compile/typecheck/uv-resolution/Ruff/pytest/model/Windows runtime, audio-quality, or
performance proof has been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`, which returns to the
bounded finalized outbound utterance producer before Meeting Start/Live can be
enabled.
