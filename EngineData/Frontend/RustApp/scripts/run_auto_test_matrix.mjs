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

function shouldRun(test) {
  if (!includeDiagnostics && !test.blocking) return false;
  if (!only) return true;
  return only.has(test.id) || only.has(test.suite_id);
}

function trimOutput(text, limit = 6000) {
  const value = text ?? "";
  return value.length > limit ? `${value.slice(0, limit)}\n... truncated` : value;
}

function runTest(test) {
  const scriptPath = resolve(appRoot, "scripts", test.script);
  if (!existsSync(scriptPath)) {
    return { ...test, status: "missing", ok: false, exit_code: null, duration_ms: 0, stdout: "", stderr: `Missing script: ${test.script}` };
  }
  if (!shouldRun(test)) {
    return { ...test, status: "skipped", ok: true, exit_code: null, duration_ms: 0, stdout: "", stderr: "" };
  }
  const started = Date.now();
  const result = spawnSync(process.execPath, [scriptPath], { cwd: appRoot, encoding: "utf8", maxBuffer: 4_000_000 });
  const ok = result.status === 0;
  return {
    ...test,
    status: ok ? "passed" : test.blocking ? "failed" : "warning",
    ok,
    exit_code: result.status,
    duration_ms: Date.now() - started,
    stdout: trimOutput(result.stdout),
    stderr: trimOutput(result.stderr),
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
  results: results.map((result) => ({
    suite_id: result.suite_id,
    id: result.id,
    title: result.title,
    script: result.script,
    blocking: result.blocking,
    status: result.status,
    ok: result.ok,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    purpose: result.purpose,
  })),
};

writeFileSync(resolve(reportDir, "latest-auto-test-matrix.json"), JSON.stringify({ ...summary, detailed_results: results }, null, 2));
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
  ...suiteSummaries.map((suite) => `| ${suite.title} | ${suite.blocking ? "yes" : "no"} | ${suite.total} | ${suite.failed} | ${suite.warnings} | ${suite.skipped} |`),
  "",
  "## Test Results",
  "",
  "| Status | Suite | Test | Script | Purpose |",
  "|---|---|---|---|---|",
  ...results.map((result) => `| ${statusLabel(result)} | ${result.suite_title} | ${result.title} | ${result.script} | ${result.purpose.replace(/\|/g, "/")} |`),
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
