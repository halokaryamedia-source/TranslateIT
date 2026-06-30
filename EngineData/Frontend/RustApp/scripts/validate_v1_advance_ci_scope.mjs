import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const workflowPath = resolve(repoRoot, ".github/workflows/v1-advance-ci.yml");

function fail(message) {
  console.error(`[v1-advance-ci-scope] ${message}`);
  process.exit(1);
}

if (!existsSync(workflowPath)) fail("Missing V1 Advance CI workflow file.");

const workflow = readFileSync(workflowPath, "utf8");

for (const marker of [
  "name: V1 Advance CI",
  "workflow_dispatch:",
  "push:",
  "pull_request:",
  "- V1-Advance",
  "source-contract-guards:",
  "frontend-build-guard:",
  "rust-tauri-source-guard:",
  "Validate translation flow",
  "./node_modules/.bin/tsc --noEmit --pretty false",
  "./node_modules/.bin/vite build --logLevel warn",
  "npm run check:rust",
  "npm run preflight:tauri-package",
]) {
  if (!workflow.includes(marker)) fail(`Workflow missing required marker: ${marker}`);
}

for (const marker of [
  "- Developing",
  "branches: [Developing]",
  "branches: [V1-Advance, Developing]",
  "runs-on: ubuntu-latest",
  "runs-on: ubuntu-22.04",
  "npm run validate:quick",
  "npm run validate:source-contracts",
  "npm run typecheck",
  "npm run build:frontend",
]) {
  if (workflow.includes(marker)) fail(`Workflow has forbidden marker: ${marker}`);
}

const v1Mentions = workflow
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line === "- V1-Advance")
  .length;
if (v1Mentions < 2) fail("Workflow must scope push and pull_request branches to V1-Advance.");

const runnerMentions = workflow.match(/runs-on: ubuntu-24\.04/g)?.length ?? 0;
if (runnerMentions !== 3) fail(`Workflow must pin all three jobs to ubuntu-24.04. Found: ${runnerMentions}`);

const sourceBlock = workflow.split("frontend-build-guard:")[0] ?? "";
if (sourceBlock.includes("npm ci") || sourceBlock.includes("tsc --noEmit") || sourceBlock.includes("vite build")) {
  fail("Source contract guards must not install frontend deps or run compile/build commands.");
}

const rustBlock = workflow.split("rust-tauri-source-guard:")[1] ?? "";
if (rustBlock.includes("npm ci") || rustBlock.includes("actions/setup-node")) {
  fail("Rust/Tauri source guard must stay dependency-light.");
}

console.log("[v1-advance-ci-scope] V1 Advance CI scope validation passed.");
