import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "..", "..", "..");
const controllerPath = path.join(root, "EngineData", "LauncherApp", "RustApp", "src", "app", "launcher", "launcherController.ts");
const bindingsPath = path.join(root, "EngineData", "LauncherApp", "RustApp", "src", "app", "launcher", "launcherEventBindings.ts");
const shellPath = path.join(root, "EngineData", "LauncherApp", "RustApp", "src", "app", "launcher", "shell.ts");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

const controller = read(controllerPath);
const bindings = read(bindingsPath);
const shell = read(shellPath);
const styles = read(path.join(root, "EngineData", "LauncherApp", "RustApp", "src", "styles.css"));

const checks = [
  ["settingsButton exists", bindings.includes("settingsButton")],
  ["openGeneralSettings handler", bindings.includes("openGeneralSettings")],
  ["settings page exists", shell.includes('id="settingsPage"')],
  ["settings content exists", shell.includes('id="settingsContent"')],
  ["back button exists", shell.includes('id="backHomeButton"')],
  ["showSettings general default", controller.includes('private showSettings(tab: SettingsTab = "general")')],
  ["renderSettingsTab general on open", controller.includes('this.renderSettingsTab(tab)')],
  ["home hidden on settings open", controller.includes('this.ui.homePage.classList.add("is-hidden")')],
  ["settings visible on settings open", controller.includes('this.ui.settingsPage.classList.remove("is-hidden")')],
  ["general settings route", controller.includes('this.showSettings("general")')],
  ["audio settings route", controller.includes('this.showSettings("audio")')],
  ["developer settings route", controller.includes('this.showSettings("developer")')],
  ["app route state used", controller.includes('this.ui.mainApp.dataset.route = "settings"') && controller.includes('this.ui.mainApp.dataset.route = "home"')],
  ["hidden attribute used", controller.includes(".hidden = true") && controller.includes(".hidden = false")],
  ["css route settings selector", styles.includes('.app-shell[data-route="settings"]')],
  ["css hidden override present", styles.includes('.is-hidden,\n.workspace.is-hidden,\n.settings-page.is-hidden,\n.warmup-screen.is-hidden,\n.app-shell.is-hidden') && styles.includes('display: none !important;')],
  ["duplicate ids absent", !/id="(?:homePage|settingsPage|settingsContent|chatList)"/g.test(shell) || shell.match(/id="(?:homePage|settingsPage|settingsContent|chatList)"/g)?.length <= 4],
  ["settings tabs present", shell.includes('data-settings-tab="general"') && shell.includes('data-settings-tab="audio"') && shell.includes('data-settings-tab="translate"') && shell.includes('data-settings-tab="developer"')],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failed.length === 0,
  status: failed.length === 0 ? "PASS" : "FAIL",
  failed,
  checks: checks.map(([name, ok]) => ({ name, ok })),
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = failed.length === 0 ? 0 : 1;
