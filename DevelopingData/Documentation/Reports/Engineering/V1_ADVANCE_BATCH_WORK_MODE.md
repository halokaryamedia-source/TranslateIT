# V1-Advance Batch Work Mode

Branch: `V1-Advance`
Status: active work mode

## Purpose

Use batch work mode for the remaining V1-Advance development phase.

The previous workflow validated too often after small commits. That kept CI green, but it slowed implementation.

## Current rule

```text
Work in larger implementation batches.
Run CI manually only at milestone boundaries.
Do not add small validators or audit files unless they protect an important boundary.
```

## CI mode

The primary CI workflow is manual milestone validation through `workflow_dispatch`.

Pushes to `V1-Advance` should not automatically run the full CI pipeline.

## Batch order

Recommended order:

1. implement source changes,
2. update only the minimum docs needed,
3. avoid audit-only commits unless important,
4. run manual CI after a meaningful milestone,
5. fix any failing gate from the first clear error.

## Current implementation focus

Non-local source preparation should focus on:

- helper-backed text translation path,
- helper request/response boundaries,
- capture bridge migration preparation,
- frontend state clarity,
- local compile handoff readiness.

Do not claim local runtime readiness until Windows/local evidence exists.
