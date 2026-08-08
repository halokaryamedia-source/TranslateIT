---
name: development-brief
description: Mandatory front door for non-trivial TranslateIT Developing work. Ground the real goal in current repository evidence, separate requested outcome from a suggested method, identify the semantic owner and execution channel, decide whether development is actually needed, define minimal scope with 2-5 acceptance criteria and a proof budget, then use at most one specialist only when a recovered reusable ownership boundary justifies it. Re-check the same contract before completion. Do not use for Context Recovery, Plan, or Maintenance.
---

# TranslateIT Development Brief

Turn a create/change request into the smallest grounded development contract.

Root `AGENTS.md` owns repository boot, context recovery, source precedence,
independent judgment, root-cause gating, anti-AI-slop rules, skill budget, proof
economy, and evidence labels. Apply those rules instead of duplicating them here.

This skill is the mandatory front door for **non-trivial Developing work** on
`New`. It is not a substitute for recovering product context when the requirement
itself is still uncertain.

## Do Not Use This Skill For

- **Context Recovery** — first recover/reconcile the missing product or historical
  context according to `AGENTS.md`;
- **Plan** — resolve an unclear product/architecture choice before implementation;
- **Maintenance** — bugs, cleanup, reviews, regressions, and behavior-preserving
  refactors use the Maintenance route from `AGENTS.md`;
- trivial mechanical edits whose intent, owner, scope, and proof are already
  obvious.

If a Developing request exposes a missing high-impact product decision, stop and
reframe that part as Context Recovery or Plan rather than inventing the missing
requirement inside the implementation.

## Required Decisions

Before implementation establish only what materially affects the task:

```text
Goal:
Suggested method (if any):
Current evidence:
Current semantic owner:
Execution channel:
Input authority:
Expected output:
Build POV:
Acceptance POV:
Interface constraints:
In scope / Out of scope:
Acceptance criteria: 2-5
Proof budget:
Open high-impact decisions:
```

Omit fields that do not apply. Do not create a persisted planning document merely
to fill this template.

## Procedure

### 1. Boot From Repository State

Read:

1. root `AGENTS.md`;
2. root `CONTEXT.md`;
3. `docs/knowledge/next-action.md`;
4. only the relevant current foundation/decision/ownership note when it exists;
5. the affected current source plus direct contracts/callers.

Open inherited `DevelopingData` reports only when they are needed to recover a
specific intent, historical decision, or evidence boundary.

Do not broad-scan the repository or reconstruct the task from old chat history.

### 2. Ground The Real Goal

Separate:

- **user outcome** — what must become possible or correct;
- **suggested method** — how the user or an old document proposes achieving it;
- **current behavior** — what `New` source actually does;
- **current policy/decision** — only when a current canonical owner exists;
- **recovery evidence** — inherited material that still needs reconciliation;
- **assumption** — plausible but not established;
- **unknown** — insufficient/conflicting evidence.

A suggested technical method is not automatically a requirement. Preserve the
user's outcome while redirecting methods that conflict with current evidence,
create unnecessary architecture, revive superseded behavior, or reduce product
quality.

Samples, old prototypes, historical reports, and named fixtures are evidence or
examples unless the current task explicitly requires their exact behavior.

### 3. Identify The Current Semantic Owner

Before creating a new module, service, helper, contract, config, state store, or
document:

- locate the source/contract that currently owns the behavior;
- inspect the directly affected callers or boundaries;
- prefer extending/correcting the existing owner;
- treat a missing owner as an architecture question, not permission to create a
  new layer immediately.

Choose ownership by **responsibility**, not merely by implementation language.
Rust, TypeScript, Python, Tauri, audio, CUDA, or model code appearing in the same
task does not automatically justify multiple specialist owners.

### 4. Detect The Execution Channel

Classify the work before defining proof:

#### ChatGPT -> GitHub

Can establish repository/source/doc changes and static evidence available through
GitHub. It must not claim live Windows/Tauri/Python/model/audio/device/CUDA/
installer/end-to-end behavior without corresponding runtime proof.

#### Codex / local target environment

May run targeted build/runtime/device/model/audio checks when the environment is
actually available. Use only the smallest check that can prove or disprove the
material claim.

The goal, scope, acceptance criteria, and product expectation do not change
between channels. Only the available proof changes.

### 5. Decide Whether Development Is Needed

Inspect the current owner before inventing work.

Valid outcomes include:

- **development required** — current behavior does not satisfy the grounded goal;
- **documentation/decision recovery required first** — implementation would be
  premature;
- **no change required** — current behavior already satisfies the goal;
- **unsupported** — the requested method/capability conflicts with current
  evidence and should not be implemented as proposed.

`No change required` is a successful conclusion when supported by evidence.

### 6. Choose Build POV And Acceptance POV

Use two perspectives only when they clarify the task:

