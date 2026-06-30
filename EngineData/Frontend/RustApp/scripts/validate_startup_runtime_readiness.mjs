import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mainPath = resolve(root, "src/main.ts");
const simpleControllerPath = resolve(root, "src/app/simple-launcher/SimpleLauncherController.ts");
const facadePath = resolve(root, "src/app/bridge/runtimeProductFacade.ts");

for (const path of [mainPath, simpleControllerPath, facadePath]) {
  if (!existsSync(path)) {
    console.error(`Missing file: ${path}`);
    process.exit(1);
  }
}

const main = readFileSync(mainPath, "utf8");
const simpleController = readFileSync(simpleControllerPath, "utf8");
const facade = readFileSync(facadePath, "utf8");

for (const marker of ["SimpleLauncherController", "simple-ui-v1"]) {
  if (!main.includes(marker)) throw new Error(`main marker missing: ${marker}`);
}

for (const forbidden of ["startStartupReadiness", "bindSettingsAutosaveUi", "bindDirectVoiceCaptureUi", "startRealtimeStatusPayloadAutoRefresh"]) {
  if (main.includes(forbidden)) throw new Error(`main must not re-enable legacy startup binding: ${forbidden}`);
}

for (const marker of ["boot", "refreshReadiness", "renderSettings", "saveSettings", "resetSettings"]) {
  if (!simpleController.includes(marker)) throw new Error(`simple controller startup/settings marker missing: ${marker}`);
}

for (const marker of ["loadProductRuntimeSnapshot", "getModelInventory", "getGpuPolicy", "getInputStatus", "getHelperBridgeStatus"]) {
  if (!facade.includes(marker)) throw new Error(`runtime facade readiness marker missing: ${marker}`);
}

console.log("Startup runtime readiness integrity passed for simple app entry.");
