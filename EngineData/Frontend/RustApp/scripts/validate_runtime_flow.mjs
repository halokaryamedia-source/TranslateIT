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

const launcher = readText("EngineData/Frontend/RustApp/src/app/active-launcher/launcherController.ts");
expectIncludes(launcher, "Text ready", "main readiness wording");
expectIncludes(launcher, "Voice ready", "main readiness wording");
expectIncludes(launcher, "Provider pending", "provider pending wording");
expectIncludes(launcher, "Translation failed.", "translation failure flow");
expectIncludes(launcher, "if (!result?.ok)", "translation failure guard");
expectNotIncludes(launcher, "Local runtime warmup completed. You can start typing or record speech.", "generic ready wording");

const runtimeCommands = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/runtime.rs");
expectIncludes(runtimeCommands, "Voice capture is blocked because helper provider readiness is not verified yet", "capture helper readiness guard");
expectIncludes(runtimeCommands, "!status.provider_ready", "capture provider readiness condition");
expectIncludes(runtimeCommands, "pub fn prepare_capture_start_request", "capture start preview command");
expectIncludes(runtimeCommands, "pub fn prepare_capture_stop_request", "capture stop preview command");
expectIncludes(runtimeCommands, "preview_only_no_capture_runtime_claim", "capture preview no-runtime claim");

const runtimeApi = readText("EngineData/Frontend/RustApp/src/app/bridge/runtime/runtimeApi.ts");
expectIncludes(runtimeApi, "HELPER_COMMAND_TIMEOUT_MS", "helper command timeout guard");
expectIncludes(runtimeApi, "HELPER_START_TIMEOUT_MS", "helper start timeout guard");
expectIncludes(runtimeApi, "frontend_timeout_backend_result_unknown", "helper timeout runtime claim");
expectIncludes(runtimeApi, "runHelperActionWithTimeout", "helper timeout wrapper");
expectIncludes(runtimeApi, "prepareCaptureStartRequest", "capture start preview frontend API");
expectIncludes(runtimeApi, "prepareCaptureStopRequest", "capture stop preview frontend API");

const healthMonitor = readText("EngineData/Frontend/RustApp/src/app/active-launcher/helperBridgeHealthMonitor.ts");
expectIncludes(healthMonitor, "publishHealthWarning", "health monitor non-invasive warning");
expectIncludes(healthMonitor, "helperBridgeHealthWarning", "health warning state storage");
expectNotIncludes(healthMonitor, "#assistantMessage", "health monitor assistant overwrite");

const readinessGuard = readText("EngineData/Frontend/RustApp/src/app/active-launcher/runtimeReadinessUiGuard.ts");
expectIncludes(readinessGuard, "isPriorGenericReadyLabel", "prior generic ready guard");
expectNotIncludes(readinessGuard, "Legacy", "runtime flow historical wording");
expectNotIncludes(readinessGuard, "legacy", "runtime flow historical wording");
expectNotIncludes(readinessGuard, "userPresence.includes(\"ready\")", "broad ready text sniffing");

const settingsViews = readText("EngineData/Frontend/RustApp/src/app/active-launcher/settingsViews.ts");
expectIncludes(settingsViews, "provider pending", "developer helper provider-aware label");
expectIncludes(settingsViews, "CUDA not verified", "developer CUDA-aware label");
expectIncludes(settingsViews, "Helper bridge controls", "developer helper controls inline layout");
expectIncludes(settingsViews, "Capture helper bridge preview controls", "capture preview controls inline layout");
expectIncludes(settingsViews, "Voice capture and Mic Test require helper provider readiness evidence", "audio mic readiness warning");

const helperBinding = readText("EngineData/Frontend/RustApp/src/app/active-launcher/developerHelperBridgeBinding.ts");
expectIncludes(helperBinding, "data-capture-bridge-action", "capture preview event binding");
expectIncludes(helperBinding, "preview did not start or stop capture", "capture preview non-execution message");

const mainTs = readText("EngineData/Frontend/RustApp/src/main.ts");
expectNotIncludes(mainTs, "bindHelperBridgeVisibilityUi", "removed duplicate helper visibility binding");

const audioStudioBinding = readText("EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioBinding.ts");
expectIncludes(audioStudioBinding, "metadata-only mode", "Audio Studio metadata-only opening notice");
expectIncludes(audioStudioBinding, "Stage Metadata", "Audio Studio guided metadata label");
expectIncludes(audioStudioBinding, "Check Provider Blockers", "Audio Studio provider diagnostics label");
expectIncludes(audioStudioBinding, "Check Quality Blockers", "Audio Studio quality diagnostics label");
expectNotIncludes(audioStudioBinding, "Stage Guide", "misleading Audio Studio recording label");

if (errors.length > 0) {
  console.error("Runtime flow validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Runtime flow validation passed.");



