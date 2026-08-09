import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");
const repoRoot = resolve(appRoot, "..", "..", "..");

const files = {
  textTranslateCommand: resolve(appRoot, "src-tauri", "src", "commands", "text_translate.rs"),
  helperBridge: resolve(appRoot, "src-tauri", "src", "commands", "helper_bridge.rs"),
  bridgePaths: resolve(appRoot, "src-tauri", "src", "commands", "bridge_paths.rs"),
  engineMod: resolve(appRoot, "src-tauri", "src", "engine", "mod.rs"),
  registry: resolve(appRoot, "src-tauri", "src", "commands", "registry.rs"),
  simpleController: resolve(appRoot, "src", "app", "simple-launcher", "SimpleLauncherController.ts"),
  runtimeProductFacade: resolve(appRoot, "src", "app", "bridge", "runtimeProductFacade.ts"),
  canonicalWorker: resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "realtime_local_worker.py"),
  retiredWorkerEntry: resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "realtime_local_worker_entry.py"),
  retiredAcceleratedWorker: resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "realtime_local_worker_accelerated.py"),
  retiredManualTranslation: resolve(appRoot, "src-tauri", "src", "engine", "manual_translation.rs"),
  retiredManualAccelerated: resolve(appRoot, "src-tauri", "src", "engine", "manual_translation_accelerated.rs"),
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

function forbid(content, marker, label) {
  if (content.includes(marker)) errors.push(`${label}: stale marker still present: ${marker}`);
}

function expectMissing(path, label) {
  if (existsSync(path)) errors.push(`${label}: retired execution owner still exists (${path})`);
}

const textTranslate = readText("textTranslateCommand", files.textTranslateCommand);
const helperBridge = readText("helperBridge", files.helperBridge);
const bridgePaths = readText("bridgePaths", files.bridgePaths);
const engineMod = readText("engineMod", files.engineMod);
const registry = readText("registry", files.registry);
const simpleController = readText("simpleController", files.simpleController);
const runtimeProductFacade = readText("runtimeProductFacade", files.runtimeProductFacade);
const worker = readText("canonicalWorker", files.canonicalWorker);

for (const marker of ["translate_text", "send_helper_worker_task", "start_helper_bridge", 'send_helper_worker_task("translate"']) {
  expect(textTranslate, marker, "text translate command");
}
for (const marker of ["engine::translate_text", "manual_translation", "manual_translation_accelerated"]) {
  forbid(textTranslate, marker, "text translate command");
}

for (const marker of ["worker_script()", "send_helper_worker_task", "start_helper_bridge"]) {
  expect(helperBridge, marker, "helper bridge");
}
expect(bridgePaths, 'worker_root().join("realtime_local_worker.py")', "worker entrypoint");
forbid(bridgePaths, "realtime_local_worker_entry.py", "worker entrypoint");

for (const marker of ['"translate": handle_translate', '"transcribe": handle_transcribe', '"synthesize": handle_synthesize']) {
  expect(worker, marker, "canonical worker handlers");
}

forbid(engineMod, "pub mod manual_translation;", "engine module registry");
forbid(engineMod, "pub mod manual_translation_accelerated;", "engine module registry");
forbid(engineMod, "pub use manual_translation_accelerated::translate_text;", "engine module registry");

expect(registry, "text_translate::translate_text", "command registry");

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

expectMissing(files.retiredWorkerEntry, "worker entry wrapper");
expectMissing(files.retiredAcceleratedWorker, "standalone accelerated worker");
expectMissing(files.retiredManualTranslation, "manual translation engine");
expectMissing(files.retiredManualAccelerated, "one-shot accelerated translation engine");

if (errors.length > 0) {
  console.error("Translation flow integrity failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Translation flow integrity passed: Text uses one Rust command -> persistent helper bridge -> realtime_local_worker.py translate handler, with manual/one-shot worker fallbacks retired.");
