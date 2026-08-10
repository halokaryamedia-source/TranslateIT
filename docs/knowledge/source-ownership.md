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
| Helper cancellation | helper bridge + Meeting generation authority | **SOURCE ALIGNED / TIMING PROOF LATER** | Stale Meeting work rejected; matching in-flight Meeting task hard-cancels the worker process. |
| Translation input bounds | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent tokenizer truncation; unknown/oversized model-token input is rejected. |
| Model installation evidence | `model_manifest.json`, `runtime_inventory.rs` | **ALIGNED STATIC OWNER / METADATA PARTIAL** | Asset presence only, not model-load/inference proof. |
| Current AI capability availability | persistent worker `status` -> helper bridge | **SOURCE ALIGNED / LOAD-INFERENCE PROOF LATER** | ASR / Realtime translation / Quality translation / TTS capability states are scoped. |
| Product readiness | `runtimeProductFacade.ts` + `MeetingSessionPreflight` | **SOURCE ALIGNED / LOCAL PROOF LATER** | Text uses Quality capability; Meeting uses canonical preflight. |
| Python dependency/tooling ownership | `WorkerRuntime/pyproject.toml` | **SOURCE ALIGNED / LOCK + EXECUTION PROOF LATER** | One Python project owns runtime deps, optional route extra, Ruff, and pytest. `uv.lock` is intentionally not fabricated. |
| Python deterministic proof | `WorkerRuntime/tests/test_worker_contract.py` + pytest config in `pyproject.toml` | **SOURCE ALIGNED / NOT EXECUTED** | Deterministic mode/bounds/protocol tests exist; model quality is outside this proof. |
| Python source quality policy | Ruff config in `pyproject.toml` | **SOURCE ALIGNED / NOT EXECUTED** | Ruff is the single Python lint/format policy; no parallel lint stack added. |
| Local Python profiling | `py-spy` procedure in WorkerRuntime README | **DOCUMENTED / LOCAL ONLY** | Profile the actual persistent worker PID; py-spy is not a product dependency. |
| Persistent worker smoke | `run_realtime_worker_smoke.ps1` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One worker process is reused across commands and evidence excludes conversation bodies/file paths. |
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
-> one result
```

Meeting outbound after finalized speech exists:

```text
finalized Indonesian audio
-> session_id + generation + utterance_id
-> helper scheduler [Meeting]
-> ASR
-> generation check
-> translation [Realtime]
-> generation check
-> TTS
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

One scheduler exists in the helper bridge. Each admitted request has a helper
request id; Meeting requests also carry canonical `meeting_generation`.

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

## 3. Truthful Translation Bounds

Worker input handling:

```text
character limit
-> tokenize with truncation=False
-> determine tokenizer/model input-token limit
-> verify token count
-> unknown/over limit => reject before inference
-> otherwise infer
```

Remaining correctness gap: generated output still uses bounded `max_new_tokens`.
Source does not yet prove that a non-EOS output hitting that ceiling is rejected as
incomplete.

## 4. Installation / Capability / Product Readiness

Static install owner:

```text
model_manifest.json
-> runtime_inventory.rs
```

Asset presence is installation evidence only. The stale
`MODEL_RUNTIME_MANIFEST.json` remains removed.

Current runtime capability availability comes from persistent worker `status`.
Individual task success/failure does not redefine all-provider health.

Normal readiness:

```text
Text    -> worker Quality capability
Meeting -> MeetingSessionPreflight
```

Legacy live/internal/professional/migration gates may remain diagnostic-only while a
real consumer exists. They do not make the normal product Ready.

## 5. Canonical Python Project / Tooling

Canonical dependency/tooling owner:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml
```

It owns:

```text
base local-AI runtime dependencies
optional virtual-audio-route extra
Ruff configuration
pytest dependency/configuration
```

The Python source itself requires Python 3.10+ syntax, so the project declares
`requires-python >=3.10`. Existing dependency constraints were transferred without
inventing resolved versions.

Retired duplicate/side-channel owners:

```text
requirements-realtime.txt
requirements-virtual-audio-route.txt
realtime_stack_manifest.json
setup_pytorch_cuda.ps1
setup_ctranslate2_translation_model.py
```

`realtime_stack_manifest.json` was removed rather than replaced by another manifest:
actual mode/model behavior belongs to code/current worker status, and numeric latency
targets require benchmark evidence.

`setup_realtime_worker.ps1` now uses `uv sync --no-dev`. It warns when `uv.lock` is
absent instead of pretending dependency resolution is reproducible.

`uv.lock` is **not present by design yet**. It must be generated by an actual local
resolution, reviewed, and then committed before locked dependency reproducibility can
be claimed.

Ruff and pytest are project development dependencies. No pytest-benchmark, Scalene,
type checker, PyO3, or maturin was added in this slice.

`py-spy` remains an external/local operator tool documented for profiling the actual
persistent worker PID; it is not a runtime/project dependency.

## 6. Executable Proof Baseline

Deterministic tests live at:

```text
WorkerRuntime/tests/test_worker_contract.py
```

They are intentionally limited to behavior that can be proved without models or
Windows devices, including:

```text
unknown translation mode rejection
no Realtime -> Quality fallback for unsupported direction
character overflow rejection before model load
model/tokenizer input-limit selection helper
newline-JSON unknown-command protocol response
```

Ruff/pytest are **not executed** in the current ChatGPT -> GitHub channel.
Their presence is source/tooling alignment, not executable PASS.

`run_realtime_worker_smoke.ps1` remains a later local runtime proof. It now uses one
persistent process for status/translation/TTS/optional ASR instead of spawning a new
worker per command. Saved evidence contains bounded stage summaries rather than
source/translated/transcript text or runtime file paths.

## 7. Remaining Engine Work

Still unresolved or intentionally deferred:

```text
uv.lock generation + real dependency resolution
Ruff execution
pytest execution
non-preemptive active-Text contention measurement
translation generated-output completion / EOS ceiling detection
explicit English TTS voice/provider selection
model revision/checksum/source reproducibility
model quality + latency + RAM/VRAM profiling/benchmark
finalized outbound utterance producer
incoming Meeting lane
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

Engine Consolidation Slices 1-4 are source-aligned at their bounded claims. No
compile/typecheck/uv-resolution/Ruff/pytest/model/Windows runtime or performance proof
has been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`.
