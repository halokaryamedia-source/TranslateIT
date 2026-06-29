# TranslateIT V1-Advance Non-Local CI Policy

Branch: `V1-Advance`
Status: active CI policy

## Purpose

This policy defines what GitHub/CI may validate before the project is ready for local target-PC testing.

The current development phase is intentionally non-local. Development should happen through GitHub commits, pull requests, and GitHub Actions. Local tests with CUDA, microphone input, virtual microphone routing, bundled models, and installer behavior are deferred until CI-safe work is stable.

## Development rule

All development in this phase must satisfy these rules:

1. Work through the `V1-Advance` branch.
2. Use CI for every meaningful change.
3. Do not require local CUDA hardware in CI.
4. Do not require local model files in CI.
5. Do not require microphone access in CI.
6. Do not require virtual audio devices in CI.
7. Do not claim local runtime readiness from GitHub inspection alone.
8. Do not create alternative engines or legacy runtime paths.
9. Keep TranslateIT V1 as one unified engine.

## CI-safe validation scope

CI is allowed to check:

1. Node package install.
2. TypeScript typecheck.
3. Rust `cargo check`.
4. Vite frontend build.
5. Static architecture contracts.
6. Runtime API to Tauri command registry consistency.
7. Worker command contract consistency when no real worker launch is required.
8. UI binding consistency.
9. Settings binding consistency.
10. Structure and naming policy.
11. Startup readiness wiring.
12. No active dependency on removed DesignIT/FigmaDesignExport runtime paths.

## CI-blocked local/runtime scope

CI must not block on:

1. CUDA provider availability.
2. GPU benchmark results.
3. Whisper model loading.
4. Translation model loading.
5. CTranslate2 conversion output.
6. Microphone capture.
7. Voice activity detection runtime.
8. Virtual microphone driver installation.
9. TTS audio generation quality.
10. End-to-end meeting audio routing.
11. Installer bundling.
12. Target-PC latency.

These must be measured later during the local validation phase.

## CI profile naming

The preferred CI profile name is:

```text
v1-advance-ci
```

The CI profile should be strict about static correctness but honest about what it cannot prove.

## Required CI jobs

Minimum required job:

```text
V1 Advance Non-Local Validation
```

Recommended stages:

1. Checkout repository.
2. Setup Node.js.
3. Setup Rust stable.
4. Install Rust app dependencies.
5. Run TypeScript typecheck.
6. Run Rust cargo check.
7. Run frontend build.
8. Run CI-safe validation scripts where available.
9. Upload or print concise validation summary.

## Required working directory

The active app package is:

```text
EngineData/Frontend/RustApp
```

CI must not treat preview, documentation, or archived paths as active runtime packages.

## CI command policy

Safe baseline commands:

```text
npm ci
npm run typecheck
npm run check:rust
npm run build:frontend
```

Optional commands when proven CI-safe:

```text
npm run validate:script-profiles
npm run validate:imports
npm run validate:naming
npm run validate:translation-flow
npm run validate:runtime-ux
npm run validate:startup-readiness
npm run test:frontend-backend-contract
npm run test:worker-contract
npm run test:rust-linkage-report
npm run test:ui-binding-report
npm run test:action-binding-report
npm run test:settings-integrity-report
```

Do not run the following in non-local CI until explicitly converted to safe mock/contract mode:

```text
npm run setup:worker
npm run smoke:worker
npm run test:translation-gpu-final
npm run validate:models
npm run validate:full
npm run validate:local-heavy
npm run build
```

## Local validation gate

A later local validation phase may start only after:

1. `V1-Advance` CI passes.
2. Single-engine cleanup is complete.
3. Required runtime contracts are updated.
4. No active path depends on DesignIT/FigmaDesignExport.
5. The app can be opened from the active Rust/Tauri package in a predictable way.

## Evidence rule

CI may prove static correctness.

CI may not prove:

1. Real CUDA readiness.
2. Real latency under microphone workload.
3. Real translation quality.
4. Real virtual microphone routing.
5. Real installer readiness.

Those require target-PC evidence later.
