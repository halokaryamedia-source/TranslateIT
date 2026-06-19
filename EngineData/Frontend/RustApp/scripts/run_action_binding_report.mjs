import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const activeLauncherRoot = resolve(appRoot, "src", "app", "active-launcher");

const files = {
  settingsViews: "settingsViews.ts",
  launcherSettingsRenderer: "launcherSettingsRenderer.ts",
  launcherController: "launcherController.ts",
  directVoiceCaptureBinding: "directVoiceCaptureBinding.ts",
  developerHelperBridgeBinding: "developerHelperBridgeBinding.ts",
  developerEvidenceBinding: "developerEvidenceBinding.ts",
  settingsAutosaveBinding: "settingsAutosaveBinding.ts",
};

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
    visibleToken: "Validation evidence status",
    bindingTokens: ["bindDeveloperEvidenceUi", "getLatestAudioStudioValidationEvidence"],
  },
];

const dataActionChecks = [
  { token: "data-helper-bridge-action", bindingFile: "developerHelperBridgeBinding", bindingToken: "helperTask" },
  { token: "data-capture-bridge-action", bindingFile: "developerHelperBridgeBinding", bindingToken: "capturePreviewTask" },
  { token: "data-voice-capture-mode", bindingFile: "directVoiceCaptureBinding", bindingToken: "setVoiceMode" },
  { token: "data-language-role", bindingFile: "launcherSettingsRenderer", bindingToken: "onSelectLanguage" },
];

const dataBoundIds = new Set(["voiceModeToggleButton", "voiceModePushToTalkButton"]);

function readActive(file) {
  const path = resolve(activeLauncherRoot, file);
  return { path, content: existsSync(path) ? readFileSync(path, "utf8") : null };
}

function unique(values) {
  return Array.from(new Set(values)).sort();
}

function inspect(check) {
  const view = readActive(check.viewFile);
  const binding = readActive(check.bindingFile);
  const visible = view.content ? view.content.includes(check.visibleToken) : false;
  const bindingMissing = binding.content ? check.bindingTokens.filter((token) => !binding.content.includes(token)) : check.bindingTokens;
  const ok = Boolean(view.content && binding.content && visible && bindingMissing.length === 0);
  return {
    name: check.name,
    ok,
    view_path: view.path,
    binding_path: binding.path,
    visible_token_found: visible,
    missing_binding_tokens: bindingMissing,
    blocker: !view.content ? "missing_view_file" : !binding.content ? "missing_binding_file" : !visible ? "visible_token_missing" : bindingMissing.length ? "binding_token_missing" : "",
  };
}

function extractVisibleControlIds(settingsViews) {
  const ids = [];
  for (const match of settingsViews.matchAll(/id=\\"([A-Za-z0-9_-]+)\\"/g)) ids.push(match[1]);
  for (const match of settingsViews.matchAll(/primaryButton\("[^"]+", \{ id: "([A-Za-z0-9_-]+)"/g)) ids.push(match[1]);
  for (const match of settingsViews.matchAll(/factorySelectField\("[^"]+", [^,]+, "[^"]+", "([A-Za-z0-9_-]+)"/g)) ids.push(match[1]);
  for (const match of settingsViews.matchAll(/radioOption\("([A-Za-z0-9_-]+)"/g)) ids.push(match[1]);
  return unique(ids);
}

function extractHashSelectors(content) {
  const selectors = [];
  for (const match of content.matchAll(/#[A-Za-z0-9_-]+/g)) selectors.push(match[0].slice(1));
  return unique(selectors);
}

function selectorBound(id, combinedBindingSource) {
  if (dataBoundIds.has(id)) return true;
  return combinedBindingSource.includes(`#${id}`) || combinedBindingSource.includes(`getElementById("${id}")`) || combinedBindingSource.includes(`getElementById('${id}')`);
}

function dataActionOk(token, bindingContent, bindingToken) {
  return bindingContent.includes(token) && bindingContent.includes(bindingToken);
}

function row(result) {
  return `| ${result.name} | ${result.ok ? "PASS" : "FAIL"} | ${result.blocker || "none"}${result.missing_binding_tokens?.length ? ` / missing: ${result.missing_binding_tokens.join(", ")}` : ""} |`;
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const loaded = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, readActive(file)]));
  const missingFiles = Object.values(loaded).filter((file) => !file.content).map((file) => file.path);
  const settingsViews = loaded.settingsViews.content ?? "";
  const bindingSource = Object.entries(loaded)
    .filter(([key]) => key !== "settingsViews")
    .map(([, file]) => file.content ?? "")
    .join("\n");

  const targetedResults = actionChecks.map(inspect);
  const visibleControlIds = extractVisibleControlIds(settingsViews);
  const unboundVisibleControlIds = visibleControlIds.filter((id) => !selectorBound(id, bindingSource));
  const autosaveSelectors = extractHashSelectors(loaded.settingsAutosaveBinding.content ?? "");
  const autosaveSelectorsMissingInView = autosaveSelectors.filter((id) => !visibleControlIds.includes(id));
  const dataActionResults = dataActionChecks.map((check) => {
    const bindingContent = loaded[check.bindingFile]?.content ?? "";
    const visible = settingsViews.includes(check.token);
    const bound = dataActionOk(check.token, bindingContent, check.bindingToken);
    return {
      name: `data action ${check.token}`,
      ok: visible && bound,
      blocker: !visible ? "visible_token_missing" : !bound ? "binding_token_missing" : "",
      missing_binding_tokens: bound ? [] : [check.bindingToken],
    };
  });
  const fakeControlTerms = ["fake button", "dummy button", "placeholder button", "coming soon"];
  const fakeControlHits = fakeControlTerms.filter((term) => settingsViews.toLowerCase().includes(term));
  const summary = {
    ok: missingFiles.length === 0 && targetedResults.every((result) => result.ok) && dataActionResults.every((result) => result.ok) && unboundVisibleControlIds.length === 0 && autosaveSelectorsMissingInView.length === 0 && fakeControlHits.length === 0,
    failed: [
      ...targetedResults.filter((result) => !result.ok).map((result) => result.name),
      ...dataActionResults.filter((result) => !result.ok).map((result) => result.name),
      ...unboundVisibleControlIds.map((id) => `unbound:${id}`),
      ...autosaveSelectorsMissingInView.map((id) => `autosave-missing:${id}`),
      ...fakeControlHits.map((term) => `fake-term:${term}`),
    ],
  };
  const report = {
    schema: "translateit.action_binding_report.v2",
    generated_at: new Date().toISOString(),
    app_root: appRoot,
    missing_files: missingFiles,
    targeted_results: targetedResults,
    data_action_results: dataActionResults,
    visible_control_ids: visibleControlIds,
    unbound_visible_control_ids: unboundVisibleControlIds,
    autosave_selectors: autosaveSelectors,
    autosave_selectors_missing_in_view: autosaveSelectorsMissingInView,
    fake_control_hits: fakeControlHits,
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
    ...targetedResults.map(row),
    ...dataActionResults.map(row),
    "",
    "## Unbound visible control IDs",
    "",
    unboundVisibleControlIds.length ? unboundVisibleControlIds.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Autosave selectors missing in rendered settings view",
    "",
    autosaveSelectorsMissingInView.length ? autosaveSelectorsMissingInView.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Fake/placeholder control terms",
    "",
    fakeControlHits.length ? fakeControlHits.map((item) => `- ${item}`).join("\n") : "none",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Action binding report written: ${latestMd}`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main();
