import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const srcRoot = resolve(appRoot, "src");

const checks = [
  { name: "main entry", path: "main.ts", mustContain: ["new LauncherController", "startStartupReadiness"] },
  { name: "text input submit", path: "app/active-launcher/launcherEventBindings.ts", mustContain: ["submitText", "event.key === \"Enter\""] },
  { name: "runtime readiness guard", path: "app/active-launcher/runtimeReadinessUiGuard.ts", mustContain: ["Setup needed", "MutationObserver"] },
  { name: "settings autosave", path: "app/active-launcher/settingsAutosaveBinding.ts", mustContain: ["RUNTIME_SETTINGS_SAVED_EVENT"] },
  { name: "developer diagnostics", path: "app/active-launcher/developerEvidenceBinding.ts", mustContain: ["Developer", "Evidence"] },
  { name: "voice direct capture", path: "app/active-launcher/directVoiceCaptureBinding.ts", mustContain: ["startCapture", "stopCapture", "MIN_RECORDING_MS", "voiceUiState", "stopImmediatePropagation", "waitMinimumRecordingDuration"] },
  { name: "realtime refresh throttle", path: "app/active-launcher/realtimeStatusPayloadRefresh.ts", mustContain: ["FIRST_REFRESH_DELAY_MS", "MIN_REFRESH_GAP_MS", "document.hidden", "realtimeStatusRefresh"] },
  { name: "helper health throttle", path: "app/active-launcher/helperBridgeHealthMonitor.ts", mustContain: ["FIRST_HEALTH_DELAY_MS", "MIN_HEALTH_GAP_MS", "document.hidden", "helperBridgeHealthCheck"] },
  { name: "runtime report script", path: "scripts/run_local_runtime_test_report.mjs", root: appRoot, mustContain: ["Accelerated worker used", "ct2_translation_model_ready"] },
  { name: "voice preflight report", path: "scripts/run_voice_preflight_report.mjs", root: appRoot, mustContain: ["asr_preload", "tts_preflight", "latest-voice-preflight"] },
  { name: "settings integrity report", path: "scripts/run_settings_integrity_report.mjs", root: appRoot, mustContain: ["placeholder", "RuntimeSettings", "latest-settings-integrity"] },
];

function inspect(check) {
  const root = check.root ?? srcRoot;
  const fullPath = resolve(root, check.path);
  if (!existsSync(fullPath)) {
    return { name: check.name, ok: false, blocker: "missing_file", path: fullPath };
  }
  const content = readFileSync(fullPath, "utf8");
  const missing = check.mustContain.filter((needle) => !content.includes(needle));
  return { name: check.name, ok: missing.length === 0, blocker: missing.length ? "missing_expected_content" : "", missing, path: fullPath };
}

function row(result) {
  return `| ${result.name} | ${result.ok ? "PASS" : "FAIL"}${result.blocker ? ` / ${result.blocker}` : ""}${result.missing?.length ? ` / missing: ${result.missing.join(", ")}` : ""} |`;
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const results = checks.map(inspect);
  const summary = {
    ok: results.every((result) => result.ok),
    failed: results.filter((result) => !result.ok).map((result) => result.name),
    checked: results.length,
  };
  const report = { schema: "translateit.ui_readiness_report.v3", started_at: startedAt, app_root: appRoot, results, summary };
  const latestJson = resolve(reportDir, "latest-ui-readiness.json");
  const latestMd = resolve(reportDir, "latest-ui-readiness.md");
  const md = [
    "# TranslateIT UI Readiness Report",
    "",
    `Started: ${startedAt}`,
    `App root: ${appRoot}`,
    "",
    "| Check | Result |",
    "|---|---|",
    ...results.map(row),
    "",
    "## Summary",
    "",
    `- OK: ${summary.ok}`,
    `- Checked: ${summary.checked}`,
    `- Failed: ${summary.failed.length ? summary.failed.join(", ") : "none"}`,
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`UI readiness report written: ${latestMd}`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main();