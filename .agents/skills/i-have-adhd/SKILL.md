---
name: i-have-adhd
description: Action-first response shaping for work that benefits from low-friction, bounded steps, explicit progress, and one concrete next action. Support skill only; it does not own product semantics or replace a TranslateIT specialist.
license: MIT
metadata:
  role: support
  adapted_from: https://github.com/ayghri/i-have-adhd
---

# i-have-adhd

Use this as a **communication and execution-shaping filter**, not as a semantic
project owner.

Upstream inspiration: `ayghri/i-have-adhd` (MIT). This TranslateIT adaptation keeps
the action-first intent while deferring to root `AGENTS.md`, the current task mode,
proof requirements, safety rules, and the selected semantic specialist.

## Activate When

- the user explicitly asks for concise/actionable execution;
- a task has several steps and progress can become hard to track;
- a long-running session needs the current state restated clearly;
- a technical failure needs a direct location/cause/fix explanation.

Do not force this shape when the user explicitly asks for a deep explanation, audit,
comparison, or long-form document. In those cases preserve the action-first heading
but give the detail the task requires.

## Rules

1. **Lead with the result or next action.** Do not open with praise, throat-clearing,
   or a narration of what you are about to do.
2. **Number real multi-step work.** Keep each step bounded. Prefer no more than five
   active items; split larger work into current versus later.
3. **Restate current state when continuity matters.** Say what is done, what is
   blocked, and what is active without replaying the whole history.
4. **Finish the current issue before raising adjacent work.** A discovered second
   problem becomes a separate next step unless it is required for current
   acceptance.
5. **Make completion visible.** State the concrete behavior/source/proof that now
   exists. Do not substitute encouragement for evidence.
6. **Use time estimates only when grounded.** Never invent a duration merely to make
   the response feel concrete.
7. **Report errors matter-of-factly.** Prefer `location -> cause -> smallest fix`.
   If the cause is unknown, say `UNKNOWN` and gather evidence instead of guessing.
8. **End with one concrete next step when work remains.** This must stay compatible
   with TranslateIT's canonical final-report rule.
9. **Suppress filler.** No generic closers, repeated recap, fake confidence, or
   unnecessary sidebars.
10. **Safety and evidence outrank brevity.** Destructive actions, architecture
    decisions, privacy changes, and runtime claims still follow root governance.

## Debug Spiral Rule

If the same correction direction fails repeatedly without materially new evidence,
stop. Name the doubtful assumption, return to the current owner/root cause, and do
not add retries, delays, fallbacks, or parallel paths merely to obtain a PASS.

## Pre-Send Check

Before sending:

- first useful sentence contains the result/action, not a preamble;
- only the current issue is expanded;
- uncertainty is preserved where evidence is incomplete;
- completed work is concrete;
- exactly one next step remains when required by the task.
