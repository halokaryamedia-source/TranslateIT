import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const activeLauncherRoot = resolve(appRoot, "src", "app", "active-launcher");

const actionChecks = [
  {
    name: "helper bridge actions",
    viewFile: "settingsViews.ts",
    bindingFile: "developerHelperBridgeBinding.ts",
    visibleToken: "data-helper-bridge-action",
    bindingTokens: ["data-helper-bridge-action", "helperTask", "startHelperBridge", "stopHelperBridge"],
  },
  {
    name: "capture bridge preview actions",
    viewFile: "settingsViews.ts",
    bindingFile: "developerHelperBridgeBinding.ts",
    visibleToken: "data-capture-bridge-action",
    bindingTokens: ["data-capture-bridge-action", "capturePreviewTask", "prepareCaptureStartRequest", "prepareCaptureStopRequest"],
  },
  {
    name: "voice mode actions",
    viewFile: "settingsViews.ts",
    bindingFile: "directVoiceCaptureBinding.ts",
    visibleToken: "data-voice-capture-mode",
    bindingTokens: ["data-voice-capture-mode", "setVoiceMode", "voiceMode"],
  },
  {
    name: "developer evidence actions",
    viewFile: "settingsViews.ts",
    bindingFile: "developerEvidenceBinding.ts",
    visibleToken: "developerEvidence",
    bindingTokens: ["bindDeveloperEvidenceUi"],
    visibleRequired: false,
  },
];

function readActive(file) {
  const path = resolve(activeLauncherRoot, file);
  return { path, content: existsSync(path) ? readFileSync(path, "utf8") : null };
}

function inspect(check) {
  const view = readActive(check.viewFile);
  const binding = readActive(check.bindingFile);
  const visible = view.content ? view.content.includes(check.visibleToken) : false;
  const bindingMissing = binding.content ? check.bindingTokens.filter((token) => !binding.content.includes(token)) : check.bindingTokens;
  const visibleOk = check.visibleRequired === false ? true : visible;
  const ok = Boolean(view.content && binding.content && visibleOk && bindingMissing.length === 0);
  return {
    name: check.name,
    ok,
    view_path: view.path,
    binding_path: binding.path,
    visible_token_found: visible,
    missing_binding_tokens: bindingMissing,
    blocker: !view.content ? "missing_view_file" : !binding.content ? "missing_binding_file" : !visibleOk ? "visible_token_missing" : bindingMissing.length ? "binding_token_missing" : "",
  };
}

function row(result) {
  return `| ${result.name} | ${result.ok ? "PASS" : "FAIL"} | ${result.blocker || "none"}${result.missing_binding_tokens.length ? ` / missing: ${result.missing_binding_tokens.join(", ")}` : ""} |`;
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const results = actionChecks.map(inspect);
  const summary = {
    ok: results.every((result) => result.ok),
    failed: results.filter((result) => !result.ok).map((result) => result.name),
  };
  const report = {
    schema: "translateit.action_binding_report.v1",
    generated_at: new Date().toISOString(),
    app_root: appRoot,
    results,
    summary,
  };
  const latestJson = resolve(reportDir, "latest-action-binding.json");
  const latestMd = resolve(reportDir, "latest-action-binding.md");
  const md = [
    "# TranslateIT Action Binding Report",
    "",
    `OK: ${summary.ok}`,
    "",
    "| Action area | Result | Detail |",
    "|---|---|---|",
    ...results.map(row),
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Action binding report written: ${latestMd}`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main();
