---
name: development-brief
description: Mandatory front door for non-trivial TranslateIT Developing work. Recover current continuity, ground the real goal, separate outcome from suggested method, identify semantic owner and execution channel, decide whether development is needed, define minimal scope with 2-5 acceptance criteria and a proof budget, then use at most one project specialist.
---

# TranslateIT Development Brief

Use this skill only for non-trivial **Developing**. Root `AGENTS.md` owns boot/mode/continuity/authority; root `GITHUB_RULES.md` owns GitHub execution, atomic delivery, history, CI, retry, and STOP behavior.

Context Recovery, Plan, and bounded Maintenance do not enter this procedure merely because files or code are involved.

## Mandatory Developing continuity

Before implementation:

```text
AGENTS.md
→ GITHUB_RULES.md Core Rules
→ CONTEXT.md
→ docs/knowledge/next-action.md
→ this development-brief
→ smallest evidence/owner needed to ground the change
```

Do not ask the user to reconstruct information recoverable from current owners/source.

If `next-action.md` materially disagrees with current source/state:

```text
verify exact current owner
→ identify stale continuity vs stale implementation
→ reconcile stale owner
→ continue from actual current state
```

Do not blindly repeat a stale next step or replace it with a nearby TODO/audit/history item.

## Required development contract

Establish only fields that materially affect the task:

```text
Goal:
Suggested method (if any):
Observed fixture/example (if any):
Actual requirement:
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

This is an internal contract, not a reason to create a per-task plan file.

## Procedure

### 1. Ground the goal

Separate the requested outcome from a suggested implementation method.

Treat screenshots, examples, old branches, old source, historical proof, and inherited reports as evidence/fixtures unless a current canonical owner explicitly makes them current requirements.

Recover discoverable repository facts before asking the user. If a high-impact product/release/architecture decision remains unresolved, leave Developing and use Plan instead of inventing it.

### 2. Record the execution channel

Use one:

```text
ChatGPT → GitHub
Codex / Local
```

The channel changes available proof, not the goal, architecture, acceptance criteria, or required quality.

### 3. Development necessity gate

```text
Current behavior already satisfies goal
→ No change required

Requirement unresolved
→ Plan / Context Recovery

Suggested method unsupported
→ Redirect

Grounded change required
→ Develop
```

Do not create a patch merely to create output.

### 4. Identify the semantic owner

Find the current owner plus direct caller/contract before creating another owner.

`Build POV` is the semantic engineering owner responsible for making the change correctly. `Acceptance POV` is the downstream user/system perspective that decides whether the actual need is solved.

Choose responsibility, not implementation language/framework.

### 5. Define minimum complete scope

Set explicit in/out scope where adjacent systems are easy to confuse.

Define only 2–5 falsifiable acceptance criteria. Choose the cheapest proof capable of falsifying each changed claim.

### 6. Development quality guard

Before editing verify:

1. **One owner** — extend/reconcile the canonical owner instead of creating a second service/runtime/store/controller/gate/config authority.
2. **Real success** — no placeholder, dry-run, source marker, stale manifest, mock result, or fallback is promoted beyond the narrow claim it actually proves.
3. **Known fallback only** — every fallback handles a named expected capability condition; broad fallback/retry must not hide unknown root cause.
4. **Every addition earns its place** — each persistent file, abstraction, dependency, config, compatibility layer, cache, workflow, or state maps to a criterion, required contract, proved cause, or required proof.
5. **Proof matches claim** — source/build/hosted evidence is never described as target model quality, latency, device/audio, rendered native UI, installed-runtime, or clean-machine proof unless that exact capability ran.

If any check fails, shrink/reconcile the method or return to Plan/Recovery.

### 7. Select at most one project specialist

Normal Developing budget:

```text
development-brief
+
zero or one project specialist
```

Routes:

```text
desktop application architecture/state/readiness/settings
→ desktop-runtime-development

visual hierarchy/layout/tokens/rendered UI
→ desktop-ui-design-development

ASR/translation/TTS/model/AI worker runtime
→ local-ai-runtime-development

physical mic/capture/Windows devices/Meeting route
→ windows-audio-runtime-development

installer/private runtime/models/provider distribution
→ release-packaging-development
```

Framework/library helpers are technical tools, not extra TranslateIT specialists.

If a second independent problem appears, close/reframe the current boundary instead of stacking specialists.

### 8. Implement and prove

Apply the root-cause/edit gate, change the actual owner, preserve valid behavior outside scope, and implement the minimum complete solution.

Follow `GITHUB_RULES.md` for atomic logical delivery, commit/history quality, CI routing, hosted proof, retry budget, and STOP.

### 9. Return to the same contract

Before completion verify:

- goal and expected output achieved;
- Acceptance POV satisfied;
- all 2–5 criteria supported by proof actually obtained;
- stayed inside scope;
- one canonical owner remains for each changed responsibility;
- no fake success, evidence inflation, arbitrary progress metric, ceremonial test, fallback masking, or unrelated cleanup was introduced.

If implementation is complete but required target/local proof is unavailable, report `Perlu pemeriksaan`, not `Selesai`.

## User-facing brief

For non-trivial Developing:

```text
Tujuan:
Cara berpikir:
Hasil yang dituju:
Tidak diubah:
Cara memastikan benar:
```

Keep internal contract detail private unless a material decision needs review.

## Completion

Return to root `AGENTS.md` for final status/state reconciliation. Update `next-action.md` only when active continuation meaningfully changed. Use exactly one `Next step`, then STOP.
