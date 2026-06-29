# TranslateIT V1-Advance Policy Validator Command Match Repair Audit

Branch: `V1-Advance`
Status: repair after policy validator re-promotion failure

## Problem

After the policy validator was restored, CI became red.

The likely cause was forbidden command matching in:

```text
EngineData/Frontend/RustApp/scripts/validate_v1_advance_policy.mjs
```

The validator used broad substring matching for forbidden workflow commands.

This caused a false positive:

```text
Forbidden command: npm run build
Allowed command:   npm run build:frontend
```

Because `npm run build:frontend` contains `npm run build`, the validator could reject the valid frontend build gate.

## Repair

The validator now matches forbidden workflow commands by exact workflow command line only.

It accepts:

```text
npm run build:frontend
```

while still blocking the local-only full app command:

```text
npm run build
```

## Not claimed

This repair does not claim full Rust cargo check readiness, Tauri packaging readiness, CUDA readiness, model readiness, microphone success, virtual microphone routing success, TTS provider quality, installer readiness, or target-PC latency.
