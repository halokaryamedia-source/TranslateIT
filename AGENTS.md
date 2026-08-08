# TranslateIT Workspace Agent Rules

This repository is the project memory for TranslateIT. Chat history and older
reports are useful context, but they are not automatic authority for current
product state.

`New` is the current working branch for recovering, reconciling, and continuing
TranslateIT from the `V1-Advance` baseline. Do not change the repository default
branch or delete/supersede older branches unless the user explicitly decides that
later.

## Current Bootstrap State

TranslateIT is an older project and some original product/development context is
no longer reliably remembered. Therefore the first responsibility of `New` is
**context recovery before broad development**.

During bootstrap:

- preserve the inherited `V1-Advance` source unless a grounded task requires a
  change;
- treat older documentation as recovery evidence until revalidated;
- do not resume an old TODO merely because it is documented;
- do not convert an old implementation choice into permanent policy without
  checking current source, current product intent, and relevant evidence;
- create new foundation, memory, and specialist skills only when their owner and
  purpose are clear.

## Mandatory Boot

For every new TranslateIT session on `New`:

1. read root `AGENTS.md`;
2. read root `CONTEXT.md` when it exists;
3. read `docs/knowledge/next-action.md` when it exists;
4. read only the relevant foundation/decision/ownership note when one exists;
5. inspect the affected current source and direct contracts/callers;
6. open legacy `DevelopingData` reports only when needed to recover history,
   intent, evidence, or a superseded decision.

Do not broad-scan the entire repository, all engineering reports, generated
output, dependencies, or old chats by default.

If `CONTEXT.md` or `next-action.md` does not yet exist during bootstrap, continue
from this file plus the smallest relevant current source/recovery evidence. Do
not invent their contents.

## Repository Continuity

The repository must eventually own these distinct responsibilities:

- `AGENTS.md` -> agent behavior, routing, anti-slop, proof baseline;
- `CONTEXT.md` -> compact verified stable facts and canonical terminology;
- `docs/knowledge/next-action.md` -> one active goal/state/blocker/next step;
- `docs/foundation/` -> durable product and system policy after recovery;
- `docs/knowledge/decisions/` or decision log -> durable choices and reasons;
- implementation/source maps -> current source ownership;
- reviews/audits -> evidence captured at a point in time;
- task board/roadmap -> future work, never the active-task authority;
- source + relevant proof -> actual runtime behavior.

One note should have one job. Prefer updating an existing canonical owner over
creating another layer.

## Context Recovery Rule

Before asking the user to reconstruct old project history:

1. inspect the current `New` source;
2. inspect the closest relevant inherited documentation/contract;
3. distinguish what is actually known from what was merely intended;
4. identify only the unresolved decisions that materially change current product
   direction;
5. ask the user only for those high-impact decisions, with a grounded default
   when evidence supports one;
6. capture the resolved decision in its canonical owner once that owner exists.

For recovered information, distinguish:

- **current verified fact** -> supported by current source/proof or current user
  decision;
- **recovery evidence** -> useful inherited documentation/history that still
  needs reconciliation;
- **historical** -> accurately describes an earlier state but is not current
  authority;
- **superseded** -> replaced by a newer explicit decision/source direction;
- **unknown** -> insufficient or conflicting evidence; do not guess.

Never rewrite uncertainty into confidence just to make the project look complete.

## Current Recovery Baseline

Until context recovery changes these through an explicit grounded decision, the
following inherited facts are strong recovery evidence:

- the current implementation baseline came from branch `V1-Advance`;
- the active product direction was one desktop engine, not parallel V2/V3/V4
  engines;
- the inherited user-facing desktop shell is Rust/Tauri;
- Python is an internal helper runtime rather than a second product shell;
- the inherited active app package is `EngineData/Frontend/RustApp`;
- inherited helper runtime work lives under
  `EngineData/Backend/LocalWorker/WorkerRuntime`;
- inherited runtime contracts live under `EngineData/Backend/RuntimeContracts`.

These statements describe the recovery baseline, not a promise that every old
product requirement, model/provider choice, UI flow, runtime claim, or release
plan remains approved today.

## Source Precedence

Use the smallest authority that actually owns the question.

1. **Current task intent** -> current user instruction.
2. **Agent behavior / working rules** -> root or nearest `AGENTS.md`.
3. **Actual runtime behavior** -> current `New` source + relevant live/static
   proof appropriate to the claim.
4. **Runtime/interface contract** -> current contract/source owner, when the
   contract still matches the implementation.
