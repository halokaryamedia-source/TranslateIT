import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const contractPath = resolve(repoRoot, "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_LOCAL_VALIDATION_EVIDENCE_CONTRACT.json");
const logsRoot = resolve(repoRoot, "UserData", "CacheData", "AudioStudio", "logs");
const summaryArg = process.argv[2];

const contract = readJson(contractPath, "evidence contract");
const summaryPath = summaryArg
  ? resolve(packageRoot, summaryArg)
  : findLatestSummaryPath();
const summary = readJson(summaryPath, "summary file");
const errors = [];

function readJson(path, label) {
  if (!existsSync(path)) {
    console.error(`Missing ${label}: ${path}`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`Invalid JSON in ${label}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function findLatestSummaryPath() {
  if (!existsSync(logsRoot)) {
    console.error(`Missing summary file path and no summary directory found: ${logsRoot}`);
    process.exit(1);
  }
  const summaries = readdirSync(logsRoot).filter((name) => name.startsWith("audio_studio_local_validation_") && name.endsWith(".summary.json"));
  if (summaries.length === 0) {
    console.error(`No Audio Studio summary file found in: ${logsRoot}`);
    process.exit(1);
  }
  summaries.sort();
  return resolve(logsRoot, summaries[summaries.length - 1]);
}

function expectArray(value, label) {
  if (!Array.isArray(value)) errors.push(`${label} must be an array.`);
}

function expectIncludes(list, value, label) {
  if (!Array.isArray(list) || !list.includes(value)) errors.push(`${label} does not allow: ${String(value)}`);
}

for (const field of contract.required_summary_fields ?? []) {
  if (!Object.hasOwn(summary, field)) errors.push(`summary missing required field: ${field}`);
}

if (summary.schema !== contract.summary_schema) errors.push("summary schema does not match evidence contract.");
if (summary.runtime_claim !== contract.required_runtime_claim) errors.push("summary runtime_claim does not match evidence contract.");
expectIncludes(contract.allowed_summary_statuses, summary.status, "summary status");
expectArray(summary.steps, "summary.steps");

if (Array.isArray(summary.steps)) {
  const stepNames = summary.steps.map((step) => step.name);
  for (const requiredStep of contract.required_steps ?? []) {
    if (!stepNames.includes(requiredStep)) errors.push(`summary missing required step: ${requiredStep}`);
  }
  for (const step of summary.steps) {
    for (const field of contract.required_step_fields ?? []) {
      if (!Object.hasOwn(step, field)) errors.push(`step ${String(step.name)} missing field: ${field}`);
    }
    expectIncludes(contract.allowed_step_statuses, step.status, `step status for ${String(step.name)}`);
  }
}

if (errors.length > 0) {
  console.error("Audio Studio summary evidence verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Audio Studio summary evidence verification passed.");
