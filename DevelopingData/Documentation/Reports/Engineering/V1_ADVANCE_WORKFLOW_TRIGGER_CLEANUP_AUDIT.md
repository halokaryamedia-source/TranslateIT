# TranslateIT V1-Advance Workflow Trigger Cleanup Audit

Branch: `V1-Advance`
Status: workflow triggers aligned with primary source branch strategy

## Purpose

This audit records the cleanup of V1-Advance CI workflow triggers after `V1-Advance` became the primary source branch.

## Updated workflows

```text
.github/workflows/translateit-v1-advance-ci.yml
.github/workflows/translateit-v1-advance-safe-ci.yml
.github/workflows/translateit-v1-advance-frontend-preflight.yml
.github/workflows/translateit-v1-advance-frontend-build.yml
```

## Trigger policy

The active V1-Advance workflows now use:

```text
push to V1-Advance
workflow_dispatch
```

They no longer use `pull_request` into `Developing` for this phase.

## Rust wording correction

The primary CI workflow now names the Rust step as:

```text
Rust Manifest Preflight
```

It does not claim full cargo-check readiness.

## Not claimed

This cleanup does not claim local runtime readiness, CUDA readiness, model readiness, microphone success, virtual microphone routing success, TTS provider quality, Tauri packaging readiness, installer readiness, or target-PC latency.
