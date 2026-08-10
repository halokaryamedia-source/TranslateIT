# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slices 1-3 are source-aligned. The product now has one persistent AI worker path, scoped capability/readiness truth, caller-owned Meeting/Text modes, and one helper scheduler/cancellation authority.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> bounded Slice 4 WorkerRuntime dependency/tooling owners + direct setup/package consumers only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Static source establishes ownership and
wiring only. Rust compilation, TypeScript typecheck, Python execution, model load/
quality, scheduler contention, cancellation timing, CPU/CUDA behavior, Windows audio,
and installed operation remain `LOCAL PROOF REQUIRED`.

## Locked Engine Target

```text
Rust/Tauri product runtime
        |
        v
ONE existing helper scheduler / process bridge
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
readiness owners, automatic cross-mode fallback, or another scheduler.

Svelte remains a separate later frontend architecture decision after Engine
contracts stabilize.

# Slice 1 — Closed

- standalone Text uses one persistent helper/base-worker execution path;
- manual Rust translation and alternate Python worker owners are retired;
- deterministic/dictionary/preview translation cannot report model success;
- legacy capture no longer launches one-shot ASR -> Translate -> TTS or automatic
  Realtime <-> Quality fallback.

# Slice 2 — Closed

- model inventory is installation evidence, not runtime `PASS`;
- stale `MODEL_RUNTIME_MANIFEST.json` is removed;
- worker capability state is scoped instead of one request redefining whole-provider
  health;
- normal Text readiness is based on current worker translation capability;
- normal Meeting readiness is based on canonical `MeetingSessionPreflight`;
- legacy live/internal/professional/migration gates do not make normal product Ready.

# Slice 3 — Closed Source Boundary

## A. Caller-owned modes

```text
Meeting outbound -> explicit Realtime
Standalone Text  -> explicit Quality
```

`commands/text_translate.rs` sends `Quality` directly and accepts successful output
only when the worker response reports Quality.

`commands/meeting_session.rs` already sends `Realtime` directly.

`RuntimeSettings.runtime_profile` remains only a compatibility field. Product-facing
settings load/save normalizes it to Quality so inherited Text labels and Text History
metadata do not claim Realtime. It is no longer engine mode authority for Meeting.

No requested translation mode retries the other mode merely to get output.

## B. One helper scheduler / stdin-stdout authority

The existing helper bridge now contains the only scheduler. No new worker/service was
created.

Queue order:

```text
Meeting
  > Text
    > Diagnostics / preload
```

Each admitted request has a unique helper request id. Meeting work additionally
carries the existing application `meeting_generation`.

The helper runtime mutex is no longer held for the entire blocking worker inference/
read. Worker stdin/stdout are loaned to the admitted request, while the child process
remains cancellable from lifecycle code. A helper generation token prevents a result
from an old/killed process from restoring stale handles/state.

Important limitation: this is **queue priority, not preemption**. A Meeting request
that arrives after a Text inference has already started waits for that current Text
request to finish. This must be measured before Meeting Live is enabled; do not call
the scheduler realtime-optimal yet.

## C. Stale work + truthful hard cancellation

Meeting work is checked against application generation authority before worker
execution and again before result promotion.

During Meeting Stop:

```text
revoke application generation first
-> cancel Meeting route
-> stop capture
-> helper cancellation sees revoked Meeting generation
   -> matching in-flight Meeting task: kill persistent worker process
   -> unrelated Text task: preserve it
   -> queued revoked Meeting work: reject before execution
-> clear session
```

Generic Developer Diagnostics cancellation may still hard-kill an active helper task
outside the Meeting Stop context.

Actual process-interruption timing remains local proof.

## D. Truthful translation input bounds

Canonical worker now requires explicit `Realtime` or `Quality` and rejects unknown
mode.

Translation source handling is:

```text
character bound
-> tokenize with truncation=False
-> read tokenizer/model context limit
-> count tokens
-> unknown count/limit: reject
-> over model limit: reject before inference
-> otherwise infer
```

The previous `truncation=True, max_length=256` success path is removed.

## E. Static guard only

`validate_translation_flow_integrity.mjs` now checks the bounded source contracts for:

- Text Quality ownership;
- Meeting Realtime ownership;
- one helper scheduler/request identity;
- Meeting generation checks;
- absence of retired alternate translation owners;
- absence of `truncation=True` / cross-mode fallback markers;
- explicit oversized-token rejection.

This validator is **static source-contract proof only**. It is not scheduler timing,
model correctness, cancellation, or performance proof.

# Proof State

**CURRENT-PROJECT VERIFIED** at static-source level:

1. Text and Meeting own Quality/Realtime independently.
2. Worker I/O has one helper scheduler owner.
3. Waiting Meeting requests outrank waiting Text requests.
4. Helper general state lock is released during blocking worker inference/read.
5. Meeting generation is checked before execution and result promotion.
6. Meeting Stop helper cancellation is generation-scoped and does not intentionally
   kill unrelated Text work.
7. Canonical translation input is never silently tokenizer-truncated.
8. The canonical worker no longer reads the deleted stale runtime manifest.

No build/typecheck/Python/model/runtime command was executed through this channel.

# Known Gaps Kept Truthful

Do not hide these when continuing:

- queue priority is currently non-preemptive for a Text request already in flight;
- generation output still uses bounded `max_new_tokens`; source does not yet prove a
  non-EOS result hitting that ceiling is rejected as incomplete;
- worker capability `status` is current dependency/asset/process availability plus
  loaded-cache state, not model-quality proof;
- Meeting transactional Start remains fail-closed because finalized utterance source
  and continuous outbound runtime are still disconnected;
- TTS provider/voice selection is not yet guaranteed to select an explicit English
  voice;
- Python dependency/runtime acquisition is not reproducible enough yet;
- `requirements-realtime.txt` and `realtime_stack_manifest.json` remain inherited
  sources that need ownership cleanup;
- model revision/checksum/source metadata is incomplete;
- local model quality/latency/memory/VRAM proof has not started.

# Hold

- do not add a second worker, scheduler, readiness store, or process farm;
- do not introduce PyO3/maturin for cancellation/performance without profiling proof;
- do not replace ASR/translation/TTS models to hide dependency/runtime problems;
- do not describe queue priority as measured realtime scheduling;
- do not describe source-token acceptance as proof that generated output is complete;
- do not start Finalized Utterance Producer, incoming Meeting Sound, Svelte migration,
  or local Windows acceptance yet.

## Next Step

Start **Engine Consolidation Slice 4 — canonical Python project + executable proof
baseline**.

Bounded target:

```text
WorkerRuntime dependency declarations
-> ONE canonical Python project owner (`pyproject.toml`)
-> remove `requirements-realtime.txt` as independent dependency authority
-> classify/merge `realtime_stack_manifest.json` so it cannot act as execution proof
-> Ruff as the single Python lint/format policy
-> pytest for deterministic worker/protocol correctness
-> py-spy documented as local profiler for the actual persistent worker
```

Before adding versions/dependencies, inspect only current WorkerRuntime requirements,
setup scripts, actual imports, and packaging consumers. Do not invent dependency pins
or a lockfile that was not actually resolved. If `uv.lock` cannot be generated and
verified through the current GitHub channel, record it as a later local/tooling proof
artifact rather than fabricating one.

Keep model replacement, model-quality benchmarking, Finalized Utterance Producer,
incoming Meeting Sound, and Svelte outside Slice 4.
