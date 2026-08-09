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

const textTranslate = readText("textTranslateCommand", files.textTranslateCommand);
const pipeline = readText("pipelineHandoff", files.pipelineHandoff);
const registry = readText("registry", files.registry);
const simpleController = readText("simpleController", files.simpleController);
const runtimeProductFacade = readText("runtimeProductFacade", files.runtimeProductFacade);

for (const marker of ["translate_text", "engine::translate_text"]) expect(textTranslate, marker, "text translate command");

for (const marker of [
  "PipelinePayloadState",
  "prepare_translation_handoff_request",
  "dispatch_translation_handoff_request",
  "translation_handoff",
  "translated_text",
  "tts_text",
]) expect(pipeline, marker, "pipeline handoff");

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

if (errors.length > 0) {
  console.error("Translation flow integrity failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Translation flow integrity passed: simple UI -> runtimeProductFacade -> runtimeApi.translateText -> Rust translate_text remains the current product path.");