- **Build POV** — the engineering/domain responsibility that owns the actual
  implementation decision;
- **Acceptance POV** — the downstream user/system need that determines whether
  the result is actually useful.

Examples of possible Build POVs may later include desktop runtime, local AI
runtime, audio routing, persistence, or release tooling, but do not freeze these
as specialist skill names during bootstrap.

Intermediate frameworks, commands, providers, libraries, or agents are interface
constraints rather than extra personas.

### 7. Define Minimal Scope

Write the smallest complete boundary that solves the grounded goal.

Explicitly state what will **not** change when adjacent areas are easy to confuse
with the task.

Reject scope growth such as:

- "while here" architecture cleanup;
- parallel or replacement runtime paths without a proved need;
- compatibility/fallback layers for hypothetical callers;
- new abstractions created only to make the patch look cleaner;
- broad documentation rewrites around one bounded source change;
- unrelated old TODOs discovered during investigation.

### 8. Define 2-5 Acceptance Criteria

Criteria must be specific enough to fail.

Prefer criteria about observable behavior, contract shape, source ownership, or
required evidence. Avoid criteria such as:

```text
code is clean
architecture is better
looks correct
should work
all tests pass
```

unless a concrete test/observation defines what those statements mean for the
active boundary.

Engineering success alone is not sufficient if the downstream Acceptance POV is
still unmet.

### 9. Set The Proof Budget

Use the cheapest evidence that can disprove the likely failure.

Examples:

- bounded docs/routing change -> exact file/diff/path check;
- source contract change -> owner + affected caller/contract inspection + relevant
  existing check when informative;
- frontend behavior -> targeted build/typecheck only when it tests the changed
  boundary;
- Rust/Tauri integration -> source/static proof in GitHub, local compile/runtime
  proof only when the claim requires it;
- Python helper/model/audio behavior -> targeted local/runtime proof when the
  claim depends on execution;
- device/CUDA/virtual-audio/latency/installer claims -> target-environment proof,
  never inferred from static source.

Do not create tests, CI jobs, fixtures, screenshots, reports, or telemetry solely
to make the change appear rigorous.

Use root evidence labels when material:

```text
CURRENT-PROJECT VERIFIED
OFFICIALLY VERIFIED
LOCAL PROOF REQUIRED
UNSUPPORTED
UNKNOWN
```

### 10. Select At Most One Specialist

During the current bootstrap/recovery phase, `development-brief` is the only
canonical TranslateIT project skill.

Add a repository specialist later only when repeated/current work proves:

1. a distinct semantic ownership boundary;
2. a reusable procedure that root rules and this brief do not already cover;
3. enough value to justify another routing choice.

For any one Developing task, use **at most one** TranslateIT specialist unless a
future explicit architecture decision changes this rule.

Do not create or stack skills merely because one change touches Rust + TypeScript
+ Python or multiple libraries.

### 11. Implement The Smallest Complete Change

Once the contract is grounded:

- change the actual owner;
- preserve valid behavior outside scope;
- keep existing architecture unless the task explicitly and validly changes it;
- do not patch around an unknown cause;
- stop the same failed correction direction after two attempts without new
  evidence;
- avoid generating new state owners, fallback paths, or documentation layers
  without a current requirement.

### 12. Run The Acceptance Gate

Before reporting `Selesai`, return to the original brief and check:

- did the result achieve the stated Goal?
- did the requested downstream Acceptance POV need become satisfied?
- did the implementation stay within In scope / Out of scope?
- are all acceptance criteria supported by the proof actually obtained?
- did an assumption, historical claim, or local-only behavior get accidentally
  reported as verified?

If implementation exists but material runtime proof is still unavailable, report
`Perlu pemeriksaan` and name the exact remaining proof.

## User-Facing Brief

For non-trivial Developing work, present a compact brief before implementation:

```text
Tujuan:
Cara berpikir:
Hasil yang dituju:
Tidak diubah:
Cara memastikan benar:
```

Keep it practical. Do not expose every internal field unless the user asks for
the full contract.

For trivial unambiguous work, one short line is enough.

## Final User Report

Use this compact shape when useful:

```text
Status: Selesai | Perlu pemeriksaan | Terhenti
Hasil:
Bukti:
Batasan:
Next step:
```

Use exactly one meaningful next step when continuation is needed. Distinguish
`implemented` from `verified`.

## Escalation

Escalation is conditional, not ceremony:

- missing old/current product context -> return to **Context Recovery**;
- unresolved high-impact product/architecture choice -> **Plan**;
- reproducible bug/cleanup/regression -> **Maintenance**;
- material evidence remains unavailable/conflicting -> root evidence-status rule;
- independent review only when it materially improves confidence after the
  implementation;
- formal cross-cutting specification only when a genuinely broad migration or
  multi-phase contract change proves the need.

Do not add another planning framework merely because the task is complex.
