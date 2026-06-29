# TranslateIT V1-Advance CI Re-promotion: Policy Validator Audit

Branch: `V1-Advance`
Status: policy validator restored after frontend build gate stayed green

## Restored gate

The primary workflow now runs:

```text
Bootstrap Validation
Policy Validator
Dependency Probe
TypeScript Gate
Rust Manifest Preflight
Frontend Build Preflight
Frontend Build Gate
```

## Command

The policy validator runs from the repository root:

```text
node EngineData/Frontend/RustApp/scripts/validate_v1_advance_policy.mjs
```

## Purpose

This validates that the V1-Advance source branch strategy, package script declarations, script safety matrix, inactive DesignIT/FigmaDesignExport guards, documentation markers, runtime contracts, and speech policy markers remain aligned.

## Important scope note

This gate is policy and contract validation only.

## Not run

This gate does not run full Rust cargo check, Tauri packaging, CUDA, model loading, microphone capture, virtual microphone routing, TTS provider runtime, or installer build.

## Next gate

If this stays green, the next controlled promotion can prepare full Rust cargo check.
