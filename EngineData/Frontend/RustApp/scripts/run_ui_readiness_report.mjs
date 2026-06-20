import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const srcRoot = resolve(appRoot, "src");

const checks = [
  { name: "main entry", path: "main.ts", mustContain: ["new LauncherController", "startStartupReadiness", "./referenceLayout.css", "./mainPageLayout.css", "./audioSettingsLayout.css", "./translateSettingsLayout.css", "./developerSettingsLayout.css"] },
  { name: "no custom comfort override", path: "main.ts", mustNotContain: ["./uiComfortLayout.css"] },
  { name: "text input submit", path: "app/active-launcher/launcherEventBindings.ts", mustContain: ["submitText", "event.key === \"Enter\""] },
  { name: "locked main page v28 shell", path: "app/active-launcher/shell.ts", mustContain: ["Voice translation", "Local-first voice translation", "How can I help translate today?", "Ask anything...", "Text input", "Voice input", "New Chat", "Recent Chat", "Saved Chat", "Local Data"] },
  { name: "main page v28 layout module", path: "mainPageLayout.css", mustContain: ["Approved baseline: Main Page v28 reference screenshot", "grid-template-columns: 384px minmax(0, 1fr)", "width: 770px", "transform: translateX(-37px)", "max-width: 1058px"] },
  { name: "reference layout template", path: "referenceLayout.css", mustContain: ["Baseline: Main Page v28, Audio v22, Translate v14, Developer v37", "--ref-main-sidebar", "--ref-settings-content-width", "--ref-composer-width"] },
  { name: "audio settings v22 layout", path: "audioSettingsLayout.css", mustContain: ["Audio", "settings-card--audio", "mic-test-row-v22"] },
  { name: "translate settings v14 layout", path: "translateSettingsLayout.css", mustContain: ["Translate", "language-grid", "settings-output-row"] },
  { name: "developer settings v37 layout", path: "developerSettingsLayout.css", mustContain: ["Developer", "diagnostic", "settings-card--monitoring"] },
  { name: "ui library factory", path: "app/active-launcher/uiPageFactory.ts", mustContain: ["settingsPage", "settingsCard", "settingsField", "primaryButton", "statusBadge"] },
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
  const missing = (check.mustContain ?? []).filter((needle) => !content.includes(needle));
  const forbidden = (check.mustNotContain ?? []).filter((needle) => content.includes(needle));
  return {
    name: check.name,
    ok: missing.length === 0 && forbidden.length === 0,
    blocker: missing.length ? "missing_expected_content" : forbidden.length ? "forbidden_content_present" : "",
    missing,
    forbidden,
    path: fullPath,
  };
}

function row(result) {
  const missing = result.missing?.length ? ` / missing: ${result.missing.join(", ")}` : "";
  const forbidden = result.forbidden?.length ? ` / forbidden: ${result.forbidden.join(", ")}` : "";
  return `| ${result.name} | ${result.ok ? "PASS" : "FAIL"}${result.blocker ? ` / ${result.blocker}` : ""}${missing}${forbidden} |`;
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const results = checks.map(inspect);
  const summary = {
    ok: results.every((result) => result.ok),
    failed: results.filter((result) => !result.ok).map((result) => result.name),
    checked: results.length,
    locked_reference: "Main Page v28 + Audio v22 + Translate v14 + Developer v37",
  };
  const report = { schema: "translateit.ui_readiness_report.locked_reference.v1", started_at: startedAt, app_root: appRoot, results, summary };
  const latestJson = resolve(reportDir, "latest-ui-readiness.json");
  const latestMd = resolve(reportDir, "latest-ui-readiness.md");
  const md = [
    "# TranslateIT UI Readiness Report",
    "",
    `Started: ${startedAt}`,
    `App root: ${appRoot}`,
    `Locked reference: ${summary.locked_reference}`,
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
