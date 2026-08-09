import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTO_TEST_REPORT_DIR, AUTO_TEST_REPORT_SCHEMA, AUTO_TEST_SUITES, flattenAutoTests } from "./auto_test_registry.mjs";
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
const runner = readText("EngineData/Frontend/RustApp/scripts/run_auto_test_matrix.mjs");
const registry = readText("EngineData/Frontend/RustApp/scripts/auto_test_registry.mjs");
const helper = readText("EngineData/Frontend/RustApp/scripts/contract_test_utils.mjs");
const functionalHelper = readText("EngineData/Frontend/RustApp/scripts/functional_matrix_utils.mjs");
const gitignore = readText(".gitignore");

for (const marker of ["test:auto-map", "run_auto_test_matrix.mjs", "test:auto-strict", "--strict"]) {
  expectIncludes(packageJson, marker, "package auto test scripts");
}

for (const marker of ["AUTO_TEST_SUITES", "blocking: true", "blocking: false", "flattenAutoTests", AUTO_TEST_REPORT_SCHEMA, "functional-app-diagnostics", "voice-fixture-matrix", "runtime-command-sync-matrix"]) {
  expectIncludes(registry, marker, "auto test registry");
}

if (AUTO_TEST_REPORT_DIR.join("/") !== ".tmp/validation/RuntimeTestReports") {
  addError(`Developer test reports must stay under ignored .tmp/validation. Found: ${AUTO_TEST_REPORT_DIR.join("/")}`);
}
if (registry.includes("UserData")) {
  addError("Auto test registry must not route developer/source-validation output into UserData.");
}
expectIncludes(gitignore, "/.tmp/", "ignored temporary development output");

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
for (const marker of ["normalizeText", "writeJsonAndMarkdown", "scenarioResult", "summarizeResults"]) {
  expectIncludes(functionalHelper, marker, "functional matrix utilities");
}
expectRegex(helper, /export function\s+createContractValidator/, "contract test utility exports validator factory");
expectAnyIncludes(runner, ["AREA_BY_ID", "checked_files", "failure_help"], "runner developer-friendly metadata");

const suites = AUTO_TEST_SUITES.map((suite) => suite.id);
for (const requiredSuite of ["source-contracts", "preflight", "functional-app-diagnostics", "diagnostic-reports"]) {
  if (!suites.includes(requiredSuite)) addError(`Missing auto test suite: ${requiredSuite}`);
}

const requiredFunctionalTests = [
  "text-translation-function-matrix",
  "runtime-readiness-function-matrix",
  "error-recovery-matrix",
  "runtime-command-sync-matrix",
  "voice-fixture-matrix",
];
const tests = flattenAutoTests();
const testIds = tests.map((test) => test.id);
for (const requiredTest of requiredFunctionalTests) {
  if (!testIds.includes(requiredTest)) addError(`Missing functional app diagnostic: ${requiredTest}`);
}
if (testIds.includes("ci-scope")) addError("Auto test matrix must not retain the superseded V1 CI scope validator on New.");

const duplicateIds = testIds.filter((id, index, ids) => ids.indexOf(id) !== index);
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
  successMessage: `Auto test matrix contract passed: ${AUTO_TEST_SUITES.length} suites and ${tests.length} tests are registered, source-owned, and isolated from UserData/V1 CI authority.`,
});
