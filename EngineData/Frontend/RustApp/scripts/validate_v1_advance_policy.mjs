import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..", "..");

const fail = (message) => {
  console.error(`[v1-advance-policy] ${message}`);
  process.exitCode = 1;
};

const readText = (path) => readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(readText(path));

const engineeringDocsRoot = join(
  repoRoot,
  "DevelopingData",
  "Documentation",
  "Reports",
  "Engineering",
);
const packagePath = join(appRoot, "package.json");
const activeIndexPath = join(engineeringDocsRoot, "ACTIVE_DOCUMENTATION_INDEX.md");
const currentStatusPath = join(engineeringDocsRoot, "CURRENT_APP_STATUS.md");
const singleEnginePolicyPath = join(engineeringDocsRoot, "SINGLE_ACTIVE_ENGINE_POLICY.md");
const requirementsPath = join(engineeringDocsRoot, "V1_ADVANCE_PRODUCT_REQUIREMENTS.md");
const ciPolicyPath = join(engineeringDocsRoot, "V1_ADVANCE_NON_LOCAL_CI_POLICY.md");
const dependencyInstallPolicyPath = join(engineeringDocsRoot, "V1_ADVANCE_DEPENDENCY_INSTALL_POLICY.md");
const scriptSafetyMatrixPath = join(engineeringDocsRoot, "V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json");
const workflowPath = join(repoRoot, ".github", "workflows", "translateit-v1-advance-ci.yml");
const runtimeContractsRoot = join(repoRoot, "EngineData", "Backend", "RuntimeContracts");

