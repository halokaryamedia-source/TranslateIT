# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: product feature expansion remains paused while the Translate Engine is consolidated; skill governance has been reconciled back to the frozen six-skill baseline so anti-slop/research/tooling capability does not create parallel owners.

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
**deferred**, not cancelled. Do not resume that implementation until the Engine
Consolidation Plan is approved and the canonical runtime path is unambiguous.

Execution channel remains:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance is still deferred. Static source can establish ownership,
conflicts, and wiring; model quality, latency, CUDA/CPU behavior, cancellation,
audio delivery, and installed behavior remain `LOCAL PROOF REQUIRED`.

## Engine Audit Result

The current Translate Engine must **not** be described as optimized or production
ready yet. The audit found root problems that predate the stricter governance.

### P0

- multiple active execution owners: persistent helper, accelerated one-shot worker,
  legacy/manual translation paths, legacy capture worker, and developer handoff
  scaffolds;
- fake/inflated success remains reachable through rule-based/preview translation or
  contract/dev payload paths without validated model inference;
- readiness truth is spread across model inventory, stale/runtime manifests, helper
  status, runtime/readiness bundles, legacy gates, product readiness, and newer
  Meeting preflight;
- persistent worker scheduling/cancellation is not yet realtime-safe and there is no
  proved Meeting-over-Text scheduler.

### P1

- declared Realtime/Quality stack differs from the execution path that may actually
  run;
- Text still shares the global runtime profile instead of owning its Quality default;
- Python/model/runtime dependency lifecycle is not reproducible enough for a clean
  installed runtime;
- current source validators/smokes prove narrower source/command contracts than many
  runtime-quality claims would require.

## Hold

Until the consolidation plan is approved:

- do not implement the finalized utterance producer on top of overlapping engine
  paths;
- do not add another worker, fallback, readiness gate, model manifest, runtime
  service, or compatibility owner;
- do not promote rule-based/preview/dev-seed output into product translation;
- do not call source presence, marker validation, stale manifest state, or dry-run
  contract success `Ready`;
- do not replace Python with Rust merely for language purity;
- do not adopt a new model/provider before a bounded evaluation proves why the
  current candidate is insufficient;
- do not start the local Windows acceptance phase yet.

## Skill Governance — Reconciled

The repository again has **exactly the frozen canonical baseline**:

```text
development-brief
desktop-runtime-development
desktop-ui-design-development
local-ai-runtime-development
windows-audio-runtime-development
release-packaging-development
```

The temporary support-skill experiments were intentionally merged/retired instead
of becoming permanent owners:

```text
i-have-adhd
-> useful action/progress communication rules merged into development-brief / root communication discipline

no-ai-slop
-> engineering anti-slop checks merged into the always-on AGENTS + development-brief quality gate

awesome-rust-research
-> Rust ecosystem discovery converted to a conditional research procedure in activation-matrix / local-ai tooling rules
```

Do **not** recreate these as separate skills merely because the external repositories
remain useful references. `docs/knowledge/skills/skill-map.md` is the canonical
inventory and `activation-matrix.md` is the routing owner.

Anti-slop is intentionally always-on rather than an optional reviewer. The
`development-brief` now explicitly gates duplicate ownership, fake success,
fallback masking, unjustified persistent additions, and evidence inflation before
Developing edits proceed.

## Python / Rust Tooling Governance

Python/Rust development tools are **tools, not skills or product owners**.
`local-ai-runtime-development` now owns their bounded adoption gate.

Current candidates:

```text
uv
-> candidate for reproducible Python environment/dependency locking

Ruff
-> candidate for one consolidated Python lint/format path

pytest
-> candidate for executable Python correctness tests

pytest-benchmark
-> candidate for measured stage-level regression after correctness is established

py-spy
-> preferred first profiler for the actual persistent Python worker

Scalene
-> deeper CPU/native/GPU/memory profiling only when simpler profiling is insufficient

ty / another type checker
-> defer until the canonical worker boundary is stable and typing solves a real contract risk

PyO3 / maturin
-> DEFER; only reconsider when profiling proves Rust/Python process or IPC overhead is a material bottleneck and FFI reduces net complexity
```

No tool above is adopted merely because it is popular, Rust-written, or modern.
Each requires a current problem, canonical owner, direct acceptance/proof value,
primary-source verification, proportional maintenance cost, and no duplicate tool
already serving the same job.

Packaging implications remain owned by `release-packaging-development`; a dev tool
or `uv` lockfile must never become a manual end-user runtime requirement.

## Proof State

**CURRENT-PROJECT VERIFIED** at static-source/governance level:

- multiple translation/voice execution paths and overlapping readiness owners exist;
- fake/non-model translation success remains present in inherited source;
- the engine therefore requires consolidation before further feature expansion;
- the three temporary support skill files are no longer part of the repository skill
  architecture;
- useful communication/anti-slop/research rules were merged into existing canonical
  owners instead of creating new semantic specialists;
- `local-ai-runtime-development` now contains the conditional Python/Rust tooling
  adoption rules;
- the frozen six-skill semantic baseline is restored.

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
fallback. It must also decide which of `uv`, Ruff, pytest/pytest-benchmark, and
py-spy are actually worth adopting and define the smallest benchmark/proof matrix
needed to judge ASR/translation/TTS quality and performance. Only after that plan is
approved should Developing resume, beginning with engine consolidation rather than
the finalized-utterance feature.
