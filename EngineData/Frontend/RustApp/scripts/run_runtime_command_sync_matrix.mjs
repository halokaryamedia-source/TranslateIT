import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendFailureDetails, buildReportDir, markdownCell, scenarioResult, summarizeResults, writeJsonAndMarkdown } from "./functional_matrix_utils.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = buildReportDir(repoRoot);
const runtimeApiPath = resolve(appRoot, "src", "app", "bridge", "runtimeApi.ts");
const registryPath = resolve(appRoot, "src-tauri", "src", "commands", "registry.rs");
const EXPECTED_CRITICAL_COMMANDS = [
  "translate_text",
  "get_runtime_status_bundle",
  "get_runtime_diagnostics",
  "start_helper_bridge",
  "check_helper_bridge_health",
  "prepare_voice_capture",
  "start_capture",
  "stop_capture",
  "get_input_status",
  "list_audio_devices",
  "load_runtime_settings",
  "save_runtime_settings",
  "verify_models",
  "setup_models",
  "get_model_inventory",
];

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function collectMatches(source, regex) {
  const values = [];
  let match;
  while ((match = regex.exec(source)) !== null) values.push(match[1]);
  return unique(values);
}

function collectFrontendCommands(source) {
  return unique([
    ...collectMatches(source, /invokeOr<[^>]+>\(\s*"([a-zA-Z0-9_]+)"/g),
    ...collectMatches(source, /invokeNullable<[^>]+>\(\s*"([a-zA-Z0-9_]+)"/g),
  ]);
}

function collectRegistryCommands(source) {
  return collectMatches(source, /crate::commands::[a-zA-Z0-9_]+::([a-zA-Z0-9_]+)/g);
}

function runSyncScenario() {
  const scenario = {
    id: "runtime_api_to_rust_registry_sync",
    title: "Runtime API to Rust command registry sync",
    purpose: "Checks that frontend runtimeApi command invocations are backed by registered Rust/Tauri commands.",
  };
  const started = Date.now();
  const runtimeApi = existsSync(runtimeApiPath) ? readFileSync(runtimeApiPath, "utf8") : "";
  const registry = existsSync(registryPath) ? readFileSync(registryPath, "utf8") : "";
  const frontendCommands = collectFrontendCommands(runtimeApi);
  const backendCommands = collectRegistryCommands(registry);
  const missingBackend = frontendCommands.filter((command) => !backendCommands.includes(command));
  const missingCriticalFrontend = EXPECTED_CRITICAL_COMMANDS.filter((command) => !frontendCommands.includes(command));
  const missingCriticalBackend = EXPECTED_CRITICAL_COMMANDS.filter((command) => !backendCommands.includes(command));
  const backendOnly = backendCommands.filter((command) => !frontendCommands.includes(command));
  const checks = [
    { id: "runtime_api_exists", ok: runtimeApi.length > 0, detail: runtimeApiPath },
    { id: "registry_exists", ok: registry.length > 0, detail: registryPath },
    { id: "frontend_commands_found", ok: frontendCommands.length > 0, detail: `${frontendCommands.length} commands` },
    { id: "backend_commands_found", ok: backendCommands.length > 0, detail: `${backendCommands.length} commands` },
    { id: "frontend_commands_registered", ok: missingBackend.length === 0, detail: missingBackend.join(", ") || "all frontend commands registered" },
    { id: "critical_frontend_coverage", ok: missingCriticalFrontend.length === 0, detail: missingCriticalFrontend.join(", ") || "all critical frontend commands used" },
    { id: "critical_backend_coverage", ok: missingCriticalBackend.length === 0, detail: missingCriticalBackend.join(", ") || "all critical backend commands registered" },
  ];
  return scenarioResult({ scenario, started, checks, output: { frontend_command_count: frontendCommands.length, backend_command_count: backendCommands.length, frontendCommands, backendCommands, missingBackend, missingCriticalFrontend, missingCriticalBackend, backendOnly } });
}

const startedAt = new Date();
const results = [runSyncScenario()];
const report = summarizeResults({ schema: "translateit.runtime_command_sync_matrix.v1", mode: "diagnostic-runtime-command-sync", note: "Static functional sync report for frontend runtimeApi invocations and Rust command registry exposure.", startedAt, results });
const failures = results.filter((result) => !result.ok);
const result = results[0];
const lines = [
  "# TranslateIT Runtime Command Sync Matrix",
  "",
  `Generated: ${report.generated_at}`,
  `Mode: ${report.mode}`,
  `Total: ${report.total}`,
  `Passed: ${report.passed}`,
  `Failed: ${report.failed}`,
  "",
  "## Summary",
  "",
  `- Frontend commands: ${result.frontend_command_count}`,
  `- Backend commands: ${result.backend_command_count}`,
  `- Missing backend commands: ${result.missingBackend.length ? result.missingBackend.join(", ") : "none"}`,
  `- Missing critical frontend commands: ${result.missingCriticalFrontend.length ? result.missingCriticalFrontend.join(", ") : "none"}`,
  `- Missing critical backend commands: ${result.missingCriticalBackend.length ? result.missingCriticalBackend.join(", ") : "none"}`,
  `- Backend-only commands: ${result.backendOnly.length ? result.backendOnly.join(", ") : "none"}`,
  "",
  "## Frontend Commands",
  "",
  ...result.frontendCommands.map((command) => `- ${markdownCell(command)}`),
  "",
  "## Backend Commands",
  "",
  ...result.backendCommands.map((command) => `- ${markdownCell(command)}`),
];
appendFailureDetails(lines, failures);
writeJsonAndMarkdown({ reportDir, jsonName: "latest-runtime-command-sync-matrix.json", markdownName: "latest-runtime-command-sync-matrix.md", report, markdownLines: lines });
console.log("Runtime command sync matrix summary:");
console.log(JSON.stringify({ ...report, results: results.map(({ checks, frontendCommands, backendCommands, ...item }) => item) }, null, 2));
if (failures.length) process.exit(1);
