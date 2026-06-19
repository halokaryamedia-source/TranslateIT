import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");
const translationCommandPath = resolve(appRoot, "src-tauri", "src", "commands", "translation.rs");
const textControllerPath = resolve(appRoot, "src", "app", "active-launcher", "controller", "textTranslationController.ts");

const requiredFiles = [translationCommandPath, textControllerPath];
const missing = requiredFiles.filter((path) => !existsSync(path));
if (missing.length > 0) {
  console.error(`Missing translation flow file(s): ${missing.join(", ")}`);
  process.exit(1);
}

const translationCommand = readFileSync(translationCommandPath, "utf8");
const requiredCommandMarkers = [
  "try_translate_with_running_helper_bridge",
  "write_worker_request",
  "read_worker_response",
  "engine::translate_text",
];
const missingCommandMarkers = requiredCommandMarkers.filter((marker) => !translationCommand.includes(marker));
if (missingCommandMarkers.length > 0) {
  console.error(`Translation command is missing expected helper-bridge/fallback marker(s): ${missingCommandMarkers.join(", ")}`);
  process.exit(1);
}

const textController = readFileSync(textControllerPath, "utf8");
const requiredControllerMarkers = [
  "runTextTranslationFlow",
  "validateTextTranslationSource",
  "runtimeApi.translateText",
  "localPreviewTranslation",
];
const missingControllerMarkers = requiredControllerMarkers.filter((marker) => !textController.includes(marker));
if (missingControllerMarkers.length > 0) {
  console.error(`Text translation controller is missing expected marker(s): ${missingControllerMarkers.join(", ")}`);
  process.exit(1);
}

console.log("Translation flow integrity passed.");
