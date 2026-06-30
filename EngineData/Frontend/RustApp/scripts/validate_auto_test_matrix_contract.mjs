import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTO_TEST_SUITES, flattenAutoTests } from "./auto_test_registry.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const errors = [];

function read(path) {
  const absolutePath = resolve(repoRoot, path);
  if (!existsSync(absolutePath)) {
    errors.push(`Missing file: ${path}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function expect(source, marker, label) {
  if (!source.includes(marker)) errors.push(`${label}: missing ${marker}`);
}

const packageJson = read("EngineData/Frontend/RustApp/package.json");
const workflow = read(".github/workflows/v1-advance-ci.yml");
const runner = read("EngineData/Frontend/RustApp/scripts/run_auto_test_matrix.mjs");
const registry = read("EngineData/Frontend/RustApp/scripts/auto_test_registry.mjs");

for (const marker of ["test:auto-map", "run_auto_test_matrix.mjs", "test:auto-strict", "--strict"]) {
  expect(packageJson, marker, "package auto test scripts");
}

for (const marker of ["Generate auto test matrix diagnostics", "if: always()", "npm run test:auto-map", "v1-advance-source-contract-diagnostics", "UserData/LogData/RuntimeTestReports/**"]) {
  expect(workflow, marker, "workflow auto test diagnostics");
}

for (const marker of ["AUTO_TEST_SUITES", "blocking: true", "blocking: false", "flattenAutoTests"]) {
  expect(registry, marker, "auto test registry");
}

for (const marker of ["latest-auto-test-matrix.json", "latest-auto-test-matrix.md", "critical_failures", "diagnostic_warnings", "process.exit(1)"]) {
  expect(runner, marker, "auto test runner");
}

const suites = AUTO_TEST_SUITES.map((suite) => suite.id);
for (const requiredSuite of ["source-contracts", "preflight", "diagnostic-reports"]) {
  if (!suites.includes(requiredSuite)) errors.push(`Missing auto test suite: ${requiredSuite}`);
}

const tests = flattenAutoTests();
const duplicateIds = tests.map((test) => test.id).filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicateIds.length) errors.push(`Duplicate auto test ids: ${Array.from(new Set(duplicateIds)).join(", ")}`);

for (const test of tests) {
  const scriptPath = resolve(appRoot, "scripts", test.script);
  if (!existsSync(scriptPath)) errors.push(`Registry references missing script: ${test.id} -> ${test.script}`);
  if (!test.purpose || test.purpose.trim().length < 12) errors.push(`Registry test needs purpose: ${test.id}`);
}

if (!tests.some((test) => test.blocking)) errors.push("Auto test matrix must include blocking tests.");
if (!tests.some((test) => !test.blocking)) errors.push("Auto test matrix must include non-blocking diagnostics.");

if (errors.length) {
  console.error("Auto test matrix contract failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Auto test matrix contract passed: ${AUTO_TEST_SUITES.length} suites and ${tests.length} tests are registered, scripted, and wired to CI diagnostics.`);
