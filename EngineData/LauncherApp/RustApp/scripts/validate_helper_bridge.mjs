import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const errors = [];

function readText(path) {
  const fullPath = resolve(repoRoot, path);
  if (!existsSync(fullPath)) {
    errors.push(`Missing file: ${path}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function expectIncludes(content, marker, label) {
  if (!content.includes(marker)) errors.push(`${label}: missing ${marker}`);
}

function expectNotIncludes(content, marker, label) {
  if (content.includes(marker)) errors.push(`${label}: forbidden ${marker}`);
}

const helperBridge = readText("EngineData/LauncherApp/RustApp/src-tauri/src/commands/helper_bridge.rs");
expectIncludes(helperBridge, "pub fn get_helper_bridge_status", "helper bridge command");
expectIncludes(helperBridge, "pub fn start_helper_bridge", "helper bridge command");
expectIncludes(helperBridge, "pub fn stop_helper_bridge", "helper bridge command");
expectIncludes(helperBridge, "pub fn cancel_helper_bridge_task", "helper bridge command");
expectIncludes(helperBridge, "pub fn send_helper_bridge_request", "helper bridge command");
expectIncludes(helperBridge, "generation_token", "generation token support");
expectIncludes(helperBridge, "realtime_local_worker.py", "worker entrypoint guard");
expectIncludes(helperBridge, ".venv", "worker venv guard");
expectIncludes(helperBridge, "\"command\": \"ping\"", "startup ping check");
expectIncludes(helperBridge, "\"command\": \"status\"", "worker status check");
expectIncludes(helperBridge, "stderr_log_path", "stderr log visibility");
expectIncludes(helperBridge, "HelperBridge", "helper cache log root");

const runtimeCommands = readText("EngineData/LauncherApp/RustApp/src-tauri/src/commands/runtime.rs");
expectIncludes(runtimeCommands, "pub fn check_helper_bridge_health", "helper bridge health command");
expectIncludes(runtimeCommands, "task: \"status\"", "health status request");
expectIncludes(runtimeCommands, "cancel_helper_bridge_task", "capture generation invalidation");

const main = readText("EngineData/LauncherApp/RustApp/src-tauri/src/main.rs");
[
  "get_helper_bridge_status",
  "start_helper_bridge",
  "stop_helper_bridge",
  "cancel_helper_bridge_task",
  "send_helper_bridge_request",
  "check_helper_bridge_health",
].forEach((marker) => expectIncludes(main, marker, "Tauri handler registration"));

const runtimeApi = readText("EngineData/LauncherApp/RustApp/src/app/engineTranslate/runtimeApi.ts");
[
  "getHelperBridgeStatus",
  "startHelperBridge",
  "stopHelperBridge",
  "cancelHelperBridgeTask",
  "sendHelperBridgeRequest",
  "checkHelperBridgeHealth",
  "runHelperActionWithTimeout",
].forEach((marker) => expectIncludes(runtimeApi, marker, "frontend helper bridge API"));

const healthMonitor = readText("EngineData/LauncherApp/RustApp/src/app/launcher/helperBridgeHealthMonitor.ts");
expectIncludes(healthMonitor, "HEALTH_INTERVAL_MS = 15_000", "health monitor interval");
expectIncludes(healthMonitor, "status.state !== \"ready\"", "health monitor ready guard");
expectIncludes(healthMonitor, "checkHelperBridgeHealth", "health monitor command call");
expectNotIncludes(healthMonitor, "#assistantMessage", "health monitor assistant overwrite");

const settingsViews = readText("EngineData/LauncherApp/RustApp/src/app/launcher/settingsViews.ts");
expectIncludes(settingsViews, "Helper bridge controls", "developer helper bridge controls");
expectIncludes(settingsViews, "data-helper-bridge-action=\"start\"", "developer helper start button");
expectIncludes(settingsViews, "data-helper-bridge-action=\"status\"", "developer helper status button");
expectIncludes(settingsViews, "provider pending", "developer helper provider label");
expectIncludes(settingsViews, "CUDA not verified", "developer helper CUDA label");

const helperBinding = readText("EngineData/LauncherApp/RustApp/src/app/launcher/developerHelperBridgeBinding.ts");
expectIncludes(helperBinding, "document.addEventListener(\"click\"", "helper bridge event delegation");
expectIncludes(helperBinding, "data-helper-bridge-action", "helper bridge action event selector");
expectNotIncludes(helperBinding, "insertAdjacentElement", "helper bridge layout injection");
expectNotIncludes(helperBinding, "MutationObserver", "helper bridge mutation layout observer");

const mainTs = readText("EngineData/LauncherApp/RustApp/src/main.ts");
expectIncludes(mainTs, "startHelperBridgeHealthMonitor", "health monitor app binding");
expectIncludes(mainTs, "bindDeveloperHelperBridgeUi", "helper bridge event binding");
expectNotIncludes(mainTs, "bindHelperBridgeVisibilityUi", "removed duplicate helper visibility binding");

const sharedTypes = readText("EngineData/LauncherApp/RustApp/src/app/shared/types.ts");
expectIncludes(sharedTypes, "stderr_log_path", "frontend helper bridge status type");

if (errors.length > 0) {
  console.error("Helper bridge validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Helper bridge validation passed.");
