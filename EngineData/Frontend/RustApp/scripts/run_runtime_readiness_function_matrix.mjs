import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendFailureDetails, buildReportDir, markdownCell, scenarioResult, summarizeResults, writeJsonAndMarkdown } from "./functional_matrix_utils.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = buildReportDir(repoRoot);
const manifestPath = resolve(appRoot, "scripts", "fixtures", "runtime_readiness_function_scenarios.json");

function mapReadiness(snapshot) {
  if (snapshot.checking) return { readiness: "checking", canTranslateText: false, canRecordVoice: false, blockers: [], nextAction: "wait" };
  const blockers = [];
  if (!snapshot.modelsReady) blockers.push("models");
  if (!snapshot.helperReady) blockers.push("helper");
  if (!snapshot.providerReady) blockers.push("provider");
  if (!snapshot.microphoneReady) blockers.push("microphone");
  const canTranslateText = Boolean(snapshot.textReady && snapshot.modelsReady);
  const canRecordVoice = Boolean(canTranslateText && snapshot.helperReady && snapshot.providerReady && snapshot.microphoneReady);
  let readiness = "ready";
  if (!canTranslateText) readiness = "blocked";
  else if (!canRecordVoice || blockers.length) readiness = "partial";
  let nextAction = "translate";
  if (blockers.includes("models")) nextAction = "setup_models";
  else if (blockers.includes("helper")) nextAction = "start_helper";
  else if (blockers.includes("microphone")) nextAction = "check_microphone";
  return { readiness, canTranslateText, canRecordVoice, blockers, nextAction };
}

function runScenario(scenario) {
  const started = Date.now();
  const actual = mapReadiness(scenario.snapshot);
  const expected = scenario.expected;
  const checks = [
    { id: "readiness_matches", ok: actual.readiness === expected.readiness, detail: `${actual.readiness} expected ${expected.readiness}` },
    { id: "can_translate_matches", ok: actual.canTranslateText === expected.canTranslateText, detail: `${actual.canTranslateText} expected ${expected.canTranslateText}` },
    { id: "can_record_matches", ok: actual.canRecordVoice === expected.canRecordVoice, detail: `${actual.canRecordVoice} expected ${expected.canRecordVoice}` },
    { id: "next_action_matches", ok: actual.nextAction === expected.nextAction, detail: `${actual.nextAction} expected ${expected.nextAction}` },
    { id: "blockers_cover_expected", ok: expected.required_blockers.every((blocker) => actual.blockers.includes(blocker)), detail: `actual=${actual.blockers.join(",") || "none"}` },
  ];
  return scenarioResult({ scenario, started, checks, output: { actual, expected, snapshot: scenario.snapshot } });
}

const startedAt = new Date();
const scenarios = JSON.parse(readFileSync(manifestPath, "utf8"));
const results = scenarios.map(runScenario);
const report = summarizeResults({ schema: "translateit.runtime_readiness_function_matrix.v1", mode: "diagnostic-runtime-readiness-scenarios", note: "Deterministic functional readiness scenarios for text, helper, provider, microphone, models, and checking states.", startedAt, results });
const failures = results.filter((result) => !result.ok);
const lines = [
  "# TranslateIT Runtime Readiness Functional Matrix",
  "",
  `Generated: ${report.generated_at}`,
  `Mode: ${report.mode}`,
  `Total: ${report.total}`,
  `Passed: ${report.passed}`,
  `Failed: ${report.failed}`,
  "",
  "| Status | Scenario | Readiness | Text | Voice | Next Action | Blockers |",
  "|---|---|---|---:|---:|---|---|",
  ...results.map((result) => `| ${result.ok ? "PASS" : "FAIL"} | ${markdownCell(result.title)} | ${markdownCell(result.actual.readiness)} | ${result.actual.canTranslateText ? "yes" : "no"} | ${result.actual.canRecordVoice ? "yes" : "no"} | ${markdownCell(result.actual.nextAction)} | ${markdownCell(result.actual.blockers.join(", ") || "none")} |`),
];
appendFailureDetails(lines, failures);
writeJsonAndMarkdown({ reportDir, jsonName: "latest-runtime-readiness-function-matrix.json", markdownName: "latest-runtime-readiness-function-matrix.md", report, markdownLines: lines });
console.log("Runtime readiness functional matrix summary:");
console.log(JSON.stringify({ ...report, results: results.map(({ checks, ...result }) => result) }, null, 2));
if (failures.length) process.exit(1);
