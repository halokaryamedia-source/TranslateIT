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

const packagePath = join(appRoot, "package.json");
const activeIndexPath = join(engineeringDocsRoot, "ACTIVE_DOCUMENTATION_INDEX.md");
const primaryBranchPolicyPath = join(engineeringDocsRoot, "V1_ADVANCE_PRIMARY_SOURCE_BRANCH_POLICY.md");
const requirementsPath = join(engineeringDocsRoot, "V1_ADVANCE_PRODUCT_REQUIREMENTS.md");
const ciPolicyPath = join(engineeringDocsRoot, "V1_ADVANCE_NON_LOCAL_CI_POLICY.md");
const dependencyInstallPolicyPath = join(engineeringDocsRoot, "V1_ADVANCE_DEPENDENCY_INSTALL_POLICY.md");
const scriptSafetyMatrixPath = join(engineeringDocsRoot, "V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json");
const workflowPath = join(repoRoot, ".github", "workflows", "translateit-v1-advance-ci.yml");

const requiredFiles = [
  packagePath,
  activeIndexPath,
  primaryBranchPolicyPath,
  requirementsPath,
  ciPolicyPath,
  dependencyInstallPolicyPath,
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
  if (!existsSync(path)) {
    fail(`Required V1-Advance file is missing: ${path}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

const packageJson = readJson(packagePath);
const scripts = packageJson.scripts ?? {};
const workflow = readText(workflowPath);
const activeIndex = readText(activeIndexPath);
const primaryBranchPolicy = readText(primaryBranchPolicyPath);
const requirements = readText(requirementsPath);
const policy = readText(ciPolicyPath);
const dependencyInstallPolicy = readText(dependencyInstallPolicyPath);
const scriptSafetyMatrix = readJson(scriptSafetyMatrixPath);

const requiredScripts = [
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
];

for (const scriptName of requiredScripts) {
  if (!Object.hasOwn(scripts, scriptName)) {
    fail(`Required package script is missing: ${scriptName}`);
  }
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

const forbiddenActiveScriptMarkers = [
  "figmadesignexport",
  "designit",
  "export_figma",
  "validate_figma",
];

for (const [scriptName, command] of Object.entries(scripts)) {
  const searchable = `${scriptName} ${command}`.toLowerCase();
  for (const marker of forbiddenActiveScriptMarkers) {
    if (searchable.includes(marker)) {
      fail(`Forbidden inactive design/export script is still active: ${scriptName}`);
    }
  }
}

const forbiddenActivePaths = [
  join(repoRoot, "DevelopingData", "FigmaDesignExport"),
  join(repoRoot, "DevelopingData", "DesignIT"),
  join(appRoot, "scripts", "export_figma_design_system.mjs"),
  join(appRoot, "scripts", "validate_figma_export.mjs"),
];

for (const path of forbiddenActivePaths) {
  if (existsSync(path)) {
    fail(`Forbidden inactive design/export path still exists in active tree: ${path}`);
  }
}

if (scriptSafetyMatrix.branch !== "V1-Advance") {
  fail("Script safety matrix must declare branch V1-Advance.");
}
if (scriptSafetyMatrix.status !== "active_ci_script_safety_policy") {
  fail("Script safety matrix must be active_ci_script_safety_policy.");
}
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
    if (!Object.hasOwn(scripts, scriptName)) {
      fail(`Script safety matrix references missing package script: ${groupName} -> ${scriptName}`);
    }
  }
}

for (const localOnly of ["test:translation-gpu-final", "setup:worker", "smoke:worker", "gpu:check"]) {
  if (!scriptSafetyMatrix.requires_target_pc_or_local_runtime?.includes(localOnly)) {
    fail(`Script safety matrix must classify ${localOnly} as target-PC/local runtime only.`);
  }
}

for (const forbiddenCommand of scriptSafetyMatrix.forbidden_in_non_local_ci_workflow ?? []) {
  if (workflow.includes(forbiddenCommand)) {
    fail(`Non-local CI workflow must not run local-only command: ${forbiddenCommand}`);
  }
}

if (!workflow.includes("branches: [V1-Advance]")) {
  fail("Primary CI workflow must run on push to V1-Advance.");
}
if (!workflow.includes("workflow_dispatch")) {
  fail("Primary CI workflow must allow manual workflow_dispatch.");
}
if (workflow.includes("pull_request:")) {
  fail("Primary CI workflow must not use pull_request triggers during V1-Advance primary branch phase.");
}
if (workflow.includes("branches: [Developing")) {
  fail("Primary CI workflow must not target Developing during V1-Advance primary branch phase.");
}
if (!workflow.includes("Rust Manifest Preflight")) {
  fail("Primary CI workflow must name Rust validation as Rust Manifest Preflight.");
}

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
]) {
  if (!requirements.includes(marker)) {
    fail(`Product requirement marker is missing: ${marker}`);
  }
}

for (const marker of [
  "current development phase is intentionally non-local",
  "Do not require local CUDA hardware in CI",
  "Do not require local model files in CI",
  "Do not require microphone access in CI",
  "Do not require virtual audio devices in CI",
  "Do not claim local runtime readiness from GitHub inspection alone",
]) {
  if (!policy.includes(marker)) {
    fail(`CI policy marker is missing: ${marker}`);
  }
}

for (const marker of [
  "Branch: `V1-Advance`",
  "No dependency install required.",
  "npm install --no-audit --no-fund",
  "npm ci",
  "Do not promote multiple heavy gates at once.",
  "Dependency install success only proves installability of package dependencies in GitHub Actions.",
]) {
  if (!dependencyInstallPolicy.includes(marker)) {
    fail(`Dependency install policy marker is missing: ${marker}`);
  }
}

for (const marker of [
  "Branch: `V1-Advance`",
  "V1-Advance` is the primary source branch",
  "Developing` is no longer the active merge target",
  "Do not create new PRs into `Developing`",
  "V1_ADVANCE_PRIMARY_SOURCE_BRANCH_POLICY.md",
  "Rust/Tauri desktop shell + Python helper runtime",
]) {
  if (!activeIndex.includes(marker)) {
    fail(`Active documentation index marker is missing: ${marker}`);
  }
}

for (const marker of [
  "Branch: `V1-Advance`",
  "V1-Advance` is now the primary source branch",
  "Developing` is no longer the active merge target",
]) {
  if (!primaryBranchPolicy.includes(marker)) {
    fail(`Primary source branch policy marker is missing: ${marker}`);
  }
}

for (const contractPath of [
  join(runtimeContractsRoot, "FINAL_ARCHITECTURE_CONTRACT.json"),
  join(runtimeContractsRoot, "PYTHON_HELPER_BRIDGE_CONTRACT.json"),
  join(runtimeContractsRoot, "CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json"),
  join(runtimeContractsRoot, "AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json"),
]) {
  const contract = readJson(contractPath);
  if (contract.branch !== "V1-Advance") {
    fail(`Runtime contract branch must be V1-Advance: ${contractPath}`);
  }
  if (readText(contractPath).includes('"branch": "Dev-Rust"')) {
    fail(`Runtime contract still declares Dev-Rust as active branch: ${contractPath}`);
  }
}

const finalArchitecture = readJson(join(runtimeContractsRoot, "FINAL_ARCHITECTURE_CONTRACT.json"));
if (finalArchitecture.final_desktop_shell !== "Rust/Tauri") {
  fail("Final architecture must keep Rust/Tauri as the user-facing shell.");
}
if (finalArchitecture.helper_runtime !== "Python") {
  fail("Final architecture must keep Python as helper runtime.");
}

const captureContract = readJson(join(runtimeContractsRoot, "CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json"));
if (captureContract.v1_advance_speech_policy?.silence_threshold_ms !== 700) {
  fail("Capture contract must declare 700ms silence threshold.");
}
if (captureContract.v1_advance_speech_policy?.max_speech_segment_seconds !== 12) {
  fail("Capture contract must declare 12 second max speech segment.");
}
if (captureContract.v1_advance_speech_policy?.default_input_mode !== "always_listening") {
  fail("Capture contract must declare always-listening as default input mode.");
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("[v1-advance-policy] V1-Advance primary source branch policy validation passed.");