const requiredFiles = [
  packagePath,
  requirementsPath,
  ciPolicyPath,
  dependencyInstallPolicyPath,
  scriptSafetyMatrixPath,
  activeIndexPath,
  currentStatusPath,
  singleEnginePolicyPath,
  workflowPath,
  join(appRoot, "README.md"),
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
const scriptEntries = Object.entries(scripts);

const requiredScripts = [
  "typecheck",
  "check:rust",
  "build:frontend",
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

const forbiddenActiveScriptMarkers = [
  "figma",
  "figmadesignexport",
  "designit",
  "export_figma",
  "validate_figma",
];

for (const [scriptName, command] of scriptEntries) {
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

const requirements = readText(requirementsPath);
const policy = readText(ciPolicyPath);
const dependencyInstallPolicy = readText(dependencyInstallPolicyPath);
const activeIndex = readText(activeIndexPath);
const currentStatus = readText(currentStatusPath);
const singleEnginePolicy = readText(singleEnginePolicyPath);
const workflow = readText(workflowPath);
const scriptSafetyMatrix = readJson(scriptSafetyMatrixPath);

if (scriptSafetyMatrix.branch !== "V1-Advance") {
  fail("Script safety matrix must declare branch V1-Advance.");
}
if (scriptSafetyMatrix.status !== "active_ci_script_safety_policy") {
  fail("Script safety matrix must be active_ci_script_safety_policy.");
}
if (scriptSafetyMatrix.active_package !== "EngineData/Frontend/RustApp/package.json") {
  fail("Script safety matrix must point to the active RustApp package.json.");
}

const matrixScriptGroups = [
  "ci_safe_script_candidates_for_phase_3",
  "requires_target_pc_or_local_runtime",
  "report_or_status_only_scripts",
];

for (const groupName of matrixScriptGroups) {
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

if (!scriptSafetyMatrix.requires_target_pc_or_local_runtime?.includes("test:translation-gpu-final")) {
  fail("Script safety matrix must classify test:translation-gpu-final as target-PC/local runtime only.");
}
if (!scriptSafetyMatrix.requires_target_pc_or_local_runtime?.includes("setup:worker")) {
  fail("Script safety matrix must classify setup:worker as target-PC/local runtime only.");
}
if (!scriptSafetyMatrix.requires_target_pc_or_local_runtime?.includes("smoke:worker")) {
  fail("Script safety matrix must classify smoke:worker as target-PC/local runtime only.");
}
if (!scriptSafetyMatrix.requires_target_pc_or_local_runtime?.includes("gpu:check")) {
  fail("Script safety matrix must classify gpu:check as target-PC/local runtime only.");
}

for (const forbiddenCommand of scriptSafetyMatrix.forbidden_in_non_local_ci_workflow ?? []) {
  if (workflow.includes(forbiddenCommand)) {
    fail(`Non-local CI workflow must not run local-only command: ${forbiddenCommand}`);
  }
}

const requiredDependencyPolicyMarkers = [
  "Branch: `V1-Advance`",
  "No dependency install required.",
  "npm install --no-audit --no-fund",
  "npm ci",
  "Do not promote multiple heavy gates at once.",
  "Dependency install success only proves installability of package dependencies in GitHub Actions.",
];

for (const marker of requiredDependencyPolicyMarkers) {
  if (!dependencyInstallPolicy.includes(marker)) {
    fail(`Dependency install policy marker is missing: ${marker}`);
  }
}

const requiredRequirementMarkers = [
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
];

for (const marker of requiredRequirementMarkers) {
  if (!requirements.includes(marker)) {
    fail(`Product requirement marker is missing: ${marker}`);
  }
}

const requiredPolicyMarkers = [
  "current development phase is intentionally non-local",
  "Do not require local CUDA hardware in CI",
  "Do not require local model files in CI",
  "Do not require microphone access in CI",
  "Do not require virtual audio devices in CI",
  "Do not claim local runtime readiness from GitHub inspection alone",
];

for (const marker of requiredPolicyMarkers) {
  if (!policy.includes(marker)) {
    fail(`CI policy marker is missing: ${marker}`);
  }
}

const activeDocumentationChecks = [
  [activeIndex, "ACTIVE_DOCUMENTATION_INDEX.md"],
  [currentStatus, "CURRENT_APP_STATUS.md"],
  [singleEnginePolicy, "SINGLE_ACTIVE_ENGINE_POLICY.md"],
];

for (const [content, label] of activeDocumentationChecks) {
  if (!content.includes("Branch: `V1-Advance`")) {
    fail(`Active documentation must declare Branch: V1-Advance in ${label}`);
  }
  if (!content.includes("Rust/Tauri desktop shell + Python helper runtime")) {
    fail(`Active documentation must preserve the single active engine direction in ${label}`);
  }
}

if (!activeIndex.includes("V1_ADVANCE_PRODUCT_REQUIREMENTS.md")) {
  fail("Active documentation index must include V1_ADVANCE_PRODUCT_REQUIREMENTS.md.");
}
if (!activeIndex.includes("V1_ADVANCE_NON_LOCAL_CI_POLICY.md")) {
  fail("Active documentation index must include V1_ADVANCE_NON_LOCAL_CI_POLICY.md.");
}
if (!activeIndex.includes("V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json")) {
  fail("Active documentation index must include V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json.");
}
if (!activeIndex.includes("V1_ADVANCE_DEPENDENCY_INSTALL_POLICY.md")) {
  fail("Active documentation index must include V1_ADVANCE_DEPENDENCY_INSTALL_POLICY.md.");
}
if (!currentStatus.includes("The active product branch is `V1-Advance`.")) {
  fail("Current app status must identify V1-Advance as the active product branch.");
}
if (!singleEnginePolicy.includes("TranslateIT V1-Advance remains one unified engine.")) {
  fail("Single active engine policy must state that V1-Advance remains one unified engine.");
}

const runtimeContractPaths = [
  join(runtimeContractsRoot, "FINAL_ARCHITECTURE_CONTRACT.json"),
  join(runtimeContractsRoot, "PYTHON_HELPER_BRIDGE_CONTRACT.json"),
  join(runtimeContractsRoot, "CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json"),
  join(runtimeContractsRoot, "AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json"),
];

for (const path of runtimeContractPaths) {
  const contract = readJson(path);
  if (contract.branch !== "V1-Advance") {
    fail(`Runtime contract branch must be V1-Advance: ${path}`);
  }
  const raw = readText(path);
  if (raw.includes('"branch": "Dev-Rust"')) {
    fail(`Runtime contract still declares Dev-Rust as active branch: ${path}`);
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

console.log("[v1-advance-policy] V1-Advance single-engine policy validation passed.");
