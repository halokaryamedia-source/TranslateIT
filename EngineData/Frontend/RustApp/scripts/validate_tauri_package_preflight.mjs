import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const tauriRoot = join(appRoot, "src-tauri");
const backendRoot = resolve(appRoot, "../../Backend");

const fail = (message) => {
  console.error(`[tauri-package-preflight] ${message}`);
  process.exitCode = 1;
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readText = (path) => readFileSync(path, "utf8");
const requireFile = (path) => {
  if (!existsSync(path)) fail(`Missing required file: ${path}`);
};
const requireMarkers = (body, label, markers) => {
  for (const marker of markers) {
    if (!body.includes(marker)) fail(`${label} marker is missing: ${marker}`);
  }
};
const forbidMarkers = (body, label, markers) => {
  for (const marker of markers) {
    if (body.includes(marker)) fail(`${label} forbidden marker is present: ${marker}`);
  }
};

const packageJsonPath = join(appRoot, "package.json");
const tauriConfigPath = join(tauriRoot, "tauri.conf.json");
const cargoTomlPath = join(tauriRoot, "Cargo.toml");
const buildRsPath = join(tauriRoot, "build.rs");
const mainRsPath = join(tauriRoot, "src", "main.rs");
const appBootstrapPath = join(tauriRoot, "src", "app_bootstrap.rs");
const pathsOwnerPath = join(tauriRoot, "src", "engine", "paths.rs");
const bridgePathsPath = join(tauriRoot, "src", "commands", "bridge_paths.rs");
const helperBridgePath = join(tauriRoot, "src", "commands", "helper_bridge.rs");
const meetingOutputPath = join(tauriRoot, "src", "engine", "audio", "meeting_output.rs");
const retiredRouteProviderPath = join(backendRoot, "LocalWorker", "WorkerRuntime", "virtual_audio_route_provider.py");
const runtimeInventoryPath = join(tauriRoot, "src", "commands", "runtime_inventory.rs");
const workerPath = join(backendRoot, "LocalWorker", "WorkerRuntime", "realtime_local_worker.py");
const workerPyprojectPath = join(backendRoot, "LocalWorker", "WorkerRuntime", "pyproject.toml");
const defaultCapabilityPath = join(tauriRoot, "capabilities", "default.json");

for (const path of [
  packageJsonPath,
  tauriConfigPath,
  cargoTomlPath,
  buildRsPath,
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
]) {
  requireFile(path);
}

if (process.exitCode) process.exit(process.exitCode);

const packageJson = readJson(packageJsonPath);
const tauriConfig = readJson(tauriConfigPath);
const defaultCapability = readJson(defaultCapabilityPath);
const scripts = packageJson.scripts ?? {};

const fullTauriBuildCommands = [
  "tauri build",
  "cargo tauri build",
  "npm run tauri build",
];

for (const [name, command] of Object.entries(scripts)) {
  const normalized = String(command).toLowerCase();
  if (name === "build" || fullTauriBuildCommands.some((marker) => normalized.includes(marker))) {
    fail(`Full Tauri build script must not be exposed during source/CI preflight: ${name}`);
  }
}

if (scripts["build:frontend"] !== "vite build") {
  fail("Frontend build script must remain vite build.");
}

if (tauriConfig.productName !== "TranslateIT") {
  fail("Tauri productName must be TranslateIT.");
}

if (tauriConfig.identifier !== "com.halokaryamedia.translateit") {
  fail("Tauri identifier must be com.halokaryamedia.translateit.");
}

if (tauriConfig.build?.beforeBuildCommand !== "npm run build:frontend") {
  fail("Tauri beforeBuildCommand must use the frontend-only build script.");
}

if (tauriConfig.build?.frontendDist !== "../dist") {
  fail("Tauri frontendDist must point to ../dist.");
}

const mainWindow = tauriConfig.app?.windows?.find((window) => window.label === "main");
if (!mainWindow) {
  fail("Tauri config must declare a window with label main.");
}

if (mainWindow && (mainWindow.width < 1280 || mainWindow.height < 760)) {
  fail("Main window size must remain suitable for the desktop UI.");
}

if (tauriConfig.bundle?.active !== true) {
  fail("Tauri bundle config must remain active for future installer preparation.");
}

if (!Array.isArray(tauriConfig.bundle?.targets) || !tauriConfig.bundle.targets.includes("nsis")) {
  fail("Tauri bundle targets must include nsis for Windows installer preparation.");
}

if (defaultCapability.identifier !== "default") {
  fail("Default capability identifier must be default.");
}

if (!Array.isArray(defaultCapability.windows) || !defaultCapability.windows.includes("main")) {
  fail("Default capability must apply to the main window.");
}

if (!Array.isArray(defaultCapability.permissions) || !defaultCapability.permissions.includes("core:default")) {
  fail("Default capability must include core:default.");
}

const cargoToml = readText(cargoTomlPath);
for (const marker of [
  'name = "translateit"',
  'edition = "2021"',
  'tauri = { version = "2"',
  'tauri-build = { version = "2"',
]) {
  if (!cargoToml.includes(marker)) fail(`Cargo.toml marker is missing: ${marker}`);
}

const mainRs = readText(mainRsPath);
if (!mainRs.includes("mod app_bootstrap;")) {
  fail("Rust main.rs must include the app_bootstrap module.");
}

if (!mainRs.includes("app_bootstrap::configure_main_window")) {
  fail("Rust main.rs must use the app_bootstrap main window configuration hook.");
}

const appBootstrapRs = readText(appBootstrapPath);
requireMarkers(appBootstrapRs, "Tauri bootstrap path ownership", [
  'get_webview_window("main")',
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
requireMarkers(pathsOwnerRs, "canonical packaged/runtime path owner", [
  "static TAURI_PATH_CONTEXT: OnceLock<TauriPathContext>",
  'PATH_MODE_TAURI_PACKAGED: &str = "tauri_packaged_context"',
  'PATH_MODE_REPOSITORY_DEVELOPMENT: &str = "repository_development_fallback"',
  "pub runtime_root: String",
  "pub worker_runtime_dir: String",
  "pub python_runtime_dir: String",
  '.join("PythonRuntime")',
  "pub user_data_root: String",
  "pub fn initialize_tauri_path_context(",
  "!runtime_root.is_absolute() || !user_data_root.is_absolute()",
  "cfg!(debug_assertions)",
  'candidate.join("AGENTS.md").is_file()',
  '.join("RustApp")',
  "pub fn ensure_user_data_dirs(&self)",
]);

const bridgePathsRs = readText(bridgePathsPath);
requireMarkers(bridgePathsRs, "shared packaged Python resolver", [
  "ProjectPaths::discover().worker_runtime_dir",
  "paths.python_runtime_dir",
  "ProjectPaths::discover().user_cache_dir",
  "paths.packaged_context_initialized",
  "if !paths.is_repository_development() {",
  '.join("python.exe")',
  'source: "packaged_python_runtime".to_string()',
  "return candidate.program.is_file().then_some(candidate);",
  'std::env::var("TRANSLATEIT_WORKER_PYTHON")',
  "development_python_command_available",
  "pub fn resolve_worker_python_command()",
  "pub fn worker_python_unavailable_message()",
]);

const helperBridgeRs = readText(helperBridgePath);
requireMarkers(helperBridgeRs, "persistent helper interpreter ownership", [
  "resolve_worker_python_command",
  "worker_python_unavailable_message",
  "Command::new(&python.program)",
  "command.args(&python.bootstrap_args)",
]);
forbidMarkers(helperBridgeRs, "persistent helper legacy Python selection", [
  "worker_python_candidates",
  "worker_python_command_available",
  "install Python on PATH",
]);

const meetingOutputRs = readText(meetingOutputPath);
requireMarkers(meetingOutputRs, "Rust Meeting Microphone delivery ownership", [
  "pub fn prepare_meeting_output_device(",
  "pub fn deliver_meeting_output_wav(",
  ".build_output_stream(",
]);
if (existsSync(retiredRouteProviderPath)) {
  fail("Retired Python virtual-audio route provider must not be packaged as a second Meeting output owner.");
}

const workerPyproject = readText(workerPyprojectPath);
requireMarkers(workerPyproject, "installed worker dependency set", [
  '"ctranslate2==4.8.1",',
  '"faster-whisper>=1.0.0",',
  '"torch==2.11.0",',
  '"transformers>=4.44.0,<=4.50.0",',
]);
forbidMarkers(workerPyproject, "retired Python audio-route dependency", [
  '"sounddevice>=0.4.6,<1",',
]);
forbidMarkers(workerPyproject, "runtime dependency hidden behind optional extra", [
  "[project.optional-dependencies]",
  "virtual-audio-route = [",
]);

const worker = readText(workerPath);
requireMarkers(worker, "worker packaged/runtime path split", [
  'SCRIPT_ROOT = Path(__file__).resolve().parents[4]',
  '"TRANSLATEIT_RUNTIME_ROOT"',
  '"TRANSLATEIT_USER_DATA_ROOT"',
  "RUNTIME_ASSETS_ROOT = RUNTIME_ROOT",
  'CACHE_ROOT = USER_DATA_ROOT / "CacheData"',
  'LOG_ROOT = USER_DATA_ROOT / "LogData"',
  'normalized == "UserData" or normalized.startswith("UserData/")',
  "path = USER_DATA_ROOT / relative",
  "path = RUNTIME_ROOT / path",
  'raise ValueError("worker:path_outside_allowed_roots")',
]);
forbidMarkers(worker, "worker repository-coupled writable paths", [
  '\nROOT = Path(__file__).resolve().parents[4]\n',
  'CACHE_ROOT = ROOT / "UserData"',
  'ALLOWED_INPUT_ROOTS = [ROOT / "UserData"',
]);

const runtimeInventoryRs = readText(runtimeInventoryPath);
requireMarkers(runtimeInventoryRs, "model inventory path consumers", [
  "project_paths.runtime_root",
  "project_paths.worker_runtime_dir",
  "project_paths.user_cache_dir",
]);
forbidMarkers(runtimeInventoryRs, "model inventory project-root derivation", [
  "project_paths.project_root",
]);

if (process.exitCode) process.exit(process.exitCode);
console.log(
  "[tauri-package-preflight] Packaged interpreter ownership remains source-aligned: packaged mode resolves only EngineData/Backend/LocalWorker/PythonRuntime/python.exe, repository Python fallbacks stay behind verified development mode, the persistent worker uses the frozen canonical dependency graph, and Meeting audio delivery remains inside Rust/CPAL. The P3 release overlay/resource map is validated separately; actual staged payload bytes, installed execution, and clean-machine operation remain separate proof.",
);
