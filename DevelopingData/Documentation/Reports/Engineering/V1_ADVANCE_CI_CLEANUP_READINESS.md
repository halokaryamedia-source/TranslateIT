# V1 Advance CI Cleanup Readiness

## Status

V1 Advance CI is cleaned and stabilized around a small active script surface.

## CI hard gates

The current hard gates are:

- Source contract validators in `source-contract-guards`.
- Frontend dependency install, TypeScript typecheck, and Vite build in `frontend-build-guard`.
- Rust/Tauri source-level preflight in `rust-tauri-source-guard`.

## Active npm scripts

`EngineData/Frontend/RustApp/package.json` is intentionally limited to active scripts only:

- `build:frontend`
- `typecheck`
- `check:rust`
- `check:tauri-rust-local`
- `preflight:frontend-build`
- `preflight:tauri-package`
- `validate:script-profiles`
- `validate:imports`
- `validate:naming`
- `validate:translation-flow`
- `validate:runtime-ux`
- `validate:startup-readiness`
- `validate:ci-scope`
- `validate:virtual-route`
- `validate:source-contracts`
- `validate:quick`
- `test:contract-reports`

`validate_script_profiles.mjs` rejects unexpected npm script names and placeholder echo commands so the cleanup does not regress.

## Diagnostic reports

Contract reports are diagnostics only. They generate evidence and warnings, but do not fail CI. CI blocking is handled by the explicit hard gates above.

The diagnostic runner is:

- `EngineData/Frontend/RustApp/scripts/run_contract_reports.mjs`

It calls:

- `run_frontend_backend_contract_report.mjs`
- `run_worker_contract_report.mjs`
- `run_rust_module_linkage_report.mjs`
- `run_ui_binding_consistency_report.mjs`
- `run_action_binding_report.mjs`

## Retired scripts

Older one-off validators and reports that are no longer referenced by `package.json` were retired or reduced to one-line stubs when direct deletion was blocked by the connector. They are not part of the active CI gate.

## Manual proof still needed before release

This cleanup does not claim full release readiness. Before release, run manual local proof on the target Windows/Tauri environment:

```bash
npm run check:tauri-rust-local
npm run build:frontend
```

Full Cargo/Tauri compile should be restored as a hard gate only after local compile issues are resolved without relying on diagnostic-only reports.
