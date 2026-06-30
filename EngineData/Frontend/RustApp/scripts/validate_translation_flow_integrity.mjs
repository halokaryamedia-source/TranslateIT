import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");

const files = {
  textTranslateCommand: resolve(appRoot, "src-tauri", "src", "commands", "text_translate.rs"),
  pipelineHandoff: resolve(appRoot, "src-tauri", "src", "commands", "pipeline_handoff.rs"),
  registry: resolve(appRoot, "src-tauri", "src", "commands", "registry.rs"),
  simpleController: resolve(appRoot, "src", "app", "simple-launcher", "SimpleLauncherController.ts"),
  runtimeProductFacade: resolve(appRoot, "src", "app", "bridge", "runtimeProductFacade.ts"),
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
const registry = readText("registry", files.registry);
const simpleController = readText("simpleController", files.simpleController);
const runtimeProductFacade = readText("runtimeProductFacade", files.runtimeProductFacade);
const previewTranslation = readText("previewTranslation", files.previewTranslation);

for (const marker of [
  "translate_text",
  "engine::translate_text",
]) expect(textTranslate, marker, "text translate command");

for (const marker of [
  "PipelinePayloadState",
  "prepare_translation_handoff_request",
  "dispatch_translation_handoff_request",
  "translation_handoff",
  "translated_text",
  "tts_text",
]) expect(pipeline, marker, "V1 pipeline handoff");

for (const marker of [
  "text_translate::translate_text",
  "pipeline_handoff::prepare_translation_handoff_request",
  "pipeline_handoff::dispatch_translation_handoff_request",
]) expect(registry, marker, "command registry");

for (const marker of [
  "runProductTranslation",
  "Translation completed",
  "Translation blocked",
  "translationResultView",
]) expect(simpleController, marker, "simple text translation UI flow");

for (const marker of [
  "runtimeApi.translateText",
  "ProductTranslationResult",
  "runProductTranslation",
]) expect(runtimeProductFacade, marker, "runtime product facade translation bridge");

for (const marker of [
  "previewWordTranslation",
  "case \"halo\"",
  "case \"dunia\"",
  "normalizeLanguageCode",
]) reject(previewTranslation, marker, "disabled preview module");

expect(previewTranslation, "return null;", "disabled preview module");

if (errors.length > 0) {
  console.error("Translation flow integrity failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Translation flow integrity passed: simple UI -> runtimeProductFacade -> runtimeApi.translateText -> Rust translate_text stays wired; legacy preview implementation stays disabled.");
