---
name: no-ai-slop
description: Detect and remove AI-slop patterns from TranslateIT prose, reviews, prompts, and implementation diffs while preserving precise technical meaning. Also flags engineering slop such as fake readiness, placeholder success, duplicate owners, speculative abstractions, and evidence inflation. Support skill only; not a semantic project specialist.
license: MIT
metadata:
  role: support
  adapted_from: https://github.com/petergyang/no-ai-slop
---

# No AI Slop

Use this as a **review filter**. It does not decide product architecture and does not
replace root `AGENTS.md`, source ownership, or a semantic specialist.

Upstream inspiration: `petergyang/no-ai-slop` (MIT). The upstream skill focuses on
human writing. This TranslateIT adaptation preserves that editing discipline and
adds repository-specific checks for implementation/proof slop already prohibited by
project governance.

## Modes

### Detect

When asked to audit or critique, report concrete patterns with the exact source
location/behavior and why each pattern is harmful. Do not guess authorship and do
not assign a meaningless AI score.

### Edit

When asked to improve prose or a bounded diff, make the minimum effective change.
Preserve facts, user intent, technical precision, and valid project terminology.

## Prose Slop Checks

Flag or remove:

- throat-clearing, generic praise, fake-insight setups, dramatic reveals;
- unsupported importance claims or vague attribution;
- repeated recap/summary paragraphs that add no new information;
- synonym cycling when one canonical project term is clearer;
- decorative formatting, excessive headings, stacked punchy fragments;
- generic sentences that could be pasted into any project unchanged;
- claims such as `ready`, `optimized`, `robust`, `production-ready`, or `complete`
  when the available evidence supports only source wiring or a narrower state.

Do not remove a hedge when uncertainty is real. Removing uncertainty can manufacture
false confidence.

## Engineering Slop Checks

Treat these as high-signal problems:

1. **Duplicate ownership** — two active services/runtimes/stores/controllers own the
   same responsibility.
2. **Fake success** — placeholder, deterministic demo, dry-run, seed, contract stub,
   source grep, or static file presence is promoted into user/runtime success.
3. **Evidence inflation** — build/static/source evidence is described as device,
   model, audio, quality, latency, package, or production proof.
4. **Speculative abstraction** — generic frameworks, registries, V2/New replacement
   owners, compatibility layers, or config surfaces with no current consumer.
5. **Fallback masking** — broad fallback/retry hides the real error or makes behavior
   depend on which path happened to run.
6. **Dead scaffold authority** — planners, readiness gates, reports, manifests, or
   diagnostics remain active after a newer canonical owner supersedes them.
7. **Magic progress** — arbitrary percentages/scores imply maturity without a
   benchmark or acceptance contract.
8. **Comment-driven completeness** — comments or docs describe behavior that source
   execution does not perform.
9. **Test theater** — tests validate markers/strings or mocks while the claim being
   made requires actual execution.
10. **Unbounded technical output** — logs/reports expose private text, paths, model
    internals, or user data without a diagnostic requirement.

## Review Procedure

1. State the exact claim or behavior being reviewed.
2. Identify the current semantic owner and direct caller/consumer.
3. Compare implementation to the claim, not to surrounding comments/docs.
4. Classify each issue as `KEEP`, `REMOVE`, `MERGE`, `REPLACE`, or `DEFER` when the
   review is architectural.
5. Prefer deletion/consolidation over adding another abstraction.
6. Distinguish source alignment from `LOCAL PROOF REQUIRED` runtime claims.
7. Stop when the bounded review is complete; do not expand into unrelated cleanup.

## Minimum Review Output

For each material finding provide:

```text
Severity
Location / owner
Observed behavior
Why it is slop or misleading
Smallest valid correction
Evidence level
```

## Self-Check

Before completing a review/edit, verify:

- no new claim was invented;
- no project-specific fact was flattened into generic prose;
- no valid uncertainty was deleted;
- no duplicate owner/fallback was added to fix another duplicate owner/fallback;
- completion language matches the strongest evidence actually obtained.
