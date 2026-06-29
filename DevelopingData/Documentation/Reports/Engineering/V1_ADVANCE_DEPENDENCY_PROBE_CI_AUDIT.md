# TranslateIT V1-Advance Dependency Probe CI Audit

Branch: `V1-Advance`
Status: Phase 3 dependency probe CI added

## Purpose

This audit records the first promoted CI gate after bootstrap validation.

The goal is to test whether the active RustApp package dependencies can install in GitHub Actions without running any local runtime, CUDA, model, microphone, virtual microphone, TTS provider, or installer scripts.

## Workflow updated

Updated workflow:

```text
.github/workflows/translateit-v1-advance-ci.yml
```

Added job:

```text
V1 Advance Dependency Probe
```

The job runs after:

```text
V1 Advance Bootstrap Validation
```

## Dependency probe behavior

The dependency probe:

1. Checks out the repository.
2. Sets up Node.js 20.
3. Enters the active app package:

```text
EngineData/Frontend/RustApp
```

4. Prints Node and npm versions.
5. Installs dependencies with lifecycle scripts ignored.

Without lockfile:

```text
npm install --ignore-scripts --no-audit --no-fund
```

With lockfile:

```text
npm ci --ignore-scripts --no-audit --no-fund
```

6. Verifies `node_modules` exists.
7. Does not run typecheck, Rust check, frontend build, Tauri build, model setup, worker setup, CUDA checks, microphone capture, virtual microphone routing, or TTS provider runtime.

## Why lifecycle scripts are ignored

`--ignore-scripts` is used because the current phase is still non-local.

Dependency install should not accidentally execute package lifecycle behavior that could become platform-specific or runtime-sensitive.

A stricter install/build gate can be promoted later after this dependency probe remains green.

## Policy updated

Updated:

```text
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_DEPENDENCY_INSTALL_POLICY.md
```

The policy now explicitly documents the ignored-lifecycle dependency probe commands.

## Not claimed

This CI gate does not claim:

1. TypeScript readiness,
2. Rust cargo readiness,
3. frontend build readiness,
4. Tauri packaging readiness,
5. CUDA readiness,
6. model readiness,
7. microphone capture success,
8. virtual microphone success,
9. TTS provider quality,
10. local target-PC readiness.

## Next safe step

If the dependency probe stays green, the next safe gate is TypeScript-only validation:

```text
npm run typecheck
```

That should be added as a separate job after dependency probe, not bundled with Rust/frontend build yet.
