# TranslateIT V1-Advance PR Readiness Cleanup

Branch: `V1-Advance`
Status: Phase 3 PR readiness cleanup completed

## Purpose

This report records the current PR readiness state after the staged CI promotion work.

## Current CI-safe status

The branch currently validates these non-local gates:

```text
source-of-truth documentation and policy validation
dependency install probe
TypeScript typecheck
Rust manifest preflight
frontend build preflight
Vite frontend build
```

## Important correction

The current Rust gate is not full cargo check.

Current Rust status:

```text
Rust manifest preflight only
```

Full Rust compile validation remains deferred:

```text
cargo check --manifest-path src-tauri/Cargo.toml
```

## Package script state

Current `check:rust` is intentionally routed to:

```text
node scripts/validate_rust_manifest_preflight.mjs
```

This keeps non-local CI stable while preserving full cargo-check restoration for a later controlled gate.

## PR status rule

The PR must not claim:

```text
full Rust cargo-check readiness
Tauri packaging readiness
CUDA readiness
model readiness
microphone capture success
virtual microphone routing success
TTS provider quality
local target-PC readiness
installer readiness
```

## Next safe target

The next safe target after this cleanup is not to merge immediately.

Recommended next steps:

1. Keep all current CI checks green.
2. Review PR changed-files scope.
3. Decide whether to keep this as one large draft PR or split CI/bootstrap changes into smaller PRs.
4. Only after that, consider moving from draft to review-ready.
