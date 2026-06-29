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

const packagePath = join(appRoot, "package.json");
const requirementsPath = join(
  repoRoot,
  "DevelopingData",
  "Documentation",
  "Reports",
  "Engineering",
  "V1_ADVANCE_PRODUCT_REQUIREMENTS.md",
);
const ciPolicyPath = join(
  repoRoot,
  "DevelopingData",
  "Documentation",
  "Reports",
  "Engineering",
  "V1_ADVANCE_NON_LOCAL_CI_POLICY.md",
);

const requiredFiles = [
  packagePath,
  requirementsPath,
  ciPolicyPath,
  join(appRoot, "README.md"),
];

for (const path of requiredFiles) {
  if (!existsSync(path)) {
    fail(`Required V1-Advance file is missing: ${path}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

const packageJson = JSON.parse(readText(packagePath));
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

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("[v1-advance-policy] V1-Advance single-engine policy validation passed.");
