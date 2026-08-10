import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const workerRoot = resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime");

const files = {
  textTranslateCommand: resolve(appRoot, "src-tauri", "src", "commands", "text_translate.rs"),
  helperBridge: resolve(appRoot, "src-tauri", "src", "commands", "helper_bridge.rs"),
  helperBridgeRuntime: resolve(appRoot, "src-tauri", "src", "commands", "helper_bridge_runtime.rs"),
  meetingSession: resolve(appRoot, "src-tauri", "src", "commands", "meeting_session.rs"),
  settingsCommand: resolve(appRoot, "src-tauri", "src", "commands", "settings.rs"),
  bridgePaths: resolve(appRoot, "src-tauri", "src", "commands", "bridge_paths.rs"),
  workerManifestLogic: resolve(appRoot, "src-tauri", "src", "engine", "adapters", "local_worker_manifest_logic.rs"),
  engineMod: resolve(appRoot, "src-tauri", "src", "engine", "mod.rs"),
  registry: resolve(appRoot, "src-tauri", "src", "commands", "registry.rs"),
  simpleController: resolve(appRoot, "src", "app", "simple-launcher", "SimpleLauncherController.ts"),
  runtimeProductFacade: resolve(appRoot, "src", "app", "bridge", "runtimeProductFacade.ts"),
  canonicalWorker: resolve(workerRoot, "realtime_local_worker.py"),
  pythonProject: resolve(workerRoot, "pyproject.toml"),
  workerTests: resolve(workerRoot, "tests", "test_worker_contract.py"),
  retiredRequirements: resolve(workerRoot, "requirements-realtime.txt"),
  retiredRouteRequirements: resolve(workerRoot, "requirements-virtual-audio-route.txt"),
  retiredStackManifest: resolve(workerRoot, "realtime_stack_manifest.json"),
  retiredCudaSetup: resolve(workerRoot, "setup_pytorch_cuda.ps1"),
  retiredCt2Setup: resolve(workerRoot, "setup_ctranslate2_translation_model.py"),
  retiredWorkerEntry: resolve(workerRoot, "realtime_local_worker_entry.py"),
  retiredAcceleratedWorker: resolve(workerRoot, "realtime_local_worker_accelerated.py"),
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
  if (existsSync(path)) errors.push(`${label}: retired execution/config owner still exists (${path})`);
}

const textTranslate = readText("textTranslateCommand", files.textTranslateCommand);
const helperBridge = readText("helperBridge", files.helperBridge);
const helperBridgeRuntime = readText("helperBridgeRuntime", files.helperBridgeRuntime);
const meetingSession = readText("meetingSession", files.meetingSession);
const settingsCommand = readText("settingsCommand", files.settingsCommand);
const bridgePaths = readText("bridgePaths", files.bridgePaths);
const workerManifestLogic = readText("workerManifestLogic", files.workerManifestLogic);
const engineMod = readText("engineMod", files.engineMod);
const registry = readText("registry", files.registry);
const simpleController = readText("simpleController", files.simpleController);
const runtimeProductFacade = readText("runtimeProductFacade", files.runtimeProductFacade);
const worker = readText("canonicalWorker", files.canonicalWorker);
const pythonProject = readText("pythonProject", files.pythonProject);
const workerTests = readText("workerTests", files.workerTests);

for (const marker of [
  "translate_text",
  "send_helper_worker_task",
  "start_helper_bridge",
  'const TEXT_TRANSLATION_MODE: &str = "Quality"',
  '"mode": TEXT_TRANSLATION_MODE',
  'send_helper_worker_task("translate"',
]) expect(textTranslate, marker, "text translate command");
for (const marker of [
  "engine::translate_text",
  "manual_translation",
  "manual_translation_accelerated",
  '"mode": settings.runtime_profile',
]) forbid(textTranslate, marker, "text translate command");

