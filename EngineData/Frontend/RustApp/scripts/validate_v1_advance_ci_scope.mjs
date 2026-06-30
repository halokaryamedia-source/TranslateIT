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

if (!existsSync(workflowPath)) {
  fail("Missing V1 Advance CI workflow file.");
}

const workflow = readFileSync(workflowPath, "utf8");

const requiredMarkers = [
  "name: V1 Advance CI",
  "workflow_dispatch:",
  "push:",
  "pull_request:",
  "- V1-Advance",
  "runs-on: ubuntu-24.04",
  "Frontend typecheck and Vite build",
  "npm run build:frontend",
  "libwebkit2gtk-4.1-dev",
  "cargo check --locked --manifest-path src-tauri/Cargo.toml",
];

for (const marker of requiredMarkers) {
  if (!workflow.includes(marker)) fail(`Workflow missing required marker: ${marker}`);
}

const forbiddenMarkers = [
  "- Developing",
  "branches: [Developing]",
  "branches: [V1-Advance, Developing]",
  "runs-on: ubuntu-latest",
  "runs-on: ubuntu-22.04",
  "libwebkit2gtk-4.0-dev",
];

for (const marker of forbiddenMarkers) {
  if (workflow.includes(marker)) {
    fail(`Workflow has forbidden V1 Advance CI marker: ${marker}`);
  }
}

const branchLines = workflow
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("- "));

const branchMentions = branchLines.filter((line) => line === "- V1-Advance" || line === "- Developing");
const v1Mentions = branchMentions.filter((line) => line === "- V1-Advance").length;
if (v1Mentions < 2) {
  fail("Workflow must scope both push and pull_request branches to V1-Advance.");
}

const runnerMentions = workflow.match(/runs-on: ubuntu-24\.04/g)?.length ?? 0;
if (runnerMentions !== 3) {
  fail(`Workflow must pin all three jobs to ubuntu-24.04. Found: ${runnerMentions}`);
}

console.log("[v1-advance-ci-scope] V1 Advance CI scope validation passed.");
