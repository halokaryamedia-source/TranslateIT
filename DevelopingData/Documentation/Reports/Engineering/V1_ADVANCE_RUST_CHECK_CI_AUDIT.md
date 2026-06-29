# TranslateIT V1-Advance Rust Check CI Audit

Branch: `V1-Advance`
Status: Phase 3 Rust-only CI gate added

## Purpose

This audit records the Rust-only CI gate promoted after the TypeScript-only gate.

The goal is to validate Rust/Tauri backend compile/link consistency through cargo check without bundling frontend build, Tauri packaging, CUDA, model loading, microphone capture, virtual microphone routing, TTS provider runtime, or installer work into the same step.

## Workflow updated

Updated workflow:

```text
.github/workflows/translateit-v1-advance-ci.yml
```

Added job:

```text
V1 Advance Rust Check Gate
```

The job runs after:

```text
V1 Advance TypeScript Gate
```

## Rust check gate behavior

The Rust check gate:

1. Checks out the repository.
2. Sets up Node.js 20.
3. Sets up Rust stable.
4. Enters the active app package:

```text
EngineData/Frontend/RustApp
```

5. Installs dependencies with lifecycle scripts ignored.
6. Runs:

```text
npm run check:rust
```

The package script resolves to:

```text
cargo check --manifest-path src-tauri/Cargo.toml
```

## Explicitly not run

This gate does not run:

```text
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

1. frontend build readiness,
2. Tauri packaging readiness,
3. CUDA readiness,
4. model readiness,
5. microphone capture success,
6. virtual microphone success,
7. TTS provider quality,
8. local target-PC readiness.

## Next safe step

If the Rust check gate stays green, the next safe gate is frontend-build-only validation:

```text
npm run build:frontend
```

That should be added as a separate job after the Rust check gate, not bundled with full Tauri packaging yet.
