import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendFailureDetails, buildReportDir, containsAllKeywords, markdownCell, normalizeText, scenarioResult, summarizeResults, writeJsonAndMarkdown } from "./functional_matrix_utils.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = buildReportDir(repoRoot);
const manifestPath = resolve(appRoot, "scripts", "fixtures", "text_translation_scenarios.json");
const MAX_TEXT_LENGTH = 5000;
const DICTIONARY = new Map([
  ["id->en::halo dunia", "hello world"],
  ["en->id::hello world", "halo dunia"],
]);

function scenarioInput(scenario) {
  if (scenario.input_repeat) return scenario.input_repeat.token.repeat(scenario.input_repeat.count);
  return scenario.input ?? "";
}

function simulateTextTranslate(scenario) {
  const input = scenarioInput(scenario);
  const normalized = normalizeText(input);
  if (!normalized) return { status: "rejected", output: "Please enter text before translating.", command_called: false };
  if (input.length > MAX_TEXT_LENGTH) return { status: "rejected", output: "Input text is too long. Please shorten it before translating.", command_called: false };
  const key = `${scenario.source_language}->${scenario.target_language}::${normalized}`;
  return { status: "translated", output: DICTIONARY.get(key) ?? normalized, command_called: true };
}

function runScenario(scenario) {
  const started = Date.now();
  const result = simulateTextTranslate(scenario);
  const checks = [
    { id: "scenario_has_id", ok: typeof scenario.id === "string" && scenario.id.length > 0, detail: scenario.id ?? "missing" },
    { id: "status_matches", ok: result.status === scenario.expect_status, detail: `${result.status} expected ${scenario.expect_status}` },
    { id: "keywords_match", ok: containsAllKeywords(result.output, scenario.expected_keywords), detail: result.output },
    { id: "engine_guard", ok: scenario.expect_status === "translated" ? result.command_called : !result.command_called, detail: `command_called=${result.command_called}` },
  ];
  return scenarioResult({ scenario, started, checks, output: { source_language: scenario.source_language, target_language: scenario.target_language, input_length: scenarioInput(scenario).length, result } });
}

const startedAt = new Date();
const scenarios = JSON.parse(readFileSync(manifestPath, "utf8"));
const results = scenarios.map(runScenario);
const report = summarizeResults({ schema: "translateit.text_translation_function_matrix.v1", mode: "diagnostic-deterministic-text-translation", note: "Deterministic functional scenario test for text translation and input guards. It does not call the live translation engine yet.", startedAt, results });
const failures = results.filter((result) => !result.ok);
const lines = [
  "# TranslateIT Text Translation Functional Matrix",
  "",
  `Generated: ${report.generated_at}`,
  `Mode: ${report.mode}`,
  `Total: ${report.total}`,
  `Passed: ${report.passed}`,
  `Failed: ${report.failed}`,
  "",
  "| Status | Scenario | Source | Target | Input Length | Result Status | Output |",
  "|---|---|---|---|---:|---|---|",
  ...results.map((result) => `| ${result.ok ? "PASS" : "FAIL"} | ${markdownCell(result.title)} | ${markdownCell(result.source_language)} | ${markdownCell(result.target_language)} | ${result.input_length} | ${markdownCell(result.result.status)} | ${markdownCell(result.result.output)} |`),
];
appendFailureDetails(lines, failures);
writeJsonAndMarkdown({ reportDir, jsonName: "latest-text-translation-function-matrix.json", markdownName: "latest-text-translation-function-matrix.md", report, markdownLines: lines });
console.log("Text translation functional matrix summary:");
console.log(JSON.stringify({ ...report, results: results.map(({ checks, ...result }) => result) }, null, 2));
if (failures.length) process.exit(1);
