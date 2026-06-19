import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");
const translationCommandPath = resolve(appRoot, "src-tauri", "src", "commands", "translation.rs");
const manualAcceleratedPath = resolve(appRoot, "src-tauri", "src", "engine", "manual_translation_accelerated.rs");
const launcherControllerPath = resolve(appRoot, "src", "app", "active-launcher", "launcherController.ts");
const textControllerPath = resolve(appRoot, "src", "app", "active-launcher", "controller", "textTranslationController.ts");
const previewTranslationPath = resolve(appRoot, "src", "app", "active-launcher", "launcherPreviewTranslation.ts");

const requiredFiles = [translationCommandPath, manualAcceleratedPath, launcherControllerPath, textControllerPath, previewTranslationPath];
const missing = requiredFiles.filter((path) => !existsSync(path));
if (missing.length > 0) {
  console.error(`Missing translation flow file(s): ${missing.join(", ")}`);
  process.exit(1);
}

const translationCommand = readFileSync(translationCommandPath, "utf8");
const manualAccelerated = readFileSync(manualAcceleratedPath, "utf8");
const launcherController = readFileSync(launcherControllerPath, "utf8");
const textController = readFileSync(textControllerPath, "utf8");
const previewTranslation = readFileSync(previewTranslationPath, "utf8");

const requiredCommandMarkers = [
  "try_translate_with_running_helper_bridge",
  "write_worker_request",
  "read_worker_response",
  "engine::translate_text",
];
const missingCommandMarkers = requiredCommandMarkers.filter((marker) => !translationCommand.includes(marker));
if (missingCommandMarkers.length > 0) {
  console.error(`Translation command is missing expected helper-bridge/engine marker(s): ${missingCommandMarkers.join(", ")}`);
  process.exit(1);
}

const requiredAcceleratedMarkers = [
  "realtime_local_worker_accelerated.py",
  "super::manual_translation::translate_text",
  "translated_text",
];
const missingAcceleratedMarkers = requiredAcceleratedMarkers.filter((marker) => !manualAccelerated.includes(marker));
if (missingAcceleratedMarkers.length > 0) {
  console.error(`Accelerated manual translation bridge is missing marker(s): ${missingAcceleratedMarkers.join(", ")}`);
  process.exit(1);
}

const requiredControllerMarkers = [
  "runtimeApi.translateText",
  "Translation command failed",
  "translation_failed",
];
const combinedControllers = `${launcherController}\n${textController}`;
const missingControllerMarkers = requiredControllerMarkers.filter((marker) => !combinedControllers.includes(marker));
if (missingControllerMarkers.length > 0) {
  console.error(`Text translation UI flow is missing expected marker(s): ${missingControllerMarkers.join(", ")}`);
  process.exit(1);
}

const forbiddenPreviewDictionaryMarkers = [
  "previewWordTranslation",
  "case \"halo\"",
  "case \"dunia\"",
  "Local preview translation shown because",
];
const forbiddenHits = forbiddenPreviewDictionaryMarkers.filter((marker) => previewTranslation.includes(marker) || combinedControllers.includes(marker));
if (forbiddenHits.length > 0) {
  console.error(`Text translation flow still contains fake preview fallback marker(s): ${forbiddenHits.join(", ")}`);
  process.exit(1);
}

if (!previewTranslation.includes("return null;")) {
  console.error("Local preview translation module must be disabled and return null.");
  process.exit(1);
}

console.log("Translation flow integrity passed: text route requires the real worker/engine path and fake preview fallback is disabled.");
