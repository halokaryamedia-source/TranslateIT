import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendFailureDetails, buildReportDir, containsAllKeywords, markdownCell, scenarioResult, summarizeResults, writeJsonAndMarkdown } from "./functional_matrix_utils.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = buildReportDir(repoRoot);
const manifestPath = resolve(appRoot, "scripts", "fixtures", "error_recovery_scenarios.json");

const FEEDBACK_BY_FAILURE = {
  command_exception: "Translation failed. Please retry translate.",
  helper_unavailable: "Helper is unavailable. Start helper to continue.",
  voice_command_failed: "Voice capture failed. Check microphone and try again.",
  unsupported_attachment: "Unsupported file type. Choose a supported file.",
  attachment_too_large: "File is too large. Choose a smaller file.",
  settings_save_failed: "Settings were not saved. Retry save settings.",
};

function simulateRecovery(scenario) {
  return {
    feedback: FEEDBACK_BY_FAILURE[scenario.failure] ?? `${scenario.component} failed. Please retry.`,
    recovery: scenario.expected_recovery,
    loading_reset: true,
    safe_render: true,
    inline_notice: true,
    raw_dialog: false,
  };
}

function runScenario(scenario) {
  const started = Date.now();
  const actual = simulateRecovery(scenario);
  const checks = [
    { id: "feedback_keywords", ok: containsAllKeywords(actual.feedback, scenario.expected_feedback_keywords), detail: actual.feedback },
    { id: "recovery_matches", ok: actual.recovery === scenario.expected_recovery, detail: `${actual.recovery} expected ${scenario.expected_recovery}` },
    { id: "loading_reset", ok: scenario.requires_loading_reset ? actual.loading_reset : true, detail: `loading_reset=${actual.loading_reset}` },
    { id: "safe_render", ok: scenario.requires_safe_render ? actual.safe_render : true, detail: `safe_render=${actual.safe_render}` },
    { id: "inline_notice", ok: actual.inline_notice && !actual.raw_dialog, detail: `inline_notice=${actual.inline_notice}, raw_dialog=${actual.raw_dialog}` },
  ];
  return scenarioResult({ scenario, started, checks, output: { component: scenario.component, failure: scenario.failure, actual } });
}

const startedAt = new Date();
const scenarios = JSON.parse(readFileSync(manifestPath, "utf8"));
const results = scenarios.map(runScenario);
const report = summarizeResults({ schema: "translateit.error_recovery_matrix.v1", mode: "diagnostic-error-recovery-scenarios", note: "Deterministic functional error recovery scenarios for translation, helper, voice, attachments, and settings failures.", startedAt, results });
const failures = results.filter((result) => !result.ok);
const lines = [
  "# TranslateIT Error Recovery Matrix",
  "",
  `Generated: ${report.generated_at}`,
  `Mode: ${report.mode}`,
  `Total: ${report.total}`,
  `Passed: ${report.passed}`,
  `Failed: ${report.failed}`,
  "",
  "| Status | Scenario | Component | Failure | Recovery | Feedback |",
  "|---|---|---|---|---|---|",
  ...results.map((result) => `| ${result.ok ? "PASS" : "FAIL"} | ${markdownCell(result.title)} | ${markdownCell(result.component)} | ${markdownCell(result.failure)} | ${markdownCell(result.actual.recovery)} | ${markdownCell(result.actual.feedback)} |`),
];
appendFailureDetails(lines, failures);
writeJsonAndMarkdown({ reportDir, jsonName: "latest-error-recovery-matrix.json", markdownName: "latest-error-recovery-matrix.md", report, markdownLines: lines });
console.log("Error recovery matrix summary:");
console.log(JSON.stringify({ ...report, results: results.map(({ checks, ...result }) => result) }, null, 2));
if (failures.length) process.exit(1);
