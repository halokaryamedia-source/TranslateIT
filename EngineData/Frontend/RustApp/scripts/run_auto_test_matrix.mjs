import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { AUTO_TEST_REPORT_DIR, AUTO_TEST_REPORT_SCHEMA, AUTO_TEST_SUITES, flattenAutoTests } from "./auto_test_registry.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, ...AUTO_TEST_REPORT_DIR);
const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const includeDiagnostics = !args.has("--skip-diagnostics");
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice(7).split(",").map((item) => item.trim()).filter(Boolean)) : null;

const DEFAULT_OWNER = "TranslateIT maintainers";
const AREA_BY_SUITE = {
  "source-contracts": "source contract guard",
  preflight: "source preflight",
  "functional-app-diagnostics": "functional app diagnostics",
  "diagnostic-reports": "diagnostic report",
};
const AREA_BY_ID = {
  "script-profiles": "npm validation profiles",
  imports: "frontend imports",
  "file-naming": "repository conventions",
  "translation-flow": "product translation workflow",
  "runtime-ux-depth": "runtime readiness UX",
  "simple-ui": "main product UI",
  "functional-surface": "UI-to-engine wiring",
  "runtime-readiness-scenarios": "runtime readiness scenarios",
  "error-feedback": "user-facing failure feedback",
  "settings-surface": "settings surface",
  "auto-test-matrix-contract": "auto test infrastructure",
  "startup-readiness": "startup readiness flow",
  "virtual-route": "virtual audio routing contract",
  "rust-manifest": "Rust/Tauri source registration",
  "frontend-build-preflight": "frontend build inputs",
  "tauri-package-preflight": "Tauri package inputs",
  "voice-fixture-matrix": "voice/audio fixture diagnostics",
  "contract-reports-runner": "diagnostic report orchestration",
  "frontend-backend-contract-report": "frontend/backend diagnostics",
  "worker-contract-report": "helper worker diagnostics",
  "rust-linkage-report": "Rust linkage diagnostics",
  "ui-binding-report": "DOM binding diagnostics",
  "action-binding-report": "user action diagnostics",
};
const EXTRA_FILES_BY_ID = {
  "script-profiles": ["EngineData/Frontend/RustApp/package.json"],
  "auto-test-matrix-contract": ["EngineData/Frontend/RustApp/package.json", "EngineData/Frontend/RustApp/scripts/auto_test_registry.mjs", "EngineData/Frontend/RustApp/scripts/run_auto_test_matrix.mjs", ".gitignore"],
  "simple-ui": ["EngineData/Frontend/RustApp/src/app/active-launcher/lockedReferenceShellParts.ts", "EngineData/Frontend/RustApp/src/mainPageLayout.css"],
  "functional-surface": ["EngineData/Frontend/RustApp/src/app/simple-launcher/SimpleLauncherController.ts", "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts"],
  "runtime-readiness-scenarios": ["EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts", "EngineData/Frontend/RustApp/src/app/simple-launcher/SimpleLauncherController.ts"],
  "error-feedback": ["EngineData/Frontend/RustApp/src/app/simple-launcher/SimpleLauncherController.ts"],
  "settings-surface": ["EngineData/Frontend/RustApp/src/app/simple-launcher/SimpleLauncherController.ts"],
  "voice-fixture-matrix": ["EngineData/Frontend/RustApp/scripts/run_voice_fixture_matrix.mjs", "EngineData/Frontend/RustApp/scripts/fixtures/voice_scenarios.json"],
};

function shouldRun(test) {
  if (!includeDiagnostics && !test.blocking) return false;
  if (!only) return true;
  return only.has(test.id) || only.has(test.suite_id);
}

function tailOutput(text, limit = 4000) {
  const value = text ?? "";
  return value.length > limit ? `... truncated\n${value.slice(value.length - limit)}` : value;
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
}

function enrichTest(test) {
  const checkedFiles = test.checked_files?.length
    ? test.checked_files
    : [`EngineData/Frontend/RustApp/scripts/${test.script}`, ...(EXTRA_FILES_BY_ID[test.id] ?? [])];

  return {
    area: test.area ?? AREA_BY_ID[test.id] ?? AREA_BY_SUITE[test.suite_id] ?? "source contract",
    suggested_owner: test.owner ?? DEFAULT_OWNER,
    checked_files: Array.from(new Set(checkedFiles)),
    failure_help: test.failure_help ?? `Open ${test.script}, read the failing marker, then fix source drift or make the validator less brittle without removing the contract.`,
  };
}

