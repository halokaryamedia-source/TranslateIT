# V1 Advance Auto Testing Components

This note tracks the auto testing registry, shared validator helpers, matrix runner, functional diagnostics, and CI diagnostics for V1 Advance.

## Files

- `EngineData/Frontend/RustApp/scripts/auto_test_registry.mjs`
  - Single source of truth for registered auto-test suites.
  - Keeps blocking source/preflight guards separate from non-blocking diagnostic and functional app reports.
- `EngineData/Frontend/RustApp/scripts/contract_test_utils.mjs`
  - Shared source-contract helper for reading files, collecting errors, checking markers, and printing consistent failures.
  - Added to reduce copy-paste as more validators are split into component-based checks.
- `EngineData/Frontend/RustApp/scripts/functional_matrix_utils.mjs`
  - Shared helper for deterministic functional scenario reports.
  - Provides text normalization, keyword matching, JSON/Markdown writing, failure detail rendering, and result summarization.
- `EngineData/Frontend/RustApp/scripts/run_auto_test_matrix.mjs`
  - Runs registered tests in non-blocking or strict mode.
  - Writes JSON and Markdown reports to `UserData/LogData/RuntimeTestReports`.
  - Report now includes suite, test id, status, blocking mode, purpose, area, suggested owner, checked files, failure markers, and stdout/stderr tail.
- `EngineData/Frontend/RustApp/scripts/validate_auto_test_matrix_contract.mjs`
  - Self-checks registry, runner, helpers, package scripts, registered script existence, functional diagnostics, and CI diagnostics wiring.

## Functional app diagnostic manifests

- `EngineData/Frontend/RustApp/scripts/fixtures/text_translation_scenarios.json`
  - Defines deterministic text translation, empty input, and oversized input scenarios.
- `EngineData/Frontend/RustApp/scripts/fixtures/runtime_readiness_function_scenarios.json`
  - Defines ready, partial text-only, blocked models, blocked microphone, and checking/loading runtime states.
- `EngineData/Frontend/RustApp/scripts/fixtures/error_recovery_scenarios.json`
  - Defines translation, helper, voice, attachment, and settings failure recovery expectations.
- `EngineData/Frontend/RustApp/scripts/fixtures/voice_scenarios.json`
  - Defines automatic voice fixture scenarios for generated audio testing.
  - Includes Indonesian, English, and silent-input guard scenarios.

## Functional app diagnostic runners

- `EngineData/Frontend/RustApp/scripts/run_text_translation_function_matrix.mjs`
  - Writes `latest-text-translation-function-matrix.json` and `latest-text-translation-function-matrix.md`.
  - Covers text translation happy paths and pre-engine guards.
- `EngineData/Frontend/RustApp/scripts/run_runtime_readiness_function_matrix.mjs`
  - Writes `latest-runtime-readiness-function-matrix.json` and `latest-runtime-readiness-function-matrix.md`.
  - Covers text readiness, voice readiness, setup blockers, and checking/loading states.
- `EngineData/Frontend/RustApp/scripts/run_error_recovery_matrix.mjs`
  - Writes `latest-error-recovery-matrix.json` and `latest-error-recovery-matrix.md`.
  - Covers inline feedback, recovery action, loading reset, safe rendering, and no raw dialog fallback.
- `EngineData/Frontend/RustApp/scripts/run_runtime_command_sync_matrix.mjs`
  - Writes `latest-runtime-command-sync-matrix.json` and `latest-runtime-command-sync-matrix.md`.
  - Maps frontend `runtimeApi` command invocations to Rust/Tauri registry exposure.
- `EngineData/Frontend/RustApp/scripts/run_voice_fixture_matrix.mjs`
  - Generates deterministic `.wav` fixtures during test execution.
  - Simulates transcript output from scenario text so CI does not need a real microphone.
  - Writes `latest-voice-fixture-matrix.json` and `latest-voice-fixture-matrix.md`.

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

## Functional app diagnostics

The `functional-app-diagnostics` suite now includes:

- `text-translation-function-matrix`
- `runtime-readiness-function-matrix`
- `error-recovery-matrix`
- `runtime-command-sync-matrix`
- `voice-fixture-matrix`

Current behavior:

- Functional app diagnostics are non-blocking first so they can mature without destabilizing CI.
- The voice runner creates generated `.wav` files under `UserData/LogData/RuntimeTestReports/generated-audio-fixtures`.
- The text, readiness, error, and voice runners use deterministic simulation before being connected to real live engine commands.
- The runtime command sync runner reads source files and reports drift between frontend command usage and Rust command registration.
- Real ASR fixture tests can be added later as a separate non-blocking diagnostic once engine/model availability is stable.

## Current direction

The auto-test layer should stay product-workflow focused. Validators should help developers locate source drift before manual/local app testing by pointing to the affected area, checked files, likely owner, and failure marker. UI validators should protect the simple product-first Translate page rather than encouraging a complex debug dashboard. Functional diagnostics should reduce repeated QA time by simulating user flows such as speaking, translating, runtime setup, command wiring, and error recovery before real manual testing.
