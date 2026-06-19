import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "..", "..", "..");
const controller = fs.readFileSync(path.join(root, "EngineData", "LauncherApp", "RustApp", "src", "app", "launcher", "launcherController.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "EngineData", "LauncherApp", "RustApp", "src", "styles.css"), "utf8");

const checks = [
  ["css hidden override", styles.includes(".is-hidden,") && styles.includes("display: none !important;")],
  ["css settings route selector", styles.includes('.app-shell[data-route="settings"]')],
  ["css settings sidebar route selector", styles.includes('.app-shell[data-route="settings"] .sidebar')],
  ["controller sets route home", controller.includes('this.ui.mainApp.dataset.route = "home"')],
  ["controller sets route settings", controller.includes('this.ui.mainApp.dataset.route = "settings"')],
  ["controller sets hidden attr home", controller.includes("this.ui.homePage.hidden = true") && controller.includes("this.ui.homePage.hidden = false")],
  ["controller sets hidden attr settings", controller.includes("this.ui.settingsPage.hidden = true") && controller.includes("this.ui.settingsPage.hidden = false")],
  ["controller sets display home", controller.includes('this.ui.homePage.style.display = "none"') && controller.includes('this.ui.homePage.style.display = "grid"')],
  ["controller sets display settings", controller.includes('this.ui.settingsPage.style.display = "none"') && controller.includes('this.ui.settingsPage.style.display = "grid"')],
  ["assistant notice sanitizer", controller.includes("userFacingNotice(") && controller.includes("assistant.notice")],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failed.length === 0,
  status: failed.length === 0 ? "PASS" : "FAIL",
  checks: checks.map(([name, ok]) => ({ name, ok })),
  failed,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = failed.length === 0 ? 0 : 1;
