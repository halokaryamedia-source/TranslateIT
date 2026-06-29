# TranslateIT V1-Advance Dependency Install Audit

Branch: `V1-Advance`
Status: Phase 3 preparation dependency/install policy completed

## Purpose

This audit records the dependency/install strategy added before promoting stricter CI gates.

The goal is to avoid repeating the earlier CI issue where dependency installation was assumed before lockfile/install strategy was defined.

## Policy added

Added:

```text
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_DEPENDENCY_INSTALL_POLICY.md
```

The policy defines a staged CI promotion path:

1. Manifest gate.
2. Dependency probe gate.
3. Lockfile gate.
4. TypeScript gate.
5. Rust check gate.
6. Frontend build gate.

## Current bootstrap stance

Bootstrap CI does not require dependency installation.

This remains intentional until the dependency probe is promoted as a separate isolated CI step.

## Install command policy

Allowed later for dependency probe when no lockfile exists:

```text
npm install --no-audit --no-fund
```

Allowed later for strict CI only after lockfile exists:

```text
npm ci
```

`npm ci` must not be required before `package-lock.json` exists.

## Guard added

Updated:

```text
EngineData/Frontend/RustApp/scripts/validate_v1_advance_policy.mjs
```

The validator now checks:

1. Dependency install policy exists.
2. Active documentation index lists the dependency install policy.
3. Dependency policy includes the required staged install markers.
4. The policy explicitly separates bootstrap CI, dependency probe CI, and strict lockfile CI.

## Active index updated

Updated:

```text
DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md
```

The dependency install policy is now included in the active source-of-truth order.

## Not claimed

This audit does not claim:

1. dependency installation success,
2. TypeScript readiness,
3. Rust cargo readiness,
4. frontend build readiness,
5. Tauri package readiness,
6. CUDA readiness,
7. model readiness,
8. local target-PC readiness.

## Next safe step

The next safe step is to add a dedicated dependency probe CI job that only installs dependencies and runs no runtime/local scripts.

That job should remain separate from bootstrap policy validation so failures are isolated and easy to repair.
