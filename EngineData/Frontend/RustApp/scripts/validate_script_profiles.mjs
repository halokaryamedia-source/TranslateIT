import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = resolve(currentDir, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const scripts = packageJson.scripts ?? {};

const failures = [];
const fail = (message) => failures.push(message);

const requireScript = (name) => {
  if (typeof scripts[name] !== "string" || scripts[name].trim().length === 0) {
    fail(`Missing required script profile: ${name}`);
  }
};

const requiredProfiles = [
  "validate:quick",
  "typecheck",
  "check:rust",
  "preflight:frontend-build",
  "preflight:tauri-package",
  "check:tauri-rust-local",
  "validate:release-preflight",
  "validate:local-heavy",
  "validate:local-hardening",
];

for (const profile of requiredProfiles) requireScript(profile);

const quick = scripts["validate:quick"] ?? "";
const disallowedQuickMarkers = [
  "local-only",
  "report-only",
  "check:tauri-rust-local",
  "setup:",
  "smoke:",
  "models:",
  "gpu:",
  "validate:release-preflight",
  "validate:local-heavy",
  "validate:local-hardening",
  "validate:full",
  "validate:models",
  "cargo check",
];

for (const marker of disallowedQuickMarkers) {
  if (quick.includes(marker)) {
    fail(`validate:quick must stay non-local and lightweight. Found marker: ${marker}`);
  }
}

const localOnlyScriptNames = Object.entries(scripts)
  .filter(([, command]) => command.includes("local-only"))
  .map(([name]) => name);

for (const name of localOnlyScriptNames) {
  if (quick.includes(name)) {
    fail(`validate:quick must not call local-only script: ${name}`);
  }
}

const manualCompile = scripts["check:tauri-rust-local"] ?? "";
if (!manualCompile.includes("run_local_tauri_compile_check.mjs")) {
  fail("check:tauri-rust-local must remain the manual local Tauri compile proof command");
}

const releasePreflight = scripts["validate:release-preflight"] ?? "";
if (!releasePreflight.includes("local-only")) {
  fail("validate:release-preflight must remain local-only/deferred until installer proof exists");
}

if (failures.length > 0) {
  console.error("Script profile validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Script profiles are separated: validate:quick is CI-safe, local proof remains manual, release/local profiles remain deferred.");
