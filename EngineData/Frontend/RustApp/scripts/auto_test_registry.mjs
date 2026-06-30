export const AUTO_TEST_REPORT_SCHEMA = "translateit.auto_test_matrix.v1";

export const AUTO_TEST_REPORT_DIR = ["UserData", "LogData", "RuntimeTestReports"];

export const AUTO_TEST_SUITES = [
  {
    id: "source-contracts",
    title: "Source Contract Guards",
    description: "Fast source-only validators that protect frontend, runtime bridge, command registry, and app shell contracts.",
    blocking: true,
    tests: [
      {
        id: "script-profiles",
        title: "Script profiles",
        script: "validate_script_profiles.mjs",
        purpose: "Keeps npm profiles explicit and prevents placeholder/local-only scripts from leaking into CI.",
      },
      {
        id: "imports",
        title: "Frontend imports",
        script: "validate_frontend_import_integrity.mjs",
        purpose: "Detects broken or forbidden frontend import paths before TypeScript build.",
      },
      {
        id: "file-naming",
        title: "File naming policy",
        script: "validate_file_naming_policy.mjs",
        purpose: "Protects repository naming rules and path conventions.",
      },
      {
        id: "translation-flow",
        title: "Translation flow integrity",
        script: "validate_translation_flow_integrity.mjs",
        purpose: "Ensures the user-facing translation path remains connected to the runtime bridge.",
      },
      {
        id: "runtime-ux-depth",
        title: "Runtime UX depth",
        script: "validate_runtime_ux_depth_integrity.mjs",
        purpose: "Ensures runtime state is surfaced as product UI, not only raw diagnostics.",
      },
      {
        id: "simple-ui",
        title: "Simple UI contract",
        script: "validate_simple_ui_contract.mjs",
        purpose: "Protects the one-screen translate workspace, setup controls, and diagnostics escape hatch.",
      },
      {
        id: "functional-surface",
        title: "Functional surface contract",
        script: "validate_functional_surface_contract.mjs",
        purpose: "Maps rendered DOM IDs, controller bindings, runtime facade calls, and Rust command registrations.",
      },
      {
        id: "runtime-readiness-scenarios",
        title: "Runtime readiness scenarios",
        script: "validate_runtime_readiness_scenarios.mjs",
        purpose: "Covers ready, partial, blocked, and checking runtime states with user-facing blockers.",
      },
      {
        id: "error-feedback",
        title: "Error feedback contract",
        script: "validate_error_feedback_contract.mjs",
        purpose: "Ensures failures use inline notices, safe rendering, and reset loading state correctly.",
      },
      {
        id: "settings-surface",
        title: "Settings surface contract",
        script: "validate_settings_surface_contract.mjs",
        purpose: "Protects generated settings tabs, renderers, actions, persistence, and developer diagnostics.",
      },
      {
        id: "startup-readiness",
        title: "Startup readiness",
        script: "validate_startup_runtime_readiness.mjs",
        purpose: "Checks startup readiness flow and runtime warmup expectations.",
      },
      {
        id: "ci-scope",
        title: "V1 CI scope",
        script: "validate_v1_advance_ci_scope.mjs",
        purpose: "Prevents CI scope drift outside the intended V1 Advance guardrails.",
      },
      {
        id: "virtual-route",
        title: "Virtual route contract",
        script: "validate_virtual_route_contract.mjs",
        purpose: "Protects virtual audio route command and UI contract boundaries.",
      },
    ],
  },
  {
    id: "preflight",
    title: "Source Preflight Guards",
    description: "Lightweight preflight checks that do not require running the desktop app.",
    blocking: true,
    tests: [
      {
        id: "rust-manifest",
        title: "Rust manifest preflight",
        script: "validate_rust_manifest_preflight.mjs",
        purpose: "Checks Rust/Tauri source registration and manifest-level consistency without local cargo build.",
      },
      {
        id: "frontend-build-preflight",
        title: "Frontend build preflight",
        script: "validate_frontend_build_preflight.mjs",
        purpose: "Checks that frontend build inputs and package wiring are present before Vite build.",
      },
      {
        id: "tauri-package-preflight",
        title: "Tauri package preflight",
        script: "validate_tauri_package_preflight.mjs",
        purpose: "Checks Tauri package configuration and build script expectations.",
      },
    ],
  },
  {
    id: "diagnostic-reports",
    title: "Diagnostic Contract Reports",
    description: "Non-blocking evidence generators that produce deeper maps for debugging and review.",
    blocking: false,
    tests: [
      {
        id: "contract-reports-runner",
        title: "Contract reports runner",
        script: "run_contract_reports.mjs",
        purpose: "Runs frontend/backend, worker, Rust linkage, UI binding, and action binding diagnostic reports.",
      },
      {
        id: "frontend-backend-contract-report",
        title: "Frontend/backend contract report",
        script: "run_frontend_backend_contract_report.mjs",
        purpose: "Produces a report mapping frontend bridge calls to backend command surfaces.",
      },
      {
        id: "worker-contract-report",
        title: "Worker contract report",
        script: "run_worker_contract_report.mjs",
        purpose: "Produces helper worker contract diagnostics.",
      },
      {
        id: "rust-linkage-report",
        title: "Rust linkage report",
        script: "run_rust_module_linkage_report.mjs",
        purpose: "Produces Rust command/module linkage diagnostics.",
      },
      {
        id: "ui-binding-report",
        title: "UI binding consistency report",
        script: "run_ui_binding_consistency_report.mjs",
        purpose: "Produces DOM binding diagnostics for rendered IDs versus controller/renderer selectors.",
      },
      {
        id: "action-binding-report",
        title: "Action binding report",
        script: "run_action_binding_report.mjs",
        purpose: "Produces user action to handler binding diagnostics.",
      },
    ],
  },
];

export function flattenAutoTests() {
  return AUTO_TEST_SUITES.flatMap((suite) =>
    suite.tests.map((test) => ({
      ...test,
      suite_id: suite.id,
      suite_title: suite.title,
      blocking: suite.blocking,
    })),
  );
}
