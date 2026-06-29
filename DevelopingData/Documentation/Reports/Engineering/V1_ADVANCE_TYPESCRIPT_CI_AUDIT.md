# TranslateIT V1-Advance TypeScript CI Audit

Branch: `V1-Advance`
Status: Phase 3 TypeScript-only CI gate added

## Purpose

This audit records the TypeScript-only CI gate promoted after the dependency probe gate.

The goal is to validate TypeScript correctness without bundling Rust, frontend build, Tauri packaging, CUDA, model loading, microphone capture, virtual microphone routing, TTS provider runtime, or installer work into the same step.

## Workflow updated

Updated workflow:

```text
.github/workflows/translateit-v1-advance-ci.yml
```

Added job:

```text
V1 Advance TypeScript Gate
```

The job runs after:

```text
V1 Advance Dependency Probe
```

## TypeScript gate behavior

The TypeScript gate:

1. Checks out the repository.
2. Sets up Node.js 20.
3. Enters the active app package:

```text
EngineData/Frontend/RustApp
```

4. Installs dependencies with lifecycle scripts ignored.
5. Runs:

```text
npm run typecheck
```

## Explicitly not run

This gate does not run:

```text
npm run check:rust
npm run build:frontend
npm run build
npm run setup:translation-ct2
npm run test:translation-gpu-final
npm run setup:worker
npm run smoke:worker
npm run test:runtime-report
npm run test:voice-report
npm run test:voice-capture-evidence
npm run validate:models
npm run validate:full
npm run gpu:check
```

## Not claimed

This audit does not claim:

1. Rust cargo readiness,
2. frontend build readiness,
3. Tauri packaging readiness,
4. CUDA readiness,
5. model readiness,
6. microphone capture success,
7. virtual microphone success,
8. TTS provider quality,
9. local target-PC readiness.

## Next safe step

If the TypeScript gate stays green, the next safe gate is Rust-only check:

```text
npm run check:rust
```

That should be added as a separate job after the TypeScript gate, not bundled with frontend build yet.
