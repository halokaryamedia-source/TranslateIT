---
name: development-brief
description: Mandatory front door for non-trivial TranslateIT Developing work. Ground the real goal, separate outcome from suggested method, identify the semantic owner and execution channel, decide whether development is actually needed, define minimal scope with 2-5 acceptance criteria and a proof budget, then use at most one project specialist when it adds real semantic value. Re-check the same contract before completion. Do not use for Context Recovery, Plan, or Maintenance.
---

# TranslateIT Development Brief

Use this skill as the Developing front door. Root `AGENTS.md` owns boot,
precedence, discovery, independent judgment, edit discipline, anti-slop, evidence,
and finalization; do not duplicate or weaken those rules here.

## Required Decisions

For non-trivial Developing work establish:

```text
Goal:
Suggested method (if any):
Observed fixture/example (if any):
Generic requirement:
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

This is an internal development contract, not a reason to create a per-task plan
file.

## Procedure

### 1. Ground The Goal

Separate the user outcome from a suggested technical method. Treat screenshots,
samples, old branches, old UI, sample files, and inherited reports as fixtures or
evidence unless current policy explicitly makes them generic requirements.

Resolve repository facts from current canonical owners/source before asking the
user. If a high-impact product decision is still unresolved, leave Developing
and use Plan or Context Recovery rather than inventing the answer.

### 2. Detect The Execution Channel

Record one:

```text
ChatGPT -> GitHub
Codex / Local
```

The channel changes available proof, not goal, scope, architecture, or acceptance
criteria.

### 3. Development Necessity Gate

```text
Current behavior already satisfies goal
-> No change required

Requirement unresolved
-> Plan / Context Recovery

Method unsupported
-> Redirect

Grounded change required
-> Develop
```

Do not create a patch merely to create output.

### 4. Identify The Semantic Owner

Find the current owner and direct callers/contracts before creating a new owner.
Choose responsibility, not language/framework.

`Build POV` is the semantic engineering owner of the change. `Acceptance POV` is
the downstream user/system perspective that determines whether the result is
actually useful. Engineering PASS without Acceptance PASS is not completion.

### 5. Define The Smallest Complete Boundary

Set explicit in/out scope where adjacent systems are easy to confuse. Use only
2-5 acceptance criteria, each specific enough to fail.

Set the proof budget before implementation using the minimum proof level required
by the claims.

### 6. Run The Development Quality Guard

Before editing, verify all five:

1. **One owner** — the change extends/reconciles the canonical owner instead of
   creating a second active service, runtime, store, controller, gate, or config
   authority for the same responsibility.
2. **Real success** — no placeholder, seed, deterministic demo, dry-run, source
   marker, stale manifest, or fallback result can be promoted into product/runtime
   success unless the current acceptance claim explicitly is only that narrow
   contract.
3. **Known fallback only** — every fallback handles a named expected capability
   condition. Broad fallback/retry must not hide an unknown root cause or make
   behavior depend on whichever path happens to succeed.
4. **Every addition earns its place** — each persistent file, abstraction,
   dependency, config, compatibility layer, cache, or state maps directly to a
   current criterion, required contract, proved cause, or required proof.
5. **Proof matches claim** — static/source/build evidence is never described as
   model quality, latency, device/audio, rendered UI, installed-runtime, or
   production proof.

If any check fails, shrink the method, merge/remove an owner, or return to Plan /
Recovery. Do not continue by layering another abstraction over the conflict.

### 7. Select At Most One Specialist

Read `docs/knowledge/skills/activation-matrix.md` only when specialist selection is
needed.

For one Developing task:

```text
development-brief
+
zero or one project specialist
```

Use a specialist only when the current acceptance boundary is owned by that
semantic domain and the specialist adds domain-specific execution judgment.

Communication/review/research/tooling techniques are not extra specialists and do
not justify new repository skills when root governance or the selected specialist
can own them cleanly.

### 8. Implement And Prove

Apply the root-cause/edit gate, change the actual owner, preserve valid behavior
outside scope, and implement the minimum complete solution. Obtain only the proof
budget required by the brief.

When progress reporting is needed, keep it action-first: state the current result or
blocker first, keep active multi-step work bounded, and do not introduce unrelated
issues before the current acceptance boundary is closed.

### 9. Return To The Same Brief

Before completion verify:

- Goal achieved?
- Expected output achieved?
- Acceptance POV satisfied?
- All criteria supported by proof actually obtained?
- Stayed inside scope?
- One canonical owner remains for each changed responsibility?
- Any fake/placeholder success, evidence inflation, arbitrary progress metric,
  ceremonial test, or fallback masking introduced?
- Any unsupported or unproved claim introduced?

If implementation exists but required local/runtime/device proof is unavailable,
report `Perlu pemeriksaan`, not `Selesai`.

## Fast Path

A tiny, unambiguous, low-risk Developing change with an obvious owner and proof
may use the brief mentally without full ceremony. Example: replacing one stale
active `Fast` label with canonical `Realtime` when no persisted compatibility
contract exists.

## User-Facing Brief

For non-trivial Developing work:

```text
Tujuan:
Cara berpikir:
Hasil yang dituju:
Tidak diubah:
Cara memastikan benar:
```

Keep the full internal fields private unless a material decision needs explicit
review. Lead with the actionable/current result rather than praise or a generic
preamble. Use numbered steps only when the user must track multiple actions. Do not
invent time estimates merely to make work sound concrete.

## Completion

Return to root `AGENTS.md` for evidence labels, status, repository-state updates,
and the final report. Exactly one project specialist may have been used; do not
stack another specialist when a second independent problem is discovered. Reframe
that problem as a separate bounded task instead.
