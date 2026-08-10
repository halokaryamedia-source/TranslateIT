# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slices 1-4 are source-aligned. One persistent AI worker, scoped readiness, caller-owned modes, one scheduler/cancellation authority, and one canonical Python project/tooling owner now remain.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> bounded Slice 5 translation-output + TTS-selection owners/direct callers only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Rust compilation, TypeScript typecheck,
Python dependency resolution, Ruff/pytest execution, model inference/quality,
scheduler timing, CPU/CUDA behavior, Windows audio, and installed operation remain
`LOCAL PROOF REQUIRED`.

## Locked Engine Target

```text
Rust/Tauri product runtime
        |
        v
ONE helper scheduler / process bridge
        |
        v
ONE persistent Python worker
        |
        +-- ASR
        +-- Translation
        +-- TTS
        |
        v
product result / Meeting route
```

Do not reintroduce alternate workers, manual/rule translation fallback, duplicate
readiness/dependency owners, automatic cross-mode fallback, or another scheduler.

Svelte remains a later independent frontend architecture decision after Engine
contracts stabilize.

# Slices 1-3 — Closed

Current bounded source truth already established:

- standalone Text has one persistent-helper/base-worker path;
- manual/alternate/fake translation paths are retired;
- static installation evidence is distinct from worker runtime capability;
- normal Text readiness uses current Quality capability;
- Meeting readiness uses canonical `MeetingSessionPreflight`;
- Text explicitly requests `Quality`; Meeting outbound explicitly requests `Realtime`;
- one helper scheduler owns stdin/stdout and waiting priority is Meeting > Text >
  Diagnostics;
- Meeting generation is checked before execution and before result promotion;
- matching in-flight revoked Meeting inference may hard-cancel the worker process;
- translation input uses `truncation=False` and rejects unverifiable/oversized model
  token input instead of silently truncating it.

Queue priority is still **non-preemptive** for a Text inference that already started.
That remains a later measurement/proof item.

# Slice 4 — Closed Source/Tooling Boundary

## A. One canonical Python project

Canonical WorkerRuntime dependency/tooling owner:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml
```

It owns:

```text
base local-AI runtime dependencies
optional `virtual-audio-route` dependency extra
Ruff configuration
pytest development dependency/configuration
```

Existing dependency constraints were transferred from inherited requirements without
inventing resolved pins.

`requires-python >=3.10` is source-grounded by syntax already used in the canonical
worker.

## B. Duplicate dependency/config authorities retired

Removed:

```text
requirements-realtime.txt
requirements-virtual-audio-route.txt
realtime_stack_manifest.json
setup_pytorch_cuda.ps1
setup_ctranslate2_translation_model.py
```

The stack manifest was not replaced with a new execution manifest. Current mode/model
behavior belongs to source/current worker status; latency numbers must come from
measurement rather than declarative JSON.

The side-channel CUDA installer was retired instead of allowing environment mutation
to become a second dependency authority. Platform-specific CUDA/package acquisition
must later be reconciled through the canonical Python project/lock + release boundary.

## C. uv without fabricated reproducibility

`setup_realtime_worker.ps1` now uses the canonical project through `uv` and warns when
`uv.lock` is absent.

`uv.lock` is intentionally **not committed yet** because dependency resolution was
not executed and verified through this GitHub-only channel. Do not claim locked
reproducibility until a real local resolution has generated and reviewed that file.

`uv` is developer/build tooling only. End users must not be required to install or
operate it.

## D. Ruff + pytest proof baseline

Ruff is the single Python lint/format policy. No Flake8/Black/isort-style parallel
stack was introduced.

Deterministic tests now live at:

```text
WorkerRuntime/tests/test_worker_contract.py
```

They cover only source/runtime behavior that can be deterministic without model or
Windows-device proof:

```text
unknown translation mode rejected
Realtime unsupported direction does not switch to Quality
character overflow rejected before model load
smallest trustworthy tokenizer/model input limit selected
newline-JSON unknown command rejected
```

Ruff and pytest are **configured but not executed** in the current channel.

## E. Persistent worker smoke + privacy

`run_realtime_worker_smoke.ps1` now:

- requires the canonical WorkerRuntime `.venv`;
- starts one Python worker process and reuses it across the smoke sequence;
- does not fall back to arbitrary system `python`/`py` environments;
- records stage summaries instead of conversation bodies;
- excludes source text, translated text, transcript text, and runtime file paths from
  saved evidence.

This smoke remains local proof later. Its source does not prove model/runtime success.

## F. Profiling boundary

`py-spy` is documented as the first-line local profiler for the **actual persistent
worker PID**. It is intentionally not a project/runtime dependency.

Do not add Scalene, pytest-benchmark, type-check migration, PyO3, or maturin unless a
future measured problem justifies them.

# Proof State

**CURRENT-PROJECT VERIFIED** at static source/tooling level:

1. `pyproject.toml` is the one WorkerRuntime Python dependency/tooling owner.
2. Separate requirements files and inherited realtime stack manifest are absent.
3. Side-channel PyTorch CUDA and retired CT2 translation setup scripts are absent.
4. Static WorkerRuntime diagnostics now check `pyproject.toml`, model inventory, and
   asset markers rather than the retired requirements/stack manifest.
5. Ruff and pytest have one bounded configuration location.
6. Deterministic worker/protocol tests exist without pretending to test model quality.
7. Worker smoke source uses one persistent process and privacy-bounded evidence.
8. `uv.lock` absence is reported honestly instead of fabricated.

No uv resolution, Ruff, pytest, smoke, build, model, or Windows runtime command was
executed through this channel.

# Known Gaps Kept Truthful

- `uv.lock` and actual dependency resolution are not yet verified;
- Python/Rust/frontend compile/test execution is deferred to the later local phase;
- active Text inference is still non-preemptive when Meeting work arrives;
- generated translation still uses bounded `max_new_tokens`; a non-EOS result hitting
  the ceiling is not yet explicitly rejected as incomplete;
- TTS provider/voice selection does not yet guarantee an explicit English voice;
- model revision/checksum/source acquisition metadata remains incomplete;
- model quality, latency, RAM, and VRAM evidence has not been measured;
- Meeting Start remains fail-closed because finalized utterance production is not
  connected;
- incoming Meeting Sound remains unimplemented.

# Hold

- do not create another Python project, requirements file, runtime manifest, lint
  stack, test framework, worker, scheduler, or readiness owner;
- do not fabricate `uv.lock` or resolved dependency versions;
- do not replace models to hide correctness/runtime gaps;
- do not introduce PyO3/maturin before profiling proves a real IPC problem;
- do not start Svelte migration or local Windows acceptance yet.

## Next Step

Start **Engine Consolidation Slice 5 — translation output completeness + explicit
English TTS selection** before enabling the finalized Meeting audio producer.

This is a bounded refinement based on concrete gaps found during Slices 3-4, not a
new architecture.

Target:

```text
Translation generation
-> determine whether generation completed normally
-> non-EOS / unverifiable result at max token ceiling => reject as incomplete
-> never deliver a possibly cut translation as successful output

TTS
-> identify an explicit English-capable provider/voice
-> verify selection contract before synthesis
-> do not use arbitrary first Piper model or implicit Windows default voice
```

Keep model replacement/quality benchmarking, scheduler preemption redesign,
dependency lock generation, Finalized Utterance Producer, incoming Meeting Sound,
Svelte, packaging, and Windows acceptance outside Slice 5.