function extractFailureMarkers(stdout, stderr, limit = 8) {
  return [...tailOutput(stderr, 2000).split(/\r?\n/), ...tailOutput(stdout, 2000).split(/\r?\n/)]
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || /^Error[:\s]/i.test(line) || /failed|missing|invalid|unexpected/i.test(line))
    .slice(0, limit);
}

function runTest(test) {
  const metadata = enrichTest(test);
  const scriptPath = resolve(appRoot, "scripts", test.script);
  if (!existsSync(scriptPath)) {
    return { ...test, ...metadata, status: "missing", ok: false, exit_code: null, duration_ms: 0, stdout: "", stderr: `Missing script: ${test.script}`, failure_markers: [`Missing script: ${test.script}`] };
  }
  if (!shouldRun(test)) {
    return { ...test, ...metadata, status: "skipped", ok: true, exit_code: null, duration_ms: 0, stdout: "", stderr: "", failure_markers: [] };
  }
  const started = Date.now();
  const result = spawnSync(process.execPath, [scriptPath], { cwd: appRoot, encoding: "utf8", maxBuffer: 4_000_000 });
  const ok = result.status === 0;
  const stdout = tailOutput(result.stdout);
  const stderr = tailOutput(result.stderr);
  return {
    ...test,
    ...metadata,
    status: ok ? "passed" : test.blocking ? "failed" : "warning",
    ok,
    exit_code: result.status,
    duration_ms: Date.now() - started,
    stdout,
    stderr,
    failure_markers: ok ? [] : extractFailureMarkers(stdout, stderr),
  };
}

function countByStatus(results) {
  return results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] ?? 0) + 1;
    return acc;
  }, { passed: 0, failed: 0, warning: 0, missing: 0, skipped: 0 });
}

function statusLabel(result) {
  if (result.status === "passed") return "PASS";
  if (result.status === "warning") return "WARN";
  if (result.status === "skipped") return "SKIP";
  if (result.status === "missing") return "MISSING";
  return "FAIL";
}

function renderFailureDetails(results) {
  const failures = results.filter((result) => !result.ok && result.status !== "skipped");
  if (!failures.length) return ["none"];

  return failures.flatMap((result) => [
    `### ${statusLabel(result)} - ${result.title}`,
    "",
    `- Suite: ${result.suite_title}`,
    `- Test ID: ${result.id}`,
    `- Blocking: ${result.blocking ? "yes" : "no"}`,
    `- Area: ${result.area}`,
    `- Suggested owner: ${result.suggested_owner}`,
    `- Script: ${result.script}`,
    `- Checked files: ${result.checked_files.join(", ") || "none listed"}`,
    `- Suggested next step: ${result.failure_help}`,
    "",
    "Failing markers:",
    result.failure_markers.length ? result.failure_markers.map((marker) => `- ${marker}`).join("\n") : "- No concise marker found. Read stdout/stderr tail below.",
    "",
    "stderr tail:",
    "```text",
    result.stderr || "(empty)",
    "```",
    "",
    "stdout tail:",
    "```text",
    result.stdout || "(empty)",
    "```",
    "",
  ]);
}

mkdirSync(reportDir, { recursive: true });
const startedAt = new Date();
const results = flattenAutoTests().map(runTest);
const finishedAt = new Date();
const criticalFailures = results.filter((result) => result.blocking && !result.ok && result.status !== "skipped");
const diagnosticWarnings = results.filter((result) => !result.blocking && !result.ok && result.status !== "skipped");
const missingScripts = results.filter((result) => result.status === "missing");
const counts = countByStatus(results);
const suiteSummaries = AUTO_TEST_SUITES.map((suite) => {
  const suiteResults = results.filter((result) => result.suite_id === suite.id);
  return {
    id: suite.id,
    title: suite.title,
    blocking: suite.blocking,
    total: suiteResults.length,
    failed: suiteResults.filter((result) => result.blocking && !result.ok && result.status !== "skipped").length,
    warnings: suiteResults.filter((result) => !result.blocking && !result.ok && result.status !== "skipped").length,
    skipped: suiteResults.filter((result) => result.status === "skipped").length,
  };
});

