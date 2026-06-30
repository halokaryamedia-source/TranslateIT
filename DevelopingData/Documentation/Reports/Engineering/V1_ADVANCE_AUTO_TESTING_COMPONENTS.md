# V1 Advance Auto Testing Components

This note tracks the auto testing registry, shared validator helpers, matrix runner, and CI diagnostics for V1 Advance.

## Files

- `EngineData/Frontend/RustApp/scripts/auto_test_registry.mjs`
  - Single source of truth for registered auto-test suites.
  - Keeps blocking source/preflight guards separate from non-blocking diagnostic reports.
- `EngineData/Frontend/RustApp/scripts/contract_test_utils.mjs`
  - Shared source-contract helper for reading files, collecting errors, checking markers, and printing consistent failures.
  - Added to reduce copy-paste as more validators are split into component-based checks.
- `EngineData/Frontend/RustApp/scripts/run_auto_test_matrix.mjs`
  - Runs registered tests in non-blocking or strict mode.
  - Writes JSON and Markdown reports to `UserData/LogData/RuntimeTestReports`.
  - Report now includes suite, test id, status, blocking mode, purpose, area, suggested owner, checked files, failure markers, and stdout/stderr tail.
- `EngineData/Frontend/RustApp/scripts/validate_auto_test_matrix_contract.mjs`
  - Self-checks registry, runner, helper, package scripts, registered script existence, and CI diagnostics wiring.

## NPM profiles

- `test:auto-map`
  - Runs the matrix in report-first mode.
  - Intended for CI diagnostics and developer mapping, not as the final strict gate.
- `test:auto-strict`
  - Runs the same matrix in strict mode.
  - Intended for later stabilization once the auto-test layer is mature.

## CI behavior

- CI has an explicit `Validate auto test matrix contract` step.
- CI still runs `Generate auto test matrix diagnostics` with `if: always()` so report artifacts are produced even when earlier guards fail.
- Diagnostic artifacts are uploaded under `v1-advance-source-contract-diagnostics` from `UserData/LogData/RuntimeTestReports/**`.

## Current direction

The auto-test layer should stay product-workflow focused. Validators should help developers locate source drift before manual/local app testing by pointing to the affected area, checked files, likely owner, and failure marker. UI validators should protect the simple product-first Translate page rather than encouraging a complex debug dashboard.
