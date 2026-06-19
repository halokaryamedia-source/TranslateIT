import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredPaths = [
  "src-tauri/src/engine/mod.rs",
  "src-tauri/src/engine/paths.rs",
  "src-tauri/src/engine/settings.rs",
  "src-tauri/src/engine/manual_translation.rs",
  "src-tauri/src/engine/session_store.rs",
  "src-tauri/src/engine/state.rs",
  "src-tauri/src/commands/mod.rs",
  "src-tauri/src/main.rs",
  "src/app/shared/tauriBridge.ts",
  "src/app/active-launcher/launcherController.ts",
  "package.json",
];

const requiredScripts = [
  "validate:full",
  "status:all",
  "status:translation",
  "status:audio-pipeline",
  "validate:engine-total",
  "check:rust",
  "build:frontend",
];

const requiredCommands = [
  "get_runtime_status_bundle",
  "get_runtime_diagnostics",
  "get_helper_bridge_status",
  "get_hardware_usage",
  "load_runtime_settings",
  "save_runtime_settings",
  "translate_text",
  "create_chat_session",
  "append_chat_message",
  "list_chat_sessions",
  "get_input_status",
  "list_audio_devices",
  "start_capture",
  "stop_capture",
  "audio_studio_get_provider_status",
  "audio_studio_get_quality_gate_status",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fail(message) {
  console.error(`[validate:engine-total] ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`[validate:engine-total] ${message}`);
}

let exitCode = 0;

for (const relative of requiredPaths) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    fail(`missing required file: ${relative}`);
    exitCode = 1;
  }
}

const packageJson = readJson(path.join(root, "package.json"));
for (const script of requiredScripts) {
  if (!packageJson.scripts?.[script]) {
    fail(`missing script: ${script}`);
    exitCode = 1;
  }
}

const mainSource = fs.readFileSync(path.join(root, "src-tauri/src/main.rs"), "utf8");
const bridgeNames = requiredCommands.filter((command) => mainSource.includes(command));
for (const command of requiredCommands) {
  if (!mainSource.includes(command)) {
    fail(`invoke handler missing command: ${command}`);
    exitCode = 1;
  }
}

const engineMod = fs.readFileSync(path.join(root, "src-tauri/src/engine/mod.rs"), "utf8");
const engineModules = [
  "pub mod adapters;",
  "pub mod audio;",
  "pub mod diagnostics;",
  "pub mod inference;",
  "pub mod manual_translation;",
  "pub mod models;",
  "pub mod native_execution;",
  "pub mod paths;",
  "pub mod playback;",
  "pub mod runtime_settings;",
  "pub mod runtime_state;",
  "pub mod session_chat;",
  "pub mod session_store;",
  "pub mod settings;",
  "pub mod state;",
  "pub mod status_runtime;",
  "pub mod transcript;",
  "pub mod transcript_session;",
];

for (const moduleLine of engineModules) {
  if (!engineMod.includes(moduleLine)) {
    fail(`engine module declaration missing: ${moduleLine}`);
    exitCode = 1;
  }
}

ok(`files checked: ${requiredPaths.length}`);
ok(`scripts checked: ${requiredScripts.length}`);
ok(`bridge commands checked: ${bridgeNames.length}/${requiredCommands.length}`);
ok(`engine module declarations checked: ${engineModules.length}`);

if (exitCode !== 0) {
  process.exit(exitCode);
}

console.log(JSON.stringify({
  result: "PASS",
  filesChecked: requiredPaths.length,
  scriptsChecked: requiredScripts.length,
  bridgeCommandsChecked: requiredCommands.length,
  engineModulesChecked: engineModules.length,
}, null, 2));