const summaryResults = results.map((result) => ({
  suite_id: result.suite_id,
  suite_title: result.suite_title,
  id: result.id,
  title: result.title,
  script: result.script,
  blocking: result.blocking,
  status: result.status,
  ok: result.ok,
  exit_code: result.exit_code,
  duration_ms: result.duration_ms,
  purpose: result.purpose,
  area: result.area,
  suggested_owner: result.suggested_owner,
  checked_files: result.checked_files,
  failure_help: result.failure_help,
  failure_markers: result.failure_markers,
  stdout_tail: result.stdout,
  stderr_tail: result.stderr,
}));

const summary = {
  schema: AUTO_TEST_REPORT_SCHEMA,
  generated_at: finishedAt.toISOString(),
  started_at: startedAt.toISOString(),
  duration_ms: finishedAt.getTime() - startedAt.getTime(),
  mode: strict ? "strict" : "non-blocking",
  ci_blocking: strict,
  critical_ok: criticalFailures.length === 0,
  diagnostics_ok: diagnosticWarnings.length === 0,
  matrix_ok: criticalFailures.length === 0 && missingScripts.length === 0,
  counts,
  critical_failures: criticalFailures.map((result) => result.id),
  diagnostic_warnings: diagnosticWarnings.map((result) => result.id),
  missing_scripts: missingScripts.map((result) => result.script),
  suites: suiteSummaries,
  results: summaryResults.map(({ stdout_tail, stderr_tail, ...result }) => result),
};

writeFileSync(resolve(reportDir, "latest-auto-test-matrix.json"), JSON.stringify({ ...summary, detailed_results: summaryResults }, null, 2));
writeFileSync(resolve(reportDir, "latest-auto-test-matrix.md"), [
  "# TranslateIT Auto Test Matrix",
  "",
  `Schema: ${summary.schema}`,
  `Generated: ${summary.generated_at}`,
  `Mode: ${summary.mode}`,
  `CI blocking: ${summary.ci_blocking}`,
  `Critical OK: ${summary.critical_ok}`,
  `Diagnostics OK: ${summary.diagnostics_ok}`,
  `Matrix OK: ${summary.matrix_ok}`,
  "",
  "## Counts",
  "",
  `- Passed: ${counts.passed}`,
  `- Failed: ${counts.failed}`,
  `- Warnings: ${counts.warning}`,
  `- Missing: ${counts.missing}`,
  `- Skipped: ${counts.skipped}`,
  "",
  "## Suites",
  "",
  "| Suite | Blocking | Total | Failed | Warnings | Skipped |",
  "|---|---:|---:|---:|---:|---:|",
  ...suiteSummaries.map((suite) => `| ${markdownCell(suite.title)} | ${suite.blocking ? "yes" : "no"} | ${suite.total} | ${suite.failed} | ${suite.warnings} | ${suite.skipped} |`),
  "",
  "## Test Results",
  "",
  "| Status | Blocking | Suite | Test | Area | Suggested owner | Checked files | Purpose |",
  "|---|---:|---|---|---|---|---|---|",
  ...results.map((result) => `| ${statusLabel(result)} | ${result.blocking ? "yes" : "no"} | ${markdownCell(result.suite_title)} | ${markdownCell(result.title)} | ${markdownCell(result.area)} | ${markdownCell(result.suggested_owner)} | ${markdownCell(result.checked_files.join(", "))} | ${markdownCell(result.purpose)} |`),
  "",
  "## Failure Details",
  "",
  ...renderFailureDetails(results),
  "",
  "## Critical Failures",
  "",
  criticalFailures.length ? criticalFailures.map((result) => `- ${result.id}`).join("\n") : "none",
  "",
  "## Diagnostic Warnings",
  "",
  diagnosticWarnings.length ? diagnosticWarnings.map((result) => `- ${result.id}`).join("\n") : "none",
  "",
  "## Missing Scripts",
  "",
  missingScripts.length ? missingScripts.map((result) => `- ${result.script}`).join("\n") : "none",
  "",
].join("\n"));

console.log("Auto test matrix summary:");
console.log(JSON.stringify(summary, null, 2));

if (strict && (criticalFailures.length > 0 || missingScripts.length > 0)) process.exit(1);
