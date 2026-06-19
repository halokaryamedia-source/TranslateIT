import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const runtimeApiPath = resolve(appRoot, "src", "app", "bridge", "runtimeApi.ts");
const registryPath = resolve(appRoot, "src-tauri", "src", "commands", "registry.rs");

const requiredCriticalCommands = [
  "translate_text",
  "start_capture",
  "stop_capture",
  "prepare_voice_capture",
  "get_input_status",
  "get_helper_bridge_status",
  "start_helper_bridge",
  "stop_helper_bridge",
  "send_helper_bridge_request",
  "load_runtime_settings",
  "save_runtime_settings",
  "save_default_runtime_settings",
  "get_runtime_status_bundle",
  "get_runtime_diagnostics",
  "get_realtime_status_payload",
  "get_gpu_policy",
  "get_model_inventory",
  "get_latest_audio_pipeline_evidence",
  "get_latest_audio_studio_validation_evidence",
];

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function unique(values) {
  return Array.from(new Set(values)).sort();
}

function frontendCommands(content) {
  const commands = [];
  for (const match of content.matchAll(/invoke(?:Or|Nullable)?<[^>]*>\("([a-zA-Z0-9_]+)"/g)) commands.push(match[1]);
  for (const match of content.matchAll(/invoke(?:Or|Nullable)?\("([a-zA-Z0-9_]+)"/g)) commands.push(match[1]);
  return unique(commands);
}

function backendCommands(content) {
  const commands = [];
  for (const match of content.matchAll(/crate::commands::[a-zA-Z0-9_]+::([a-zA-Z0-9_]+)/g)) commands.push(match[1]);
  return unique(commands);
}

function runtimeApiMethods(content) {
  const methods = [];
  for (const match of content.matchAll(/\n\s*(?:async\s+)?([a-zA-Z0-9_]+)\([^)]*\)\s*:\s*[^{]+\{/g)) methods.push(match[1]);
  return unique(methods.filter((method) => method !== "invokeOr" && method !== "invokeNullable" && method !== "loadRuntimeSettings"));
}

function commandToMethodCoverage(content, commands) {
  const coverage = {};
  for (const command of commands) {
    const index = content.indexOf(`"${command}"`);
    const prefix = index >= 0 ? content.slice(Math.max(0, index - 500), index) : "";
    const methodMatches = Array.from(prefix.matchAll(/(?:async\s+)?([a-zA-Z0-9_]+)\([^)]*\)\s*:\s*[^{]+\{/g));
    coverage[command] = methodMatches.at(-1)?.[1] ?? "unknown";
  }
  return coverage;
}

function directInvokeCommands(content) {
  const commands = [];
  for (const match of content.matchAll(/\binvoke<[^>]*>\("([a-zA-Z0-9_]+)"/g)) commands.push(match[1]);
  for (const match of content.matchAll(/\binvoke\("([a-zA-Z0-9_]+)"/g)) commands.push(match[1]);
  return unique(commands);
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const runtimeApi = read(runtimeApiPath);
  const registry = read(registryPath);
  const frontend = frontendCommands(runtimeApi);
  const backend = backendCommands(registry);
  const missingBackend = frontend.filter((command) => !backend.includes(command));
  const backendOnly = backend.filter((command) => !frontend.includes(command));
  const missingCriticalFrontend = requiredCriticalCommands.filter((command) => !frontend.includes(command));
  const missingCriticalBackend = requiredCriticalCommands.filter((command) => !backend.includes(command));
  const directInvokes = directInvokeCommands(runtimeApi);
  const unwrappedDirectInvokes = directInvokes.filter((command) => !frontend.includes(command));
  const hasCommandErrorBuffer = runtimeApi.includes("commandErrors") && runtimeApi.includes("recordCommandError") && runtimeApi.includes("getCommandErrors");
  const hasFallbackBridge = runtimeApi.includes("invokeOr") && runtimeApi.includes("invokeNullable");
  const methodCoverage = commandToMethodCoverage(runtimeApi, frontend);
  const methods = runtimeApiMethods(runtimeApi);
  const ok = runtimeApi.length > 0
    && registry.length > 0
    && missingBackend.length === 0
    && missingCriticalFrontend.length === 0
    && missingCriticalBackend.length === 0
    && unwrappedDirectInvokes.length === 0
    && hasCommandErrorBuffer
    && hasFallbackBridge;
  const report = {
    schema: "translateit.frontend_backend_contract_report.v2",
    generated_at: new Date().toISOString(),
    ok,
    runtime_api_path: runtimeApiPath,
    registry_path: registryPath,
    frontend_commands: frontend,
    backend_commands: backend,
    runtime_api_methods: methods,
    command_to_runtime_api_method: methodCoverage,
    missing_backend_commands: missingBackend,
    backend_only_commands: backendOnly,
    required_critical_commands: requiredCriticalCommands,
    missing_critical_frontend_commands: missingCriticalFrontend,
    missing_critical_backend_commands: missingCriticalBackend,
    direct_invoke_commands: directInvokes,
    unwrapped_direct_invoke_commands: unwrappedDirectInvokes,
    has_command_error_buffer: hasCommandErrorBuffer,
    has_fallback_bridge: hasFallbackBridge,
  };
  const latestJson = resolve(reportDir, "latest-frontend-backend-contract.json");
  const latestMd = resolve(reportDir, "latest-frontend-backend-contract.md");
  const md = [
    "# TranslateIT Frontend Backend Contract Report",
    "",
    `OK: ${ok}`,
    `Command error buffer: ${hasCommandErrorBuffer}`,
    `Fallback bridge wrappers: ${hasFallbackBridge}`,
    "",
    "## Frontend commands missing in Rust registry",
    "",
    missingBackend.length ? missingBackend.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Required critical commands missing in runtimeApi",
    "",
    missingCriticalFrontend.length ? missingCriticalFrontend.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Required critical commands missing in Rust registry",
    "",
    missingCriticalBackend.length ? missingCriticalBackend.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Direct invoke commands not covered by wrapper scan",
    "",
    unwrappedDirectInvokes.length ? unwrappedDirectInvokes.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Rust registry commands not currently called by runtimeApi",
    "",
    backendOnly.length ? backendOnly.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Frontend invoke commands",
    "",
    frontend.map((item) => `- ${item} -> ${methodCoverage[item] ?? "unknown"}`).join("\n"),
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Frontend backend contract report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, frontend: frontend.length, backend: backend.length, missingBackend, missingCriticalFrontend, missingCriticalBackend, unwrappedDirectInvokes }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();
