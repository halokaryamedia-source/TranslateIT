# TranslateIT V1-Advance Script Safety Audit

Branch: `V1-Advance`
Status: Phase 2 script safety audit completed

## Purpose

This audit records the first package script safety classification for the GitHub-first, CI-first phase.

The goal is to prevent non-local CI from accidentally running scripts that require:

1. CUDA hardware,
2. local model files,
3. microphone input,
4. virtual microphone routing,
5. TTS provider runtime,
6. worker virtual environment setup,
7. installer packaging,
8. target-PC latency measurement.

## Safety matrix added

Added source-of-truth matrix:

```text
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json
```

The matrix classifies scripts into:

```text
bootstrap_ci_allowed_commands
ci_safe_script_candidates_for_phase_3
requires_target_pc_or_local_runtime
report_or_status_only_scripts
forbidden_in_non_local_ci_workflow
```

## Bootstrap CI policy

Current bootstrap CI is allowed to run only the V1-Advance policy validator:

```text
node EngineData/Frontend/RustApp/scripts/validate_v1_advance_policy.mjs
```

This keeps CI lightweight and avoids false local-readiness claims.

## Local-only or target-PC-only scripts

The following script families must not run in the current non-local CI phase:

```text
worker setup/smoke scripts
translation GPU conversion/final scripts
model inventory/setup/verify scripts
GPU setup/check scripts
voice capture evidence scripts
local-heavy validation scripts
release/installer build scripts
Audio Studio local validation scripts
```

These are reserved for later target-PC validation.

## Validator updates

Updated validator:

```text
EngineData/Frontend/RustApp/scripts/validate_v1_advance_policy.mjs
```

The validator now checks:

1. `V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json` exists.
2. The matrix declares `branch: V1-Advance`.
3. The matrix points to `EngineData/Frontend/RustApp/package.json`.
4. Script names referenced by the matrix exist in package scripts.
5. Important local-only scripts are classified as target-PC/local-runtime only.
6. The non-local CI workflow does not contain forbidden local-only `npm run ...` commands.
7. The active documentation index lists the script safety matrix.

## Active documentation index update

Updated:

```text
DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md
```

The script safety matrix is now listed in the active source-of-truth order.

## Not claimed

This audit does not claim:

1. TypeScript build readiness,
2. Rust cargo readiness,
3. Vite build readiness,
4. CUDA readiness,
5. model readiness,
6. microphone capture success,
7. virtual microphone success,
8. TTS provider quality,
9. installer readiness.

## Next target

The next safe step is Phase 3 preparation:

1. inspect which CI-safe candidate scripts can run without dependency install surprises,
2. add lockfile or define a stable install strategy,
3. promote strict checks gradually instead of enabling all build gates at once.
