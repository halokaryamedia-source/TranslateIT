import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const tauriSrcRoot = join(appRoot, "src-tauri", "src");

const fail = (message) => {
  console.error(`[rust-source-diagnostics] ${message}`);
  process.exitCode = 1;
};

const readText = (path) => readFileSync(path, "utf8");
const requireFile = (path) => {
  if (!existsSync(path)) fail(`Missing required file: ${path}`);
};
const moduleFile = (root, moduleName) => join(root, `${moduleName}.rs`);

const mainPath = join(tauriSrcRoot, "main.rs");
const commandsModPath = join(tauriSrcRoot, "commands", "mod.rs");
const registryPath = join(tauriSrcRoot, "commands", "registry.rs");
const engineModPath = join(tauriSrcRoot, "engine", "mod.rs");

for (const path of [mainPath, commandsModPath, registryPath, engineModPath]) {
  requireFile(path);
}

if (process.exitCode) process.exit(process.exitCode);

const mainRs = readText(mainPath);
for (const marker of ["mod app_bootstrap;", "mod commands;", "mod engine;", "commands::registry::register", "tauri::generate_context!()"] ) {
  if (!mainRs.includes(marker)) fail(`main.rs marker is missing: ${marker}`);
}

const commandsMod = readText(commandsModPath);
const commandModules = [...commandsMod.matchAll(/^pub mod\s+([a-zA-Z0-9_]+);/gm)].map((match) => match[1]);
if (commandModules.length === 0) fail("commands/mod.rs must declare at least one command module.");
for (const moduleName of commandModules) {
  requireFile(moduleFile(join(tauriSrcRoot, "commands"), moduleName));
}

const engineMod = readText(engineModPath);
const engineModules = [...engineMod.matchAll(/^pub mod\s+([a-zA-Z0-9_]+);/gm)].map((match) => match[1]);
if (engineModules.length === 0) fail("engine/mod.rs must declare at least one engine module.");
for (const moduleName of engineModules) {
  requireFile(moduleFile(join(tauriSrcRoot, "engine"), moduleName));
}

const registry = readText(registryPath);
if (!registry.includes("tauri::generate_handler!")) {
  fail("commands/registry.rs must use tauri::generate_handler!.");
}

const commandRefs = [...registry.matchAll(/crate::commands::([a-zA-Z0-9_]+)::([a-zA-Z0-9_]+)/g)].map((match) => ({
  moduleName: match[1],
  fnName: match[2],
}));

if (commandRefs.length === 0) fail("commands/registry.rs must register at least one command function.");

for (const { moduleName, fnName } of commandRefs) {
  if (!commandModules.includes(moduleName)) {
    fail(`registry.rs references undeclared commands module: ${moduleName}`);
    continue;
  }

  const commandFilePath = moduleFile(join(tauriSrcRoot, "commands"), moduleName);
  const commandFile = readText(commandFilePath);
  const fnPattern = new RegExp(`(?:pub\\s+)?(?:async\\s+)?fn\\s+${fnName}\\s*\\(`);
  if (!fnPattern.test(commandFile)) {
    fail(`registry.rs references missing function ${moduleName}::${fnName}`);
  }
}

for (const [moduleName, fnName] of [
  ["diagnostics", "get_runtime_status_bundle"],
  ["helper_bridge", "start_helper_bridge"],
  ["runtime_capture", "prepare_voice_capture"],
  ["translation", "translate_text"],
  ["audio_studio", "audio_studio_get_provider_status"],
]) {
  if (!commandRefs.some((ref) => ref.moduleName === moduleName && ref.fnName === fnName)) {
    fail(`Expected core command is not registered: ${moduleName}::${fnName}`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`[rust-source-diagnostics] Checked ${commandModules.length} command modules, ${engineModules.length} engine modules, and ${commandRefs.length} registered commands.`);
console.log("[rust-source-diagnostics] Targeted Rust source diagnostics passed. Full cargo check remains deferred.");
