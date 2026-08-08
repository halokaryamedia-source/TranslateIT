---
name: development-brief
description: Mandatory front door for non-trivial TranslateIT Developing work. Ground the real goal, separate outcome from suggested method, identify the semantic owner and execution channel, decide whether development is actually needed, define minimal scope with 2-5 acceptance criteria and a proof budget, then use at most one project specialist when it adds real semantic value. Re-check the same contract before completion. Do not use for Context Recovery, Plan, or Maintenance.
---

# TranslateIT Development Brief

Use this skill as the Developing front door. Root `AGENTS.md` owns boot,
precedence, discovery, independent judgment, edit discipline, anti-slop, evidence,
and finalization; do not duplicate those rules here.

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

### 6. Select At Most One Specialist

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

### 7. Implement And Prove

Apply the root-cause/edit gate, change the actual owner, preserve valid behavior
outside scope, and implement the minimum complete solution. Obtain only the proof
budget required by the brief.

### 8. Return To The Same Brief

Before completion verify:

- Goal achieved?
- Expected output achieved?
- Acceptance POV satisfied?
- All criteria supported by proof actually obtained?
- Stayed inside scope?
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
review.

## Completion

Return to root `AGENTS.md` for evidence labels, status, repository-state updates,
and the final report. Exactly one project specialist may have been used; do not
stack another specialist when a second independent problem is discovered. Reframe
that problem as a separate bounded task instead.
