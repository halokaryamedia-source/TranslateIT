import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const startupPath = resolve(root, "src/app/active-launcher/startupReadinessBinding.ts");
const autosavePath = resolve(root, "src/app/active-launcher/settingsAutosaveBinding.ts");
const mainPath = resolve(root, "src/main.ts");

for (const path of [startupPath, autosavePath, mainPath]) {
  if (!existsSync(path)) {
    console.error(`Missing file: ${path}`);
    process.exit(1);
  }
}

const startup = readFileSync(startupPath, "utf8");
const autosave = readFileSync(autosavePath, "utf8");
const main = readFileSync(mainPath, "utf8");

for (const marker of ["getModelInventory", "getGpuPolicy", "startHelperBridge", "engineReady"]) {
  if (!startup.includes(marker)) throw new Error(`startup marker missing: ${marker}`);
}
for (const marker of ["saveSettingsButton", "saveTranslateButton", "runtimeProfileButton"]) {
  if (!autosave.includes(marker)) throw new Error(`autosave marker missing: ${marker}`);
}
for (const marker of ["startStartupReadiness", "bindSettingsAutosaveUi"]) {
  if (!main.includes(marker)) throw new Error(`main marker missing: ${marker}`);
}

console.log("Startup runtime readiness integrity passed.");
