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

const launcher = readText("EngineData/LauncherApp/RustApp/src/app/launcher/launcherController.ts");
expectIncludes(launcher, "Text ready", "main readiness wording");
expectIncludes(launcher, "Voice ready", "main readiness wording");
expectIncludes(launcher, "Provider pending", "provider pending wording");
expectIncludes(launcher, "Translation failed.", "translation failure flow");
expectIncludes(launcher, "if (!result?.ok)", "translation failure guard");
expectNotIncludes(launcher, "Local runtime warmup completed. You can start typing or record speech.", "generic ready wording");

const runtimeCommands = readText("EngineData/LauncherApp/RustApp/src-tauri/src/commands/runtime.rs");
expectIncludes(runtimeCommands, "Voice capture is blocked because helper provider readiness is not verified yet", "capture helper readiness guard");
expectIncludes(runtimeCommands, "!status.provider_ready", "capture provider readiness condition");

const healthMonitor = readText("EngineData/LauncherApp/RustApp/src/app/launcher/helperBridgeHealthMonitor.ts");
expectIncludes(healthMonitor, "publishHealthWarning", "health monitor non-invasive warning");
expectIncludes(healthMonitor, "helperBridgeHealthWarning", "health warning state storage");
expectNotIncludes(healthMonitor, "#assistantMessage", "health monitor assistant overwrite");

const readinessGuard = readText("EngineData/LauncherApp/RustApp/src/app/launcher/runtimeReadinessUiGuard.ts");
expectIncludes(readinessGuard, "isLegacyGenericReady", "legacy ready guard");
expectNotIncludes(readinessGuard, "userPresence.includes(\"ready\")", "broad ready text sniffing");

const settingsViews = readText("EngineData/LauncherApp/RustApp/src/app/launcher/settingsViews.ts");
expectIncludes(settingsViews, "provider pending", "developer helper provider-aware label");
expectIncludes(settingsViews, "CUDA not verified", "developer CUDA-aware label");

if (errors.length > 0) {
  console.error("Runtime flow validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Runtime flow validation passed.");