5. **Durable product/system policy** -> current `docs/foundation/` owner once
   established on `New`.
6. **Current continuation/decision/ownership state** -> current canonical
   `docs/knowledge/` owner once established.
7. **Inherited V1-Advance documentation** -> recovery evidence unless explicitly
   revalidated into a current owner.
8. **Older branches, PRs, prototypes, samples, screenshots, and old chats** ->
   history/context only unless a current decision adopts a bounded part.

Material conflicts are not resolved silently. Mark them `UNKNOWN` or
`LOCAL PROOF REQUIRED` as appropriate and reconcile the authority before making a
claim that depends on them.

## Mode Selection

Infer the smallest useful mode from intent:

- old/stale/uncertain product context -> **Context Recovery**;
- unclear problem, product idea, or architectural choice -> **Plan**;
- explicit create/change request -> **Developing**;
- bug, regression, cleanup, review, or behavior-preserving refactor ->
  **Maintenance**.

The user may explicitly override the mode. Do not turn Context Recovery or Plan
into implementation work without a resolved requirement.

## Prompt Assistance

The user's prompt defines the goal, not necessarily the full technical
specification.

Before asking for more detail:

- inspect discoverable repository facts;
- preserve decisions that are still authoritative;
- separate the requested outcome from any suggested implementation method;
- use established current patterns for low-impact ambiguity;
- ask only unresolved high-impact decisions that materially change the result.

The user should not need to provide framework internals, file locations, or
professional implementation terminology when the repository can answer those.

## Independent Judgment

The user owns the product goal. The agent is responsible for choosing a method
that protects correctness, scope, maintainability, and evidence quality.

Do not follow a proposed method merely because it was requested when current
evidence shows that it:

- conflicts with current product/system policy;
- repeats a disproven or superseded approach;
- creates a second competing engine or ownership path without a real need;
- adds disproportionate architecture, compatibility, fallback, or tooling;
- weakens product quality or downstream usability;
- depends on a runtime capability that is not actually supported.

When redirecting a method, state the concrete reason and recommend the smallest
supported path that still achieves the goal.

## Developing Front Door

A repository-specific `development-brief` skill will be the Developing front
door once `.agents/skills/development-brief/SKILL.md` is established on `New`.

Until then, apply the same contract directly before non-trivial implementation:

- real goal;
- suggested method, if any;
- current evidence/owner;
- expected output;
- in scope / out of scope;
- 2-5 provable acceptance criteria;
- execution channel;
- minimum useful proof;
- unresolved high-impact decisions.

`No change required` is a valid result.

Do not create specialist project skills before context/source ownership proves a
reusable semantic boundary. A technology appearing in the implementation is not
by itself a reason to create or load a specialist skill.

## Skill Budget

During bootstrap:

- use the root rules plus the smallest useful global/user capability;
- do not copy generic skills into the repository merely for availability;
- do not create `rust-expert`, `python-expert`, `tauri-expert`, `audio-expert`,
  `cuda-expert`, or similar skills merely because those technologies exist;
- create a TranslateIT specialist only after repeated/current work proves a
  distinct semantic owner and reusable procedure;
- avoid overlapping specialist stacks for one problem.

The project skill architecture is intentionally **not frozen yet**. It must be
derived from recovered TranslateIT ownership rather than copied from BuildIT.

## Root-Cause And Edit Gate

Before changing behavior, establish:

- what actually happens now;
- which current source/contract owns it;
- what requirement or failure is being addressed;
- why the proposed change addresses that owner/cause;
- what evidence can falsify the proposed fix.

If the cause or product contract is still unknown, do not patch around it. Stay
in Context Recovery/Plan or report `Perlu pemeriksaan` / `Terhenti` with the
missing evidence.

Before creating or moving files/modules:

- search existing owners first;
- reuse/extend an owner before creating another abstraction;
- create only what the current task requires;
- do not scaffold managers, services, adapters, fallbacks, configs, tests,
  caches, indexes, or documentation layers for hypothetical future needs;
- do not reorganize the whole repository as a side effect of a bounded task.

## Anti-AI-Slop Baseline

- Think before editing and identify the real boundary.
- Prefer the minimum complete solution.
- Every changed line/file must trace to the declared goal.
- Do not widen scope because adjacent issues are visible.
- Do not restart old TODOs automatically.
- Do not promote a sample, prototype, fixture, old report, or provider-specific
  workaround into generic policy without evidence.
