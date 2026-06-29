import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const engineeringDocsRoot = join(repoRoot, "DevelopingData", "Documentation", "Reports", "Engineering");
const runtimeContractsRoot = join(repoRoot, "EngineData", "Backend", "RuntimeContracts");

const fail = (message) => {
  console.error(`[v1-advance-policy] ${message}`);
  process.exitCode = 1;
};

const readText = (path) => readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(readText(path));
const includes = (content, marker, label) => {
  if (!content.includes(marker)) fail(`${label} marker is missing: ${marker}`);
};

const packagePath = join(appRoot, "package.json");
const activeIndexPath = join(engineeringDocsRoot, "ACTIVE_DOCUMENTATION_INDEX.md");
const primaryBranchPolicyPath = join(engineeringDocsRoot, "V1_ADVANCE_PRIMARY_SOURCE_BRANCH_POLICY.md");
const requirementsPath = join(engineeringDocsRoot, "V1_ADVANCE_PRODUCT_REQUIREMENTS.md");
const ciPolicyPath = join(engineeringDocsRoot, "V1_ADVANCE_NON_LOCAL_CI_POLICY.md");
const scriptSafetyMatrixPath = join(engineeringDocsRoot, "V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json");
const workflowPath = join(repoRoot, ".github", "workflows", "translateit-v1-advance-ci.yml");

const requiredFiles = [
  packagePath,
  activeIndexPath,
  primaryBranchPolicyPath,
  requirementsPath,
  ciPolicyPath,
  scriptSafetyMatrixPath,
  workflowPath,
  join(appRoot, "README.md"),
  join(appRoot, "scripts", "validate_rust_manifest_preflight.mjs"),
  join(appRoot, "scripts", "validate_frontend_build_preflight.mjs"),
  join(runtimeContractsRoot, "FINAL_ARCHITECTURE_CONTRACT.json"),
  join(runtimeContractsRoot, "PYTHON_HELPER_BRIDGE_CONTRACT.json"),
  join(runtimeContractsRoot, "CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json"),
  join(runtimeContractsRoot, "AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json"),
];

for (const path of requiredFiles) {
  if (!existsSync(path)) fail(`Required V1-Advance file is missing: ${path}`);
}

if (process.exitCode) process.exit(process.exitCode);

const packageJson = readJson(packagePath);
const scripts = packageJson.scripts ?? {};
const workflow = readText(workflowPath);
const workflowLines = workflow.split(/\r?\n/).map((line) => line.trim());
const activeIndex = readText(activeIndexPath);
const primaryBranchPolicy = readText(primaryBranchPolicyPath);
const requirements = readText(requirementsPath);
const policy = readText(ciPolicyPath);
const scriptSafetyMatrix = readJson(scriptSafetyMatrixPath);

for (const scriptName of [
  "typecheck",
  "check:rust",
  "build:frontend",
  "preflight:frontend-build",
  "validate:quick",
  "validate:single-active-engine",
  "validate:v1-advance-policy",
  "test:frontend-backend-contract",
  "test:worker-contract",
  "test:ui-binding-report",
  "test:settings-integrity-report",
]) {
  if (!Object.hasOwn(scripts, scriptName)) fail(`Required package script is missing: ${scriptName}`);
}

if (scripts["check:rust"] !== "node scripts/validate_rust_manifest_preflight.mjs") {
  fail("check:rust must remain Rust manifest preflight until full cargo check is intentionally restored.");
}
if (scripts["build:frontend"] !== "vite build") {
  fail("build:frontend must remain a frontend-only Vite build command.");
}
if (scripts["preflight:frontend-build"] !== "node scripts/validate_frontend_build_preflight.mjs") {
  fail("preflight:frontend-build must run the frontend build preflight validator.");
}

for (const marker of ["figmadesignexport", "designit", "export_figma", "validate_figma"]) {
  for (const [scriptName, command] of Object.entries(scripts)) {
    if (`${scriptName} ${command}`.toLowerCase().includes(marker)) {
      fail(`Forbidden inactive design/export script is still active: ${scriptName}`);
    }
  }
}

for (const path of [
  join(repoRoot, "DevelopingData", "FigmaDesignExport"),
  join(repoRoot, "DevelopingData", "DesignIT"),
  join(appRoot, "scripts", "export_figma_design_system.mjs"),
  join(appRoot, "scripts", "validate_figma_export.mjs"),
]) {
  if (existsSync(path)) fail(`Forbidden inactive design/export path still exists in active tree: ${path}`);
}

if (scriptSafetyMatrix.branch !== "V1-Advance") fail("Script safety matrix must declare branch V1-Advance.");
if (scriptSafetyMatrix.status !== "active_ci_script_safety_policy") fail("Script safety matrix must be active_ci_script_safety_policy.");
if (scriptSafetyMatrix.active_package !== "EngineData/Frontend/RustApp/package.json") {
  fail("Script safety matrix must point to the active RustApp package.json.");
}

