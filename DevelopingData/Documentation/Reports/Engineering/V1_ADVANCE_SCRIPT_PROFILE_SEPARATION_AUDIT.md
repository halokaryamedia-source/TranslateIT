# V1-Advance Script Profile Separation Audit

Branch: `V1-Advance`
Status: completed non-local audit

## Purpose

This audit records the script-profile separation cleanup performed during the non-local phase.

The goal is to keep CI-safe validation separate from local-only, report-only, release, model, GPU, and installer work.

## Issue found

`EngineData/Frontend/RustApp/scripts/validate_script_profiles.mjs` still expected an old script profile:

```text
validate:internal
```

That profile is no longer part of the active `package.json` script set for the current V1-Advance non-local phase.

## Change made

The validator now aligns with the active non-local workflow by requiring these active profiles:

```text
validate:quick
typecheck
check:rust
preflight:frontend-build
preflight:tauri-package
check:tauri-rust-local
validate:release-preflight
validate:local-heavy
validate:local-hardening
```

The validator also enforces that `validate:quick` remains lightweight and does not call local-only or heavy profiles.

## Guardrails added

The updated validator checks that `validate:quick` does not include markers such as:

```text
local-only
report-only
check:tauri-rust-local
setup:
smoke:
models:
gpu:
validate:release-preflight
validate:local-heavy
validate:local-hardening
validate:full
validate:models
cargo check
```

It also checks that:

- `check:tauri-rust-local` remains the manual local Tauri compile proof command,
- `validate:release-preflight` remains local-only/deferred until installer proof exists.

## Outcome

The package script validation profile now matches the current non-local phase:

```text
validate:quick = CI-safe/lightweight
check:tauri-rust-local = manual local proof
release/local/model/GPU/runtime scripts = deferred until local evidence exists
```

No local runtime, CUDA, model, microphone, virtual microphone, installer, or latency readiness is claimed by this audit.
