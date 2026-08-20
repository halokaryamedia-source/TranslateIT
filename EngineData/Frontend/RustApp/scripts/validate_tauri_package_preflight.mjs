import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const tauriRoot = join(appRoot, "src-tauri");
const backendRoot = resolve(appRoot, "../../Backend");

const errors = [];
const fail = (message) => errors.push(message);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readText = (path) => readFileSync(path, "utf8");
const requireFile = (path) => {
  if (!existsSync(path)) fail(`Missing required file: ${path}`);
};
const requireMarkers = (body, label, markers) => {
  for (const marker of markers) if (!body.includes(marker)) fail(`${label} marker is missing: ${marker}`);
};
const forbidMarkers = (body, label, markers) => {
  for (const marker of markers) if (body.includes(marker)) fail(`${label} forbidden marker is present: ${marker}`);
};

const packageJsonPath = join(appRoot, "package.json");
const tauriConfigPath = join(tauriRoot, "tauri.conf.json");
const releaseConfigPath = join(tauriRoot, "tauri.release.conf.json");
const cargoTomlPath = join(tauriRoot, "Cargo.toml");
const mainRsPath = join(tauriRoot, "src", "main.rs");
const appBootstrapPath = join(tauriRoot, "src", "app_bootstrap.rs");
const pathsOwnerPath = join(tauriRoot, "src", "engine", "paths.rs");
const bridgePathsPath = join(tauriRoot, "src", "commands", "bridge_paths.rs");
const helperBridgePath = join(tauriRoot, "src", "commands", "helper_bridge.rs");
const meetingOutputPath = join(tauriRoot, "src", "engine", "audio", "meeting_output.rs");
const runtimeInventoryPath = join(tauriRoot, "src", "commands", "runtime_inventory.rs");
const workerPath = join(backendRoot, "LocalWorker", "WorkerRuntime", "realtime_local_worker.py");
const workerPyprojectPath = join(backendRoot, "LocalWorker", "WorkerRuntime", "pyproject.toml");
const defaultCapabilityPath = join(tauriRoot, "capabilities", "default.json");

for (const path of [
  packageJsonPath,
  tauriConfigPath,
  releaseConfigPath,
  cargoTomlPath,
  mainRsPath,
  appBootstrapPath,
  pathsOwnerPath,
  bridgePathsPath,
  helperBridgePath,
  meetingOutputPath,
  runtimeInventoryPath,
  workerPath,
  workerPyprojectPath,
  defaultCapabilityPath,
]) requireFile(path);
if (errors.length) {
  for (const error of errors) console.error(`[tauri-package-preflight] ${error}`);
  process.exit(1);
}

const packageJson = readJson(packageJsonPath);
const tauriConfig = readJson(tauriConfigPath);
const releaseConfig = readJson(releaseConfigPath);
const defaultCapability = readJson(defaultCapabilityPath);
const scripts = packageJson.scripts ?? {};

for (const [name, command] of Object.entries(scripts)) {
  const normalized = String(command).toLowerCase();
  if (name === "build" || normalized.includes("tauri build") || normalized.includes("cargo tauri build")) {
    fail(`Full Tauri build must not be disguised as a source/CI package script: ${name}`);
  }
}
if (scripts["build:frontend"] !== "vite build") fail("Frontend build script must remain vite build.");
if (tauriConfig.productName !== "TranslateIT") fail("Tauri productName must be TranslateIT.");
if (tauriConfig.identifier !== "com.halokaryamedia.translateit") fail("Tauri identifier must remain canonical.");
if (tauriConfig.build?.beforeBuildCommand !== "npm run build:frontend") fail("Tauri beforeBuildCommand must use frontend-only build.");
if (tauriConfig.build?.frontendDist !== "../dist") fail("Tauri frontendDist must point to ../dist.");
if (tauriConfig.bundle?.active !== true) fail("Tauri bundle config must remain active.");
if (!Array.isArray(tauriConfig.bundle?.targets) || !tauriConfig.bundle.targets.includes("nsis")) fail("Tauri bundle targets must include nsis.");
if (releaseConfig.bundle?.windows?.nsis?.installerHooks !== "./target/translateit-r3-payload-hooks.generated.nsh") fail("Release overlay must use the R3 generated NSIS installer hook.");

const mainWindow = tauriConfig.app?.windows?.find((window) => window.label === "main");
if (!mainWindow) fail("Tauri config must declare the main window.");
if (mainWindow && (mainWindow.width < 1280 || mainWindow.height < 760)) fail("Main window size is below the desktop UI contract.");
if (defaultCapability.identifier !== "default") fail("Default capability identifier must be default.");
if (!Array.isArray(defaultCapability.windows) || !defaultCapability.windows.includes("main")) fail("Default capability must apply to main.");
if (!Array.isArray(defaultCapability.permissions) || !defaultCapability.permissions.includes("core:default")) fail("Default capability must include core:default.");

