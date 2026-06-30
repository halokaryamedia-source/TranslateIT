import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");

const files = {
  main: resolve(appRoot, "src", "main.ts"),
  simpleController: resolve(appRoot, "src", "app", "simple-launcher", "SimpleLauncherController.ts"),
  facade: resolve(appRoot, "src", "app", "bridge", "runtimeProductFacade.ts"),
  shellParts: resolve(appRoot, "src", "app", "active-launcher", "lockedReferenceShellParts.ts"),
};

const missing = Object.entries(files).filter(([, path]) => !existsSync(path));
if (missing.length > 0) {
  console.error(`Missing simple runtime UX file(s): ${missing.map(([name]) => name).join(", ")}`);
  process.exit(1);
}

const main = readFileSync(files.main, "utf8");
for (const marker of ["SimpleLauncherController", "simple-ui-v1"]) {
  if (!main.includes(marker)) {
    console.error(`Main entry is missing simple UI marker: ${marker}`);
    process.exit(1);
  }
}

for (const forbidden of ["new LauncherController", "bindDirectVoiceCaptureUi", "startRealtimeStatusPayloadAutoRefresh", "mountVirtualRouteSelectionSurface"]) {
  if (main.includes(forbidden)) {
    console.error(`Main entry must not re-enable complex legacy binding: ${forbidden}`);
    process.exit(1);
  }
}

const controller = readFileSync(files.simpleController, "utf8");
for (const marker of [
  "runProductTranslation",
  "runProductSetupAction",
  "loadProductRuntimeSnapshot",
  "Translate",
  "Voice setup is not ready",
  "renderDeveloperSettingsView",
]) {
  if (!controller.includes(marker)) {
    console.error(`Simple controller is missing marker: ${marker}`);
    process.exit(1);
  }
}

const facade = readFileSync(files.facade, "utf8");
for (const marker of ["ProductReadiness", "canTranslateText", "canRecordVoice", "runProductTranslation", "runProductSetupAction"]) {
  if (!facade.includes(marker)) {
    console.error(`Runtime product facade is missing marker: ${marker}`);
    process.exit(1);
  }
}

const shellParts = readFileSync(files.shellParts, "utf8");
for (const marker of ["Translate text", "simple-translate-card", "simple-status-card", "simple-voice-card"]) {
  if (!shellParts.includes(marker)) {
    console.error(`Simple shell is missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log("Runtime UX depth integrity passed for the simple engine-first UI.");
