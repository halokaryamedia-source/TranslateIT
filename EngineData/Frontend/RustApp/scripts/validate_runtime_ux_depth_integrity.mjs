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
  settingsViews: resolve(appRoot, "src", "app", "active-launcher", "settingsViews.ts"),
};

const missing = Object.entries(files).filter(([, path]) => !existsSync(path));
if (missing.length > 0) {
  console.error(`Missing product runtime UX file(s): ${missing.map(([name]) => name).join(", ")}`);
  process.exit(1);
}

const main = readFileSync(files.main, "utf8");
for (const marker of ["SimpleLauncherController", "simple-ui-v1"]) {
  if (!main.includes(marker)) throw new Error(`Main entry is missing active shell marker: ${marker}`);
}
for (const forbidden of ["new LauncherController", "bindDirectVoiceCaptureUi", "startRealtimeStatusPayloadAutoRefresh", "mountVirtualRouteSelectionSurface"]) {
  if (main.includes(forbidden)) throw new Error(`Main entry must not re-enable parallel legacy binding: ${forbidden}`);
}

const controller = readFileSync(files.simpleController, "utf8");
for (const marker of [
  "showWorkspace(\"meeting\")",
  "runProductTranslation",
  "runProductRecoveryAction",
  "loadProductRuntimeSnapshot",
  "retryReadinessButton",
  "fixSetupButton",
  "renderDeveloperSettingsView",
]) {
  if (!controller.includes(marker)) throw new Error(`Product controller is missing marker: ${marker}`);
}
for (const forbidden of ["startHelperButton", "checkWorkerStatusButton", "recentChatButton", "localDataButton"]) {
  if (controller.includes(forbidden)) throw new Error(`Normal controller must not expose stale internal control: ${forbidden}`);
}

const facade = readFileSync(files.facade, "utf8");
for (const marker of ["ProductReadiness", "meetingReady", "meetingRouteReady", "live_meeting_runtime_gate", "runProductTranslation", "runProductRecoveryAction"]) {
  if (!facade.includes(marker)) throw new Error(`Runtime product facade is missing marker: ${marker}`);
}

const shellParts = readFileSync(files.shellParts, "utf8");
for (const marker of ["Meeting", "Text", "Documents", "History", "Saved", "Settings", "meetingWorkspace", "textWorkspace", "fixSetupButton"]) {
  if (!shellParts.includes(marker)) throw new Error(`Product shell is missing marker: ${marker}`);
}
for (const forbidden of ["Start Helper", "Check Worker", "Local data"]) {
  if (shellParts.includes(forbidden)) throw new Error(`Normal shell must not expose internal runtime action: ${forbidden}`);
}

const settingsViews = readFileSync(files.settingsViews, "utf8");
for (const marker of ["Realtime", "Session Listening", "Developer Diagnostics"]) {
  if (!settingsViews.includes(marker)) throw new Error(`Settings product surface is missing marker: ${marker}`);
}
if (settingsViews.includes('"Fast"')) throw new Error("Settings product surface must not render stale Fast mode naming.");

console.log("Runtime UX depth integrity passed for Meeting-first product shell and diagnostics boundary.");
