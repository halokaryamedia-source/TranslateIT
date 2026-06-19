import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(process.cwd(), "..", "..", "..");
const packageRoot = path.resolve(process.cwd());
const outputDir = path.join(repoRoot, "UserData", "CacheData", "validation");
const outputPath = path.join(outputDir, "latest_ui_button_audit.json");

const files = {
  shell: path.join(packageRoot, "src", "app", "launcher", "shell.ts"),
  settingsViews: path.join(packageRoot, "src", "app", "launcher", "settingsViews.ts"),
  uiPageFactory: path.join(packageRoot, "src", "app", "launcher", "uiPageFactory.ts"),
  dom: path.join(packageRoot, "src", "app", "launcher", "dom.ts"),
  bindings: path.join(packageRoot, "src", "app", "launcher", "launcherEventBindings.ts"),
  controller: path.join(packageRoot, "src", "app", "launcher", "launcherController.ts"),
  runtimeApi: path.join(packageRoot, "src", "app", "engineTranslate", "runtimeApi.ts"),
  developerBinding: path.join(packageRoot, "src", "app", "launcher", "developerHelperBridgeBinding.ts"),
  buttonContract: path.join(packageRoot, "src", "app", "launcher", "buttonActionContract.ts"),
};

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function includesAll(source, markers) {
  return markers.every((marker) => source.includes(marker));
}

function countMatches(source, pattern) {
  return (source.match(pattern) ?? []).length;
}

const shell = read(files.shell);
const settingsViews = read(files.settingsViews);
const uiPageFactory = read(files.uiPageFactory);
const dom = read(files.dom);
const bindings = read(files.bindings);
const controller = read(files.controller);
const runtimeApi = read(files.runtimeApi);
const developerBinding = read(files.developerBinding);
const buttonContract = read(files.buttonContract);

const checks = [];
function pushCheck(name, ok, detail = "") {
  checks.push({ name, ok, detail });
}

pushCheck("settings button exists", shell.includes('id="settingsButton"'));
pushCheck("settings page exists", shell.includes('id="settingsPage"'));
pushCheck("settings content exists", shell.includes('id="settingsContent"'));
pushCheck("back button exists", shell.includes('id="backHomeButton"'));
pushCheck("settings navigation tabs exist", includesAll(shell, ['data-settings-tab="general"', 'data-settings-tab="audio"', 'data-settings-tab="translate"', 'data-settings-tab="developer"']));

pushCheck("settings routing openGeneralSettings", includesAll(controller, ['private openGeneralSettings(): void', 'this.showSettings("general")']));
pushCheck("settings routing openAudioSettings", includesAll(controller, ['private openAudioSettings(): void', 'this.showSettings("audio")']));
pushCheck("settings routing openDeveloperDiagnostics", includesAll(controller, ['private async openDeveloperDiagnostics(): Promise<void>', 'this.showSettings("developer")']));
pushCheck("settings routing showSettings hides home", includesAll(controller, ['this.ui.homePage.classList.add("is-hidden")', 'this.ui.settingsPage.classList.remove("is-hidden")']));
pushCheck("settings routing renderSettingsTab general", includesAll(controller, ['if (tab === "general") this.renderGeneralSettings();', 'this.renderSettingsTab(tab);']));
pushCheck("settings route assertion present", controller.includes("route.assertion-failed"));

pushCheck("general runtime profile button rendered", settingsViews.includes("runtimeProfileButton"));
pushCheck("general language focus button rendered", settingsViews.includes("languageFocusButton"));
pushCheck("general realtime status now static", settingsViews.includes('statusField("Realtime Status"'));
pushCheck("general gpu status now static", settingsViews.includes('statusField("GPU Status"'));
pushCheck("general settings action buttons present", includesAll(settingsViews, ['id: "saveSettingsButton"', 'id: "resetSettingsButton"']));
pushCheck("general runtime profile handler bound", includesAll(controller, ['runtimeProfileButton', 'toggleRuntimeProfile']));
pushCheck("general language focus handler bound", includesAll(controller, ['languageFocusButton', 'cycleLanguageFocusMode']));
pushCheck("general save settings handler bound", includesAll(controller, ['#saveSettingsButton', 'saveCurrentSettings']));
pushCheck("general reset settings handler bound", includesAll(controller, ['#resetSettingsButton', 'saveDefaultSettings']));
pushCheck("translate save settings handler bound", includesAll(controller, ['#saveTranslateButton', 'saveCurrentSettings']));

pushCheck("developer helper controls rendered", includesAll(settingsViews, ['data-helper-bridge-action="start"', 'data-helper-bridge-action="status"', 'data-helper-bridge-action="stop"', 'data-helper-bridge-action="cancel"']));
pushCheck("developer capture controls rendered", includesAll(settingsViews, ['data-capture-bridge-action="start-preview"', 'data-capture-bridge-action="stop-preview"']));
pushCheck("developer helper binding exists", includesAll(developerBinding, ['data-helper-bridge-action', 'data-capture-bridge-action', 'runtimeApi.startHelperBridge', 'runtimeApi.stopHelperBridge', 'runtimeApi.cancelHelperBridgeTask']));
pushCheck("runtime api helper wrappers exist", includesAll(runtimeApi, ['startHelperBridge', 'stopHelperBridge', 'cancelHelperBridgeTask', 'prepareCaptureStartRequest', 'prepareCaptureStopRequest', 'checkHelperBridgeHealth']));

pushCheck("launch shell controls wired", includesAll(bindings, ['settingsButton', 'openGeneralSettings', 'startOrStopRecording', 'startHelperBridge', 'checkWorkerStatus', 'openDeveloperDiagnostics', 'openAudioSettings', 'toggleVoiceOutput', 'renderSettingsTab']));
pushCheck("dom refs include settings refs", includesAll(dom, ['settingsButton', 'backHomeButton', 'settingsNavItems', 'settingsContent']));

pushCheck("button contract file exists", buttonContract.includes("BUTTON_ACTION_CONTRACTS"));
pushCheck("button contract includes settings", includesAll(buttonContract, ['#settingsButton', '#backHomeButton', '[data-settings-tab="general"]', '[data-helper-bridge-action="start"]', '[data-capture-bridge-action="start-preview"]']));

pushCheck("shell no duplicate settings IDs", countMatches(shell, /id="(?:homePage|settingsPage|settingsContent|chatList)"/g) === 4);
pushCheck("developer controls not visual-only", !settingsViews.includes("Coming soon"));

const requiredFailures = checks.filter((item) => !item.ok).map((item) => item.name);
const report = {
  ok: requiredFailures.length === 0,
  status: requiredFailures.length === 0 ? "PASS" : "FAIL",
  checked_at: new Date().toISOString(),
  checks,
  failed: requiredFailures,
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
process.exitCode = requiredFailures.length === 0 ? 0 : 1;
