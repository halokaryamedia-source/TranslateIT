# RustApp Scripts

This directory contains only the validation entrypoints needed by the current small TranslateIT product.

## Current Source Checks

```text
validate:source-contracts
├─ startup/core runtime contract
├─ internal Meeting route contract
├─ Rust manifest preflight
└─ frontend build preflight

validate:quick
└─ source contracts + TypeScript typecheck
```

Package/path preflight remains separate because installer/path claims are a different boundary. `check:tauri-rust-local` remains an explicit local compile command and is not part of source-only proof.

## Rules

- Validators protect current Meeting / Text / Settings behavior; they do not preserve retired features.
- Do not reintroduce Audio Studio, History/Chat, dev seed/handoff/smoke matrices, professional-readiness gates, or branch-era report generators merely for coverage.
- Prefer compile/typecheck and a few direct core contract guards over large deterministic test museums.
- Generated proof belongs under ignored `.tmp/` paths.
- Source checks must not claim Windows audio, model execution, rendered UI, installer, latency, or clean-machine success.

Git history preserves removed validation/report tooling if it is needed for forensic recovery later.
