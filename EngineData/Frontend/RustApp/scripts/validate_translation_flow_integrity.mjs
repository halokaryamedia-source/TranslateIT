import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");

const files = {
  textTranslateCommand: resolve(appRoot, "src-tauri", "src", "commands", "text_translate.rs"),
  pipelineHandoff: resolve(appRoot, "src-tauri", "src", "commands", "pipeline_handoff.rs"),
  helperBridgeRuntime: resolve(appRoot, "src-tauri", "src", "commands", "helper_bridge_runtime.rs"),
  registry: resolve(appRoot, "src-tauri", "src", "commands", "registry.rs"),
  launcherController: resolve(appRoot, "src", "app", "active-launcher", "launcherController.ts"),
  textController: resolve(appRoot, "src", "app", "active-launcher", "controller", "textTranslationController.ts"),
  previewTranslation: resolve(appRoot, "src", "app", "active-launcher", "launcherPreviewTranslation.ts"),
};

const errors = [];

function readText(label, path) {
  if (!existsSync(path)) {
    errors.push(`Missing translation flow file: ${label} (${path})`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function expect(content, marker, label) {
  if (!content.includes(marker)) errors.push(`${label}: missing ${marker}`);
}

function reject(content, marker, label) {
  if (content.includes(marker)) errors.push(`${label}: forbidden ${marker}`);
}

const textTranslate = readText("textTranslateCommand", files.textTranslateCommand);
const pipeline = readText("pipelineHandoff", files.pipelineHandoff);
const helperRuntime = readText("helperBridgeRuntime", files.helperBridgeRuntime);
const registry = readText("registry", files.registry);
const launcherController = readText("launcherController", files.launcherController);
const textController = readText("textController", files.textController);
const previewTranslation = readText("previewTranslation", files.previewTranslation);
const uiControllers = `${launcherController}\n${textController}`;

for (const marker of [
  "translate_with_running_helper_bridge",
  "write_worker_request",
  "read_worker_response_with_deadline",
  "engine::translate_text",
  "translated_text",
  "translation_fallback_reason",
]) expect(textTranslate, marker, "text translate command");

for (const marker of [
  "PipelinePayloadState",
  "prepare_translation_handoff_request",
  "dispatch_translation_handoff_request",
  "dispatch_translation_worker_response",
  "translated_from_worker_response",
  "set_translation_payload",
  "translation_handoff",
  "translated_text",
  "tts_text",
]) expect(pipeline, marker, "V1 pipeline handoff");

for (const marker of [
  "write_worker_request",
  "read_worker_response_with_deadline",
  "apply_worker_response",
]) expect(helperRuntime, marker, "helper bridge runtime");

for (const marker of [
  "crate::commands::text_translate::translate_text",
  "crate::commands::pipeline_handoff::prepare_translation_handoff_request",
  "crate::commands::pipeline_handoff::dispatch_translation_handoff_request",
]) expect(registry, marker, "command registry");

for (const marker of [
  "runtimeApi.translateText",
  "Translation command failed",
  "translation_failed",
]) expect(uiControllers, marker, "text translation UI flow");

for (const marker of [
  "previewWordTranslation",
  "case \"halo\"",
  "case \"dunia\"",
  "normalizeLanguageCode",
]) reject(previewTranslation, marker, "disabled preview module");

for (const marker of [
  "localPreviewTranslation",
  "Local preview translation shown because",
  "Local preview",
  "local-preview",
]) reject(uiControllers, marker, "text translation UI flow");

expect(previewTranslation, "return null;", "disabled preview module");

if (errors.length > 0) {
  console.error("Translation flow integrity failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Translation flow integrity passed: text route and V1 pipeline translation handoff use the real helper/engine path while legacy preview fallback remains disabled.");
