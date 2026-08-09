# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: product/source alignment work is paused before further Meeting runtime expansion because the Translate Engine audit found overlapping execution owners, optimistic readiness, and legacy/dev fallback paths that must be consolidated first.

This file is the single active continuation owner for TranslateIT.

## Resume

For a new session:

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> only the bounded engine owners needed by the consolidation decision
```

Do not reconstruct approved product decisions from chat history when canonical
repository owners already contain them.

## Current Mode

**Plan**.

The previous Developing continuation (`finalized outbound utterance producer`) is
**deferred**, not cancelled. Do not resume that implementation until the engine
consolidation plan is approved and the canonical runtime path is unambiguous.

Execution channel remains:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance is still deferred. Static source can establish ownership,
conflicts, and wiring; model quality, latency, CUDA/CPU behavior, cancellation,
audio delivery, and installed behavior remain `LOCAL PROOF REQUIRED`.

## Engine Audit Result

The current Translate Engine must **not** be described as optimized or production
ready yet. The audit found several root problems that predate the stricter project
governance.

### P0 — Multiple active execution owners

Translation/voice behavior is split across persistent helper execution, accelerated
one-shot workers, manual/legacy translation fallbacks, legacy capture workers, and
developer handoff/scaffold paths. Behavior can therefore depend on which path is
active rather than one canonical engine contract.

### P0 — Fake or inflated success remains reachable

Inherited rule-based/deterministic/preview translation can report completed output
without validated model inference. Developer seed/smoke/handoff paths can also
return contract success without runtime success. These paths must never become
product readiness or user-facing translation truth.

### P0 — Readiness has too many authorities

Model inventory, worker/runtime manifests, helper status, runtime-readiness bundles,
live/professional gates, product readiness, and the newer Meeting preflight overlap.
Some use stale/static file presence or previous-machine manifest state. One
capability needs one current truth owner.

### P0 — Persistent worker scheduling/cancellation is not realtime-safe

The helper runtime serializes blocking inference behind one global state lock.
Cancellation mainly invalidates state/generation after work boundaries and cannot be
assumed to stop expensive inference immediately. There is also no proved scheduler
that enforces Meeting work priority over standalone Text work.

### P1 — Declared Realtime/Quality stack differs from active execution

The repository contains standard PyTorch translation, an accelerated CTranslate2
translation worker, legacy one-shot workers, and manifests that describe different
primary/fallback model roles. Realtime/Quality settings and model claims do not yet
map cleanly to one execution path. Text also still shares the global runtime profile
instead of independently defaulting to Quality.

### P1 — Dependency/model/runtime reproducibility is incomplete

Python dependencies are not fully locked, worker discovery can fall back to system
Python, model revisions/checksums are not canonical, model setup is partly report/
manual tooling, and current paths still assume repository-root `EngineData/UserData`
layout. Clean installed runtime ownership remains unresolved.

### P1 — Existing validation overstates what it proves

Several source validators verify marker/string/wiring presence. Worker smoke tooling
does not necessarily exercise the active persistent helper path and ASR can be
optional. These checks are useful static evidence but must not be treated as model
quality, realtime latency, cancellation, Windows audio, or end-to-end runtime proof.

## Hold

Until the consolidation plan is approved:

- do not implement the finalized utterance producer on top of overlapping engine
  paths;
- do not add another worker, fallback, readiness gate, model manifest, or runtime
  service;
- do not promote rule-based/preview/dev-seed output into product translation;
- do not call source presence, marker validation, or stale manifest state `Ready`;
- do not replace Python with Rust merely for language purity;
- do not adopt a new model/provider before a bounded evaluation proves why the
  current candidate is insufficient;
- do not start the local Windows acceptance phase yet.

## User-Approved Support Skills

Three non-specialist support skills are now available under `.agents/skills/`:

```text
i-have-adhd
awesome-rust-research
no-ai-slop
```

They do not change the frozen semantic specialist baseline. `awesome-rust-research`
uses Awesome Rust only for candidate discovery; `no-ai-slop` is a review filter;
`i-have-adhd` shapes action/progress communication.

## Python / Rust Tooling Candidates — Not Yet Adopted

The audit identified a small set worth evaluating during consolidation rather than
adding tools blindly:

```text
uv
-> Python environment/dependency lock and reproducible execution candidate

Ruff
-> fast Python lint + format candidate

py-spy
-> low-overhead profiler for the persistent Python worker, including subprocess use

pytest + pytest-benchmark
-> correctness + repeatable stage-level performance regression candidate

Scalene
-> deeper Python/native/GPU/memory profiling when py-spy is insufficient

PyO3 / maturin
-> DEFER; consider only if profiling later proves the process/FFI boundary itself is
   a material bottleneck. Do not adopt merely because the application also uses Rust.
```

These are research candidates, not current dependencies or acceptance proof.

## Proof State

**CURRENT-PROJECT VERIFIED** at static-source audit level:

- multiple translation/voice execution paths exist;
- rule-based/preview fallback can produce non-model translation output;
- persistent and accelerated worker ownership is inconsistent;
- readiness/model truth is distributed across overlapping owners/manifests;
- helper execution is serialized through its current shared runtime owner;
- current source validators/smokes are narrower than runtime-quality claims;
- the three support skills are present and routed as non-specialist helpers.

**LOCAL PROOF REQUIRED** before any claim about actual model quality, realtime
latency, CPU/CUDA usability, memory/VRAM pressure, cancellation responsiveness,
Windows audio delivery, or clean installed operation.

## Next Step

Create the **Engine Consolidation Plan** before further product-runtime coding.
Classify every active Translate/AI execution path and readiness owner as exactly one
of:

```text
KEEP
REMOVE
MERGE
REPLACE
DEFER
```

The plan must converge on **one canonical persistent local AI runtime**, one
capability/readiness truth path, one model/dependency lifecycle, explicit
Meeting-over-Text scheduling/cancellation semantics, and no fake translation
fallback. It must also define the smallest benchmark/proof matrix needed to decide
whether the current ASR/translation/TTS model choices are actually acceptable.
Only after that plan is approved should Developing resume, beginning with engine
consolidation rather than the finalized-utterance feature.