for (const groupName of ["ci_safe_script_candidates_for_phase_3", "requires_target_pc_or_local_runtime", "report_or_status_only_scripts"]) {
  const group = scriptSafetyMatrix[groupName];
  if (!Array.isArray(group)) {
    fail(`Script safety matrix group must be an array: ${groupName}`);
    continue;
  }
  for (const scriptName of group) {
    if (!Object.hasOwn(scripts, scriptName)) fail(`Script safety matrix references missing package script: ${groupName} -> ${scriptName}`);
  }
}

for (const localOnly of ["test:translation-gpu-final", "setup:worker", "smoke:worker", "gpu:check"]) {
  if (!scriptSafetyMatrix.requires_target_pc_or_local_runtime?.includes(localOnly)) {
    fail(`Script safety matrix must classify ${localOnly} as target-PC/local runtime only.`);
  }
}

const commandIsRunExactly = (command) => workflowLines.some((line) => line === command || line === `run: ${command}`);
for (const forbiddenCommand of scriptSafetyMatrix.forbidden_in_non_local_ci_workflow ?? []) {
  if (commandIsRunExactly(forbiddenCommand)) {
    fail(`Non-local CI workflow must not run local-only command: ${forbiddenCommand}`);
  }
}

includes(workflow, "branches: [V1-Advance]", "Primary CI workflow");
includes(workflow, "workflow_dispatch", "Primary CI workflow");
if (workflow.includes("pull_request:")) fail("Primary CI workflow must not use pull_request triggers during V1-Advance primary branch phase.");
if (workflow.includes("branches: [Developing")) fail("Primary CI workflow must not target Developing during V1-Advance primary branch phase.");
includes(workflow, "Rust Manifest Preflight", "Primary CI workflow");

for (const marker of [
  "single active product direction",
  "Do not reactivate DesignIT or FigmaDesignExport as active runtime dependencies.",
  "Windows desktop real-time conversation translator",
  "NVIDIA CUDA",
  "CPU fallback",
  "built-in virtual microphone",
  "Silence threshold: 700ms",
  "Maximum speech segment: 12 seconds",
  "Always-listening",
  "Push-to-talk",
  "Hold Space",
]) includes(requirements, marker, "Product requirement");

for (const marker of [
  "current development phase is intentionally non-local",
  "Do not require local CUDA hardware in CI",
  "Do not require local model files in CI",
  "Do not require microphone access in CI",
  "Do not require virtual audio devices in CI",
  "Do not claim local runtime readiness from GitHub inspection alone",
]) includes(policy, marker, "CI policy");

for (const marker of [
  "Branch: `V1-Advance`",
  "V1-Advance` is the primary source branch",
  "Developing` is no longer the active merge target",
  "Do not create new PRs into `Developing`",
  "V1_ADVANCE_PRIMARY_SOURCE_BRANCH_POLICY.md",
  "Rust/Tauri desktop shell + Python helper runtime",
]) includes(activeIndex, marker, "Active documentation index");

for (const marker of [
  "Branch: `V1-Advance`",
  "V1-Advance` is now the primary source branch",
  "Developing` is no longer the active merge target",
]) includes(primaryBranchPolicy, marker, "Primary source branch policy");

for (const contractPath of [
  join(runtimeContractsRoot, "FINAL_ARCHITECTURE_CONTRACT.json"),
  join(runtimeContractsRoot, "PYTHON_HELPER_BRIDGE_CONTRACT.json"),
  join(runtimeContractsRoot, "CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json"),
  join(runtimeContractsRoot, "AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json"),
]) {
  const contract = readJson(contractPath);
  if (contract.branch !== "V1-Advance") fail(`Runtime contract branch must be V1-Advance: ${contractPath}`);
  if (readText(contractPath).includes('"branch": "Dev-Rust"')) fail(`Runtime contract still declares Dev-Rust as active branch: ${contractPath}`);
}

const finalArchitecture = readJson(join(runtimeContractsRoot, "FINAL_ARCHITECTURE_CONTRACT.json"));
if (finalArchitecture.final_desktop_shell !== "Rust/Tauri") fail("Final architecture must keep Rust/Tauri as the user-facing shell.");
if (finalArchitecture.helper_runtime !== "Python") fail("Final architecture must keep Python as helper runtime.");

const captureContract = readJson(join(runtimeContractsRoot, "CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json"));
if (captureContract.v1_advance_speech_policy?.silence_threshold_ms !== 700) fail("Capture contract must declare 700ms silence threshold.");
if (captureContract.v1_advance_speech_policy?.max_speech_segment_seconds !== 12) fail("Capture contract must declare 12 second max speech segment.");
if (captureContract.v1_advance_speech_policy?.default_input_mode !== "always_listening") fail("Capture contract must declare always-listening as default input mode.");

if (process.exitCode) process.exit(process.exitCode);
console.log("[v1-advance-policy] V1-Advance primary source branch policy validation passed.");
