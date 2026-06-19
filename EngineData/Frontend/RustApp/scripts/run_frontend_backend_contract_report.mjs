import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const runtimeApiPath = resolve(appRoot, "src", "app", "bridge", "runtimeApi.ts");
const registryPath = resolve(appRoot, "src-tauri", "src", "commands", "registry.rs");

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

function main() {
  mkdirSync(reportDir, { recursive: true });
  const runtimeApi = read(runtimeApiPath);
  const registry = read(registryPath);
  const frontend = frontendCommands(runtimeApi);
  const backend = backendCommands(registry);
  const missingBackend = frontend.filter((command) => !backend.includes(command));
  const backendOnly = backend.filter((command) => !frontend.includes(command));
  const ok = runtimeApi.length > 0 && registry.length > 0 && missingBackend.length === 0;
  const report = {
    schema: "translateit.frontend_backend_contract_report.v1",
    generated_at: new Date().toISOString(),
    ok,
    runtime_api_path: runtimeApiPath,
    registry_path: registryPath,
    frontend_commands: frontend,
    backend_commands: backend,
    missing_backend_commands: missingBackend,
    backend_only_commands: backendOnly,
  };
  const latestJson = resolve(reportDir, "latest-frontend-backend-contract.json");
  const latestMd = resolve(reportDir, "latest-frontend-backend-contract.md");
  const md = [
    "# TranslateIT Frontend Backend Contract Report",
    "",
    `OK: ${ok}`,
    "",
    "## Frontend commands missing in Rust registry",
    "",
    missingBackend.length ? missingBackend.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Rust registry commands not currently called by runtimeApi",
    "",
    backendOnly.length ? backendOnly.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Frontend invoke commands",
    "",
    frontend.map((item) => `- ${item}`).join("\n"),
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Frontend backend contract report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, frontend: frontend.length, backend: backend.length, missingBackend }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();
