# TranslateIT V1-Advance Dependency Install Policy

Branch: `V1-Advance`
Status: active dependency/install policy for Phase 3 preparation

## Purpose

This policy defines how dependency installation should be promoted from bootstrap CI to stricter CI validation without breaking the GitHub-first phase or making false local runtime claims.

The current branch is intentionally non-local. Dependency validation must not require CUDA, local models, microphone access, virtual microphone drivers, TTS provider runtime, worker virtual environment setup, or installer packaging.

## Active package

The active app package is:

```text
EngineData/Frontend/RustApp
```

The active package manifest is:

```text
EngineData/Frontend/RustApp/package.json
```

## Current lockfile state

At the time this policy is introduced, `EngineData/Frontend/RustApp/package-lock.json` is not treated as required by bootstrap CI.

Bootstrap CI must continue to avoid dependency install until dependency install strategy is promoted deliberately.

## Phase 3 install strategy

Phase 3 should be promoted in small gates:

1. **Manifest gate**
   - Validate `package.json` exists.
   - Validate required scripts exist.
   - Validate script safety matrix.
   - No dependency install.

2. **Dependency probe gate**
   - Run dependency install in a dedicated CI job.
   - Use `npm install --ignore-scripts --no-audit --no-fund` when no lockfile exists.
   - Use `npm ci --ignore-scripts --no-audit --no-fund` when a lockfile exists but the job is still only a dependency probe.
   - Do not run local-only scripts.
   - Do not run lifecycle scripts.
   - Do not run Tauri build.
   - Do not claim app readiness.

3. **Lockfile gate**
   - Introduce `package-lock.json` only after dependency probe is stable.
   - Once `package-lock.json` is committed, strict CI may use `npm ci`.
   - `npm ci` must not be used as a strict gate before the lockfile is present.

4. **TypeScript gate**
   - Promote `npm run typecheck` after dependency install is stable.

5. **Rust check gate**
   - Promote `npm run check:rust` after Rust toolchain setup is stable.
   - This is still CI-safe when it does not require local hardware or model files.

6. **Frontend build gate**
   - Promote `npm run build:frontend` after TypeScript and Rust checks are stable.
   - Do not promote `npm run build` yet because full Tauri app build may become packaging-sensitive.

## Allowed install commands by phase

Bootstrap CI:

```text
No dependency install required.
```

Dependency probe CI without lockfile:

```text
npm install --no-audit --no-fund
npm install --ignore-scripts --no-audit --no-fund
```

Dependency probe CI with lockfile:

```text
npm ci --ignore-scripts --no-audit --no-fund
```

Strict CI with lockfile:

```text
npm ci
```

## Commands not allowed during dependency install probe

The dependency install probe must not run:

```text
npm run build
npm run setup:translation-ct2
npm run test:translation-gpu-final
npm run setup:worker
npm run smoke:worker
npm run smoke:worker:quality
npm run smoke:worker:translation-gpu
npm run smoke:worker:audio
npm run test:runtime-report
npm run test:voice-report
npm run test:voice-capture-evidence
npm run validate:models
npm run validate:full
npm run validate:local-heavy
npm run validate:local-hardening
npm run validate:audio-studio:local
npm run gpu:check
npm run gpu:setup-torch-cuda
npm run gpu:setup-torch-cuda:apply
```

## CI promotion rule

A CI gate may only be promoted when the previous gate is green on the latest `V1-Advance` HEAD.

Do not promote multiple heavy gates at once.

If a promoted gate fails, fix that gate first before adding the next one.

## Evidence rule

Dependency install success only proves installability of package dependencies in GitHub Actions.

It does not prove:

1. local CUDA readiness,
2. local model readiness,
3. microphone capture success,
4. virtual microphone routing,
5. TTS provider quality,
6. target-PC latency,
7. packaged installer readiness.

Those require local target-PC validation later.

## Recommended next CI gate

The next safe gate after bootstrap CI is:

```text
Dependency Probe CI
```

The dependency probe should be separate from bootstrap CI so failures are easier to isolate.