for (const marker of [
  "worker_script()",
  "send_helper_worker_task",
  "HelperTaskPriority",
  "meeting_generation",
  "runtime_generation_is_authoritative",
  "request_id",
  "cancel_helper_bridge_meeting_generation",
  "latest_runtime_session_state",
]) expect(helperBridge, marker, "helper scheduler bridge");

for (const marker of [
  "Condvar",
  "waiting_meeting",
  "waiting_text",
  "scheduler_can_enter",
  "active_request_id",
  "active_meeting_generation",
]) expect(helperBridgeRuntime, marker, "helper scheduler state");

expect(meetingSession, '"mode": "Realtime"', "Meeting outbound mode ownership");
expect(settingsCommand, 'settings.runtime_profile = "Quality".to_string()', "legacy profile compatibility");

expect(bridgePaths, 'worker_root().join("realtime_local_worker.py")', "worker entrypoint");
forbid(bridgePaths, "realtime_local_worker_entry.py", "worker entrypoint");

for (const marker of [
  '"translate": handle_translate',
  '"transcribe": handle_transcribe',
  '"synthesize": handle_synthesize',
  "normalize_mode",
  "truncation=False",
  "translation:input_too_long_for_model",
  "translation:model_input_limit_unknown",
  "No alternate mode was attempted.",
]) expect(worker, marker, "canonical worker contracts");
for (const marker of [
  "truncation=True",
  "fallback_mode",
  "MODEL_RUNTIME_MANIFEST",
  "RUNTIME_MANIFEST",
]) forbid(worker, marker, "canonical worker contracts");

for (const marker of [
  'name = "translateit-worker-runtime"',
  'requires-python = ">=3.10"',
  'virtual-audio-route = [',
  '[dependency-groups]',
  '"pytest"',
  '"ruff"',
  '[tool.uv]',
  'package = false',
  '[tool.pytest.ini_options]',
]) expect(pythonProject, marker, "canonical WorkerRuntime pyproject");

for (const marker of [
  "test_translate_rejects_unknown_mode_before_model_load",
  "test_realtime_unsupported_direction_does_not_switch_mode",
  "test_translate_rejects_character_overflow_before_model_load",
  "test_newline_json_protocol_rejects_unknown_command",
]) expect(workerTests, marker, "deterministic worker tests");

for (const marker of [
  'worker_root.join("pyproject.toml")',
  "local_worker:python_project_missing",
  "uv_lock_not_verified_or_committed",
]) expect(workerManifestLogic, marker, "static WorkerRuntime diagnostics");
for (const marker of ["requirements-realtime.txt", "realtime_stack_manifest.json"]) {
  forbid(workerManifestLogic, marker, "static WorkerRuntime diagnostics");
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
  'const currentTextMode = "Quality"',
  "const textReady = qualityTranslationReady",
]) expect(runtimeProductFacade, marker, "runtime product facade translation bridge");

expectMissing(files.retiredRequirements, "realtime requirements file");
expectMissing(files.retiredRouteRequirements, "virtual route requirements file");
expectMissing(files.retiredStackManifest, "realtime stack manifest");
expectMissing(files.retiredCudaSetup, "side-channel PyTorch CUDA installer");
expectMissing(files.retiredCt2Setup, "retired CTranslate2 translation setup");
expectMissing(files.retiredWorkerEntry, "worker entry wrapper");
expectMissing(files.retiredAcceleratedWorker, "standalone accelerated worker");
expectMissing(files.retiredManualTranslation, "manual translation engine");
expectMissing(files.retiredManualAccelerated, "one-shot accelerated translation engine");

if (errors.length > 0) {
  console.error("Translation source-contract integrity failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  "Translation source-contract integrity passed: Text owns Quality, Meeting owns Realtime, one helper scheduler owns worker I/O, stale Meeting generations are rejected, translation input is not silently truncated, and pyproject.toml is the single WorkerRuntime dependency/tooling owner. This is static source proof only, not uv resolution, Ruff/pytest execution, runtime/model, or scheduling performance proof.",
);
