# RustApp Scripts

This folder contains the active V1 Advance CI validators plus a few retired diagnostic stubs kept only because direct file deletion was blocked during cleanup.

## Active CI validators

These scripts are part of the current V1 Advance CI gate through `package.json` and `.github/workflows/v1-advance-ci.yml`:

- `validate_script_profiles.mjs`
- `validate_frontend_import_integrity.mjs`
- `validate_file_naming_policy.mjs`
- `validate_translation_flow_integrity.mjs`
- `validate_runtime_ux_depth_integrity.mjs`
- `validate_startup_runtime_readiness.mjs`
- `validate_v1_advance_ci_scope.mjs`
- `validate_virtual_route_contract.mjs`
- `validate_rust_manifest_preflight.mjs`
- `validate_frontend_build_preflight.mjs`
- `validate_tauri_package_preflight.mjs`
- `run_contract_reports.mjs`
- `run_local_tauri_compile_check.mjs` for manual local Tauri/Rust proof only.

## Active npm profiles

`package.json` is intentionally small after cleanup. Only these user-facing profiles should be added to workflows or docs:

- `npm run validate:quick`
- `npm run validate:source-contracts`
- `npm run typecheck`
- `npm run check:rust`
- `npm run preflight:frontend-build`
- `npm run preflight:tauri-package`
- `npm run test:contract-reports`
- `npm run check:tauri-rust-local` for local/manual proof only.

`validate_script_profiles.mjs` enforces this small npm script surface so old placeholder aliases do not come back.

## Diagnostic report scripts

`run_contract_reports.mjs` calls these report scripts directly as non-blocking diagnostics:

- `run_frontend_backend_contract_report.mjs`
- `run_worker_contract_report.mjs`
- `run_rust_module_linkage_report.mjs`
- `run_ui_binding_consistency_report.mjs`
- `run_action_binding_report.mjs`

Diagnostic reports may warn without failing CI. CI blocking is handled by explicit source validators, frontend typecheck/build, and the Rust/Tauri source guard.

## Retired scripts

Some older scripts were reduced to one-line stubs because they no longer have npm entries and are not part of the active CI gate. They should not be reintroduced without adding an explicit package script and CI reason.

Examples retired during cleanup include older architecture, policy, settings, runtime-flow, audio-studio, helper-bridge, voice-capture, and UI-reference validators.
