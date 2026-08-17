# TranslateIT — Next Action

## Current Status

`GITHUB_GOVERNANCE_ALIGNMENT_SOURCE_COMPLETE / R3 PACKAGING DECISION ACTIVE`

The repository governance boundary has been reconciled around BuildIT-style GitHub discipline without changing TranslateIT product/runtime behavior.

Current repository authority:

```text
New        → current development authority
Developing → retained historical/recovery branch only
```

## Active Boundary

VoiceLab A1–A6, the current Svelte product surface, one canonical local AI worker, the matched Meeting audio route, controlled release-input ownership, release provenance/licensing gates, and R3 controlled payload staging remain the current implementation baseline.

R3 established a packaging-format blocker for the current approximately 9.4 GB fully offline release payload:

```text
controlled payload staging / preflight
→ PASS

translateit.exe build
→ PASS

standard Tauri / classic NSIS single-executable packaging
→ FAIL at large-installer mmap/offset boundary

NSIS compression = none
→ same boundary
```

This is not evidence that the application, Python runtime, ASR, translation, GPT-SoVITS, or VB-CABLE payload is broken. It is evidence that the current all-in-one classic-NSIS executable format is not suitable for the staged payload size.

## Governance Result

Current operating owners are now intended to be:

```text
GITHUB_RULES.md
→ GitHub branch/ref, tool fit, atomic delivery, commit/history, CI/API/security,
  retries, hosted proof, STOP

AGENTS.md
→ boot, modes, continuity/source routing, skill budget

CONTEXT.md
→ stable orientation

source-ownership.md
→ responsibility → owner only

decision-log.md
→ durable choices/reasons

next-action.md
→ this active continuation only
```

`Repository Verify` is the retained static proof surface for these repository invariants. Product source/runtime proof remains separate and claim-specific.

## Protected Boundaries

This governance alignment does **not** authorize changes to:

- Meeting lifecycle or translation behavior;
- Text behavior;
- VoiceLab recording/training/inference;
- GPT-SoVITS or translation/ASR model selection;
- Windows audio routing/provider runtime behavior;
- persisted settings schema;
- release payload contents;
- installer/package implementation;
- target-Windows/local acceptance;
- default branch, merge, release, or destructive Git history.

Local Windows validation remains deferred until explicitly reactivated.

## Current Decision Boundary

The release packaging boundary must be selected before more packaging implementation.

The current minimum-change candidate is:

```text
one user-facing setup experience
+ fully offline installation
+ installer with colocated external payload file(s)
```

This is compatible with the earlier durable permission for sidecar/offline payloads, but the exact final distribution layout and installer mechanism still require an explicit current release decision after R3 evidence.

Do not implement a bootstrap download system, first-use model download, alternate installer framework, model/runtime reduction, or another packaging architecture merely to escape the NSIS boundary.

## Next Step

**Plan and approve the exact post-R3 release packaging boundary, then enter a separate bounded `release-packaging-development` slice only after that decision.**
