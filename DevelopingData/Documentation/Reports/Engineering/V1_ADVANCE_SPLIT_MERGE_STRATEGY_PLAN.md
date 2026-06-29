# TranslateIT V1-Advance Split / Merge Strategy Plan

Branch: `V1-Advance`
Status: Phase 3 split/merge strategy proposed

## Purpose

This plan defines how to move from a large draft integration PR toward reviewable and mergeable changes.

## Current state

PR #26 is green but too large for a direct merge into `Developing`.

Current observed size:

```text
1186 commits
475 changed files
53985 additions
0 deletions
```

## Recommended strategy

Keep PR #26 as the master draft integration snapshot.

Do not mark it ready for review yet.

Create smaller focused PRs from curated branches or cherry-picked commits.

## Proposed PR split

### PR A — Documentation and CI foundation

Include:

```text
.github/workflows/translateit-v1-advance-*.yml
V1_ADVANCE_PRODUCT_REQUIREMENTS.md
V1_ADVANCE_NON_LOCAL_CI_POLICY.md
V1_ADVANCE_PHASE_PLAN.md
V1_ADVANCE_DEPENDENCY_INSTALL_POLICY.md
V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json
ACTIVE_DOCUMENTATION_INDEX.md
phase audit reports
```

Goal:

```text
Lock product direction and CI policy without merging runtime implementation risk.
```

### PR B — Runtime contracts retarget

Include:

```text
EngineData/Backend/RuntimeContracts/*
CURRENT_APP_STATUS.md
SINGLE_ACTIVE_ENGINE_POLICY.md
runtime contract audit reports
```

Goal:

```text
Retarget active contracts to V1-Advance and lock single-engine policy.
```

### PR C — RustApp frontend validation

Include:

```text
EngineData/Frontend/RustApp/package.json
EngineData/Frontend/RustApp/index.html
EngineData/Frontend/RustApp/tsconfig.json
EngineData/Frontend/RustApp/src/**/*.ts
EngineData/Frontend/RustApp/src/**/*.css
frontend build preflight and frontend build workflows
```

Goal:

```text
Validate TypeScript and Vite frontend build only.
```

### PR D — Rust/Tauri shell and backend bridge

Include:

```text
EngineData/Frontend/RustApp/src-tauri/**
EngineData/Backend/LocalWorker/**
bridge contract tooling
```

Goal:

```text
Review Rust/Tauri bridge and Python helper runtime separately.
```

Do not claim full cargo check readiness until the full cargo-check gate is restored and green.

### PR E — Local-only restoration

Include later only after target-PC testing:

```text
worker setup scripts
GPU scripts
model setup and verification scripts
voice/runtime reports
Audio Studio local validation
Tauri package/release scripts
```

Goal:

```text
Restore local-only commands after evidence exists on Windows target hardware.
```

## Merge rule

Merge only one focused PR at a time.

Do not merge local-only restoration before CI foundation, contracts, and frontend validation are stable.

## Draft rule

PR #26 should remain draft until the split strategy is accepted.

## Not claimed

This plan does not claim full Rust compile readiness, Tauri package readiness, CUDA readiness, model readiness, microphone capture success, virtual microphone routing success, TTS provider quality, installer readiness, or target-PC latency.