const cargoToml = readText(cargoTomlPath);
requireMarkers(cargoToml, "Cargo.toml", ['name = "translateit"', 'edition = "2021"', 'tauri = { version = "2"', 'tauri-build = { version = "2"']);

const mainRs = readText(mainRsPath);
requireMarkers(mainRs, "Rust main", ["mod app_bootstrap;", "app_bootstrap::configure_main_window"]);

const appBootstrapRs = readText(appBootstrapPath);
requireMarkers(appBootstrapRs, "Tauri packaged path ownership", [
  "ProjectPaths::discover()",
  "is_repository_development()",
  "app.path().resource_dir()?",
  "app.path().app_local_data_dir()?",
  "initialize_tauri_path_context(resource_dir, app_local_data_dir)?",
  "paths.ensure_user_data_dirs()?",
  'std::env::set_var("TRANSLATEIT_RUNTIME_ROOT"',
  'std::env::set_var("TRANSLATEIT_USER_DATA_ROOT"',
]);

const pathsOwnerRs = readText(pathsOwnerPath);
requireMarkers(pathsOwnerRs, "canonical path owner", [
  "static TAURI_PATH_CONTEXT: OnceLock<TauriPathContext>",
  'PATH_MODE_TAURI_PACKAGED: &str = "tauri_packaged_context"',
  'PATH_MODE_REPOSITORY_DEVELOPMENT: &str = "repository_development_fallback"',
  "pub runtime_root: String",
  "pub worker_runtime_dir: String",
  "pub python_runtime_dir: String",
  '.join("PythonRuntime")',
  "pub fn initialize_tauri_path_context(",
  "pub fn ensure_user_data_dirs(&self)",
]);

const bridgePathsRs = readText(bridgePathsPath);
requireMarkers(bridgePathsRs, "packaged Python resolver", [
  "ProjectPaths::discover().worker_runtime_dir",
  "paths.python_runtime_dir",
  "paths.packaged_context_initialized",
  "if !paths.is_repository_development() {",
  '.join("python.exe")',
  'source: "packaged_python_runtime".to_string()',
  "pub fn resolve_worker_python_command()",
]);

const helperBridgeRs = readText(helperBridgePath);
requireMarkers(helperBridgeRs, "persistent helper ownership", ["resolve_worker_python_command", "worker_python_unavailable_message", "Command::new(&python.program)"]);
forbidMarkers(helperBridgeRs, "legacy helper Python selection", ["worker_python_candidates", "install Python on PATH"]);

const meetingOutputRs = readText(meetingOutputPath);
requireMarkers(meetingOutputRs, "Rust Meeting audio delivery", ["pub fn prepare_meeting_output_device(", "pub fn deliver_meeting_output_wav(", ".build_output_stream("]);

const workerPyproject = readText(workerPyprojectPath);
requireMarkers(workerPyproject, "canonical WorkerRuntime dependency set", [
  '"ctranslate2==4.8.1",',
  '"faster-whisper>=1.0.0",',
  '"torch==2.11.0",',
  '"torchaudio==2.11.0",',
  '"transformers==4.57.6",',
]);
forbidMarkers(workerPyproject, "retired WorkerRuntime dependency boundary", [
  '"transformers>=4.44.0,<=4.50.0",',
  '"sounddevice>=0.4.6,<1",',
  "[project.optional-dependencies]",
]);

const worker = readText(workerPath);
requireMarkers(worker, "worker runtime/user path split", [
  '"TRANSLATEIT_RUNTIME_ROOT"',
  '"TRANSLATEIT_USER_DATA_ROOT"',
  "RUNTIME_ASSETS_ROOT = RUNTIME_ROOT",
  'CACHE_ROOT = USER_DATA_ROOT / "CacheData"',
  'LOG_ROOT = USER_DATA_ROOT / "LogData"',
]);

const runtimeInventoryRs = readText(runtimeInventoryPath);
requireMarkers(runtimeInventoryRs, "model inventory path consumers", ["project_paths.runtime_root", "project_paths.worker_runtime_dir", "project_paths.user_cache_dir"]);
forbidMarkers(runtimeInventoryRs, "model inventory project-root derivation", ["project_paths.project_root"]);

if (errors.length) {
  for (const error of errors) console.error(`[tauri-package-preflight] ${error}`);
  process.exit(1);
}
console.log("[tauri-package-preflight] Tauri/WorkerRuntime source contract PASS: packaged paths remain resource-dir owned, production uses the private Python runtime, WorkerRuntime is pinned to Transformers 4.57.6, and the R3 release overlay delegates large offline payload installation to the generated NSIS hook. Artifact/install/clean-machine proof remains separate.");
