import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = resolve(currentDir, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const scripts = packageJson.scripts ?? {};

const failures = [];
const fail = (message) => failures.push(message);

function requireScript(name) {
  if (typeof scripts[name] !== "string" || scripts[name].trim().length === 0) {
    fail(`Missing required script profile: ${name}`);
  }
}

const allowedProfiles = new Set([
  "build:frontend",
  "typecheck",
  "check:rust",
  "check:tauri-rust-local",
  "preflight:frontend-build",
  "preflight:tauri-package",
  "validate:script-profiles",
  "validate:imports",
  "validate:naming",
  "validate:translation-flow",
  "validate:runtime-ux",
  "validate:startup-readiness",
  "validate:ci-scope",
  "validate:virtual-route",
  "validate:source-contracts",
  "validate:quick",
  "test:contract-reports",
]);

const requiredProfiles = [
  "validate:quick",
  "validate:source-contracts",
  "typecheck",
  "check:rust",
  "preflight:frontend-build",
  "preflight:tauri-package",
  "check:tauri-rust-local",
  "test:contract-reports",
];

for (const profile of requiredProfiles) requireScript(profile);

for (const name of Object.keys(scripts)) {
  if (!allowedProfiles.has(name)) {
    fail(`Unexpected package script left after cleanup: ${name}`);
  }
}

for (const [name, command] of Object.entries(scripts)) {
  if (command.includes("echo local-only") || command.includes("echo report-only")) {
    fail(`Placeholder npm script is not allowed after cleanup: ${name}`);
  }
}

const quick = scripts["validate:quick"] ?? "";
const disallowedQuickMarkers = [
  "local-only",
  "report-only",
  "check:tauri-rust-local",
  "setup:",
  "smoke:",
  "models:",
  "gpu:",
  "validate:full",
  "validate:models",
  "cargo check",
];

for (const marker of disallowedQuickMarkers) {
  if (quick.includes(marker)) {
    fail(`validate:quick must stay non-local and lightweight. Found marker: ${marker}`);
  }
}

const manualCompile = scripts["check:tauri-rust-local"] ?? "";
if (!manualCompile.includes("run_local_tauri_compile_check.mjs")) {
  fail("check:tauri-rust-local must remain the manual local Tauri compile proof command");
}

const sourceContracts = scripts["validate:source-contracts"] ?? "";
for (const requiredSourceStep of [
  "validate:script-profiles",
  "validate:imports",
  "validate:naming",
  "validate:translation-flow",
  "validate:runtime-ux",
  "validate:startup-readiness",
  "validate:ci-scope",
  "validate:virtual-route",
  "check:rust",
  "preflight:frontend-build",
]) {
  if (!sourceContracts.includes(requiredSourceStep)) {
    fail(`validate:source-contracts must include ${requiredSourceStep}`);
  }
}

const contractReports = scripts["test:contract-reports"] ?? "";
if (!contractReports.includes("run_contract_reports.mjs")) {
  fail("test:contract-reports must use the diagnostic contract report runner");
}

if (failures.length > 0) {
  console.error("Script profile validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Script profiles are clean: only active CI/manual scripts remain in package.json.");
