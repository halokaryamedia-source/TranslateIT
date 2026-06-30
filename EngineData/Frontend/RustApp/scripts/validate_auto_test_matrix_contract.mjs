import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTO_TEST_REPORT_SCHEMA, AUTO_TEST_SUITES, flattenAutoTests } from "./auto_test_registry.mjs";
import { createContractValidator, hasNonEmptyText, printContractResult } from "./contract_test_utils.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const {
  errors,
  addError,
  readText,
  ensureFileExists,
  expectIncludes,
  expectAnyIncludes,
  expectRegex,
} = createContractValidator({ rootDir: repoRoot });

const packageJson = readText("EngineData/Frontend/RustApp/package.json");
const workflow = readText(".github/workflows/v1-advance-ci.yml");
const runner = readText("EngineData/Frontend/RustApp/scripts/run_auto_test_matrix.mjs");
const registry = readText("EngineData/Frontend/RustApp/scripts/auto_test_registry.mjs");
const helper = readText("EngineData/Frontend/RustApp/scripts/contract_test_utils.mjs");

for (const marker of ["test:auto-map", "run_auto_test_matrix.mjs", "test:auto-strict", "--strict"]) {
  expectIncludes(packageJson, marker, "package auto test scripts");
}

for (const marker of ["Generate auto test matrix diagnostics", "if: always()", "npm run test:auto-map", "v1-advance-source-contract-diagnostics", "UserData/LogData/RuntimeTestReports/**", "Validate auto test matrix contract"]) {
  expectIncludes(workflow, marker, "workflow auto test diagnostics");
}

for (const marker of ["AUTO_TEST_SUITES", "blocking: true", "blocking: false", "flattenAutoTests", AUTO_TEST_REPORT_SCHEMA]) {
  expectIncludes(registry, marker, "auto test registry");
}

for (const marker of [
  "AUTO_TEST_REPORT_SCHEMA",
  "latest-auto-test-matrix.json",
  "latest-auto-test-matrix.md",
  "critical_failures",
  "diagnostic_warnings",
  "detailed_results",
  "Failure Details",
  "failure_markers",
  "stdout_tail",
  "stderr_tail",
  "checked_files",
  "suggested_owner",
  "process.exit(1)",
]) {
  expectIncludes(runner, marker, "auto test runner");
}

for (const marker of ["createContractValidator", "readText", "expectIncludes", "collectRegexMatches", "printContractResult"]) {
  expectIncludes(helper, marker, "shared contract test utilities");
}
expectRegex(helper, /export function\s+createContractValidator/, "contract test utility exports validator factory");
expectAnyIncludes(runner, ["AREA_BY_ID", "checked_files", "failure_help"], "runner developer-friendly metadata");

const suites = AUTO_TEST_SUITES.map((suite) => suite.id);
for (const requiredSuite of ["source-contracts", "preflight", "diagnostic-reports"]) {
  if (!suites.includes(requiredSuite)) addError(`Missing auto test suite: ${requiredSuite}`);
}

const tests = flattenAutoTests();
const duplicateIds = tests.map((test) => test.id).filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicateIds.length) addError(`Duplicate auto test ids: ${Array.from(new Set(duplicateIds)).join(", ")}`);

for (const test of tests) {
  if (!hasNonEmptyText(test.id, 3)) addError(`Registry test needs id: ${test.title ?? test.script ?? "unknown"}`);
  if (!hasNonEmptyText(test.title, 4)) addError(`Registry test needs title: ${test.id}`);
  if (!hasNonEmptyText(test.script, 4)) addError(`Registry test needs script: ${test.id}`);
  if (!hasNonEmptyText(test.purpose, 12)) addError(`Registry test needs purpose: ${test.id}`);
  ensureFileExists(`EngineData/Frontend/RustApp/scripts/${test.script}`, `Registry references missing script: ${test.id}`);
}

if (!tests.some((test) => test.blocking)) addError("Auto test matrix must include blocking tests.");
if (!tests.some((test) => !test.blocking)) addError("Auto test matrix must include non-blocking diagnostics.");

printContractResult({
  title: "Auto test matrix contract",
  errors,
  successMessage: `Auto test matrix contract passed: ${AUTO_TEST_SUITES.length} suites and ${tests.length} tests are registered, scripted, report-enriched, and wired to CI diagnostics.`,
});