- Do not add compatibility/fallback layers without a proved requirement.
- Do not create parallel engines, duplicate pipelines, or duplicate state owners
  to avoid understanding the existing one.
- Do not perform repeated cosmetic patch churn instead of fixing the owner.
- Stop repeating the same failed direction after two attempts without new
  evidence.
- `No change required` and `historical only` are valid conclusions.
- Never claim a build, test, runtime result, device result, latency result, model
  readiness, visual state, or installer result that was not actually obtained.

## Minimum Useful Proof

Validation is evidence, not ceremony. Use the cheapest check that can disprove
the likely failure and stop when the acceptance criteria have enough evidence.

- **Docs/routing/policy:** exact content/diff + correct canonical links/owners.
- **Bounded source change on GitHub:** changed source + directly affected
  callers/contracts; existing CI only when it materially tests the changed
  boundary.
- **Local compile/runtime change:** one targeted reproduction/check first;
  broader build/typecheck/test only when informative.
- **Audio/device/model/CUDA/TTS/virtual-mic behavior:** live target-environment
  evidence is required for a live success claim.
- **Packaging/installer/persistence:** actual package/install/save/reopen evidence
  is required when those claims matter.
- **Cross-module/public contract:** stronger boundary proof is required before
  claiming complete integration.

Do not create tests, CI, fixtures, benchmark suites, screenshots, reports, or
validation artifacts solely to look rigorous.

## Evidence Status

Use these labels only when a material claim needs qualification:

- **CURRENT-PROJECT VERIFIED** -> the exact claim has sufficient proof in the
  current TranslateIT target environment.
- **OFFICIALLY VERIFIED** -> authoritative upstream documentation/source supports
  the exact capability, but current TranslateIT integration is not yet proven.
- **LOCAL PROOF REQUIRED** -> source/design is plausible or implemented, but the
  live/local target proof required for the claim has not been obtained.
- **UNSUPPORTED** -> available evidence shows the method/capability should not be
  relied on for the current target.
- **UNKNOWN** -> evidence is insufficient or materially conflicting; do not
  guess.

A source path existing or compiling does not automatically become
`CURRENT-PROJECT VERIFIED` for microphone capture, CUDA/model loading, TTS,
virtual audio routing, latency, packaging, or other live behavior.

## Execution Channels

### ChatGPT -> GitHub

May inspect repository state, reason about architecture, edit source/docs, and
establish static contracts. It must not invent local shell, Windows device,
CUDA/model, Tauri runtime, microphone, virtual-audio, TTS, packaging, or latency
proof.

### Codex / Local Development Environment

Local shell/build/runtime/device capabilities may exist. Verify availability
before relying on them and run only the checks that materially test the changed
boundary.

The goal, scope, acceptance criteria, and evidence standard do not change between
channels; only available proof changes.

## Documentation Recovery And Maintenance

Do not mass-rewrite inherited engineering reports to make them look current.

For each inherited document, eventually classify it as one of:

- `KEEP` -> still current and has a correct owner;
- `MERGE` -> useful content belongs in another canonical owner;
- `MOVE` -> useful but currently stored under the wrong responsibility;
- `HISTORICAL` -> preserve as evidence/provenance, not current authority;
- `SUPERSEDED` -> explicitly replaced by a newer decision/source;
- `DROP` -> no distinct useful value after recovery.

Classification is not automatic deletion. Preserve evidence until the new owner
is established and the historical value is understood.

## Branch Rules

- `New` -> current working branch for context recovery and future TranslateIT
  development after recovery.
- `V1-Advance` -> inherited implementation/recovery baseline.
- older branches -> historical/reference unless explicitly re-adopted.

Do not merge `New` back into `Developing` merely because inherited policy once
used that branch. Do not change the repository default branch until the user
explicitly approves that separate decision.

## User-Facing Communication

Keep reports decision-oriented rather than narrating every internal action.

For non-trivial Developing work, prefer:

```text
Tujuan:
Cara berpikir:
Hasil yang dituju:
Tidak diubah:
Cara memastikan benar:
```

Final material-task reporting should distinguish:

```text
Status: Selesai | Perlu pemeriksaan | Terhenti
Hasil:
Bukti:
Batasan:
Next step:
```

Use one clear next step. Distinguish `implemented` from `verified`.

## Bootstrap Next Step

After this root rule is established, create `CONTEXT.md` as a compact recovery
snapshot containing only verified stable facts plus an explicit revalidation
queue. Do not build the full foundation or specialist skill architecture before
that context owner exists.
