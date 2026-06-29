import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const docsRoot = join(repoRoot, "DevelopingData", "Documentation", "Reports", "Engineering");
const commandsRoot = join(appRoot, "src-tauri", "src", "commands");

const failures = [];
const fail = (message) => failures.push(message);
const readText = (path) => readFileSync(path, "utf8");
const requireFile = (label, path) => {
  if (!existsSync(path)) fail(`${label} is missing: ${path}`);
};
const requireIncludes = (label, text, marker) => {
  if (!text.includes(marker)) fail(`${label} must include: ${marker}`);
};
const requireNotIncludes = (label, text, marker) => {
  if (text.includes(marker)) fail(`${label} must not include: ${marker}`);
};

const activeIndexPath = join(docsRoot, "ACTIVE_DOCUMENTATION_INDEX.md");
const readinessReportPath = join(docsRoot, "V1_ADVANCE_RUNTIME_READINESS_REPORT.md");
const nonLocalPlanPath = join(docsRoot, "V1_ADVANCE_NON_LOCAL_COMPLETION_PLAN.md");
const compileProofPath = join(docsRoot, "V1_ADVANCE_LOCAL_TAURI_COMPILE_PROOF.md");
const compileIntakePath = join(docsRoot, "V1_ADVANCE_LOCAL_COMPILE_ERROR_INTAKE_TEMPLATE.md");
const currentStatusPath = join(docsRoot, "CURRENT_APP_STATUS.md");
const packageJsonPath = join(appRoot, "package.json");
const commandModPath = join(commandsRoot, "mod.rs");
const commandRegistryPath = join(commandsRoot, "registry.rs");
const stableTextTranslatePath = join(commandsRoot, "text_translate.rs");
const unstableTranslationPath = join(commandsRoot, "translation.rs");

for (const [label, path] of [
  ["active documentation index", activeIndexPath],
  ["runtime readiness report", readinessReportPath],
  ["non-local completion plan", nonLocalPlanPath],
  ["local Tauri compile proof instructions", compileProofPath],
  ["local compile error intake template", compileIntakePath],
  ["current app status", currentStatusPath],
  ["package.json", packageJsonPath],
  ["commands mod.rs", commandModPath],
  ["commands registry.rs", commandRegistryPath],
  ["stable text translation module", stableTextTranslatePath],
]) {
  requireFile(label, path);
}

if (existsSync(unstableTranslationPath)) {
  fail("unstable commands/translation.rs must not be present in the active command module set");
}

if (failures.length === 0) {
  const activeIndex = readText(activeIndexPath);
  for (const marker of [
    "V1_ADVANCE_LOCAL_TAURI_COMPILE_PROOF.md",
    "V1_ADVANCE_LOCAL_COMPILE_ERROR_INTAKE_TEMPLATE.md",
    "V1_ADVANCE_RUNTIME_READINESS_REPORT.md",
    "V1_ADVANCE_NON_LOCAL_COMPLETION_PLAN.md",
  ]) {
    requireIncludes("ACTIVE_DOCUMENTATION_INDEX.md", activeIndex, marker);
  }

  const packageJson = JSON.parse(readText(packageJsonPath));
  if (packageJson.scripts?.["check:tauri-rust-local"] !== "node scripts/run_local_tauri_compile_check.mjs") {
    fail("package.json must expose check:tauri-rust-local as the manual local compile proof command");
  }

  const modRs = readText(commandModPath);
  requireIncludes("commands/mod.rs", modRs, "pub mod text_translate;");
  requireNotIncludes("commands/mod.rs", modRs, "pub mod translation;");

  const registryRs = readText(commandRegistryPath);
  requireIncludes("commands/registry.rs", registryRs, "crate::commands::text_translate::translate_text");
  requireNotIncludes("commands/registry.rs", registryRs, "crate::commands::translation::translate_text");

  const readinessReport = readText(readinessReportPath);
  requireIncludes("runtime readiness report", readinessReport, "Estimated overall readiness toward an internal release-ready build: **38%**");
  requireIncludes("runtime readiness report", readinessReport, "Do not promote voice synthesis chaining or full cargo check back into CI until local proof logs are available.");

  const nonLocalPlan = readText(nonLocalPlanPath);
  requireIncludes("non-local completion plan", nonLocalPlan, "Non-local work must not claim:");
  requireIncludes("non-local completion plan", nonLocalPlan, "Do not reintroduce helper-backed translation, voice synthesis chaining, installer build claims, or target latency claims until local proof logs exist.");

  const compileProof = readText(compileProofPath);
  requireIncludes("local Tauri compile proof", compileProof, "npm run check:tauri-rust-local");
  requireIncludes("local Tauri compile proof", compileProof, "Do not add it to the primary workflow yet.");

  const compileIntake = readText(compileIntakePath);
  requireIncludes("local compile error intake template", compileIntake, "First Rust error code:");
  requireIncludes("local compile error intake template", compileIntake, "Do not send only:");
}

if (failures.length > 0) {
  console.error("[non-local-readiness] failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[non-local-readiness] non-local readiness checks passed");
