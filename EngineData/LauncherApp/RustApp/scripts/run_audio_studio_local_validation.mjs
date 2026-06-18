import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const evidenceContractPath = resolve(repoRoot, "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_LOCAL_VALIDATION_EVIDENCE_CONTRACT.json");
const evidenceContract = readEvidenceContract();
const logDir = resolve(repoRoot, evidenceContract.approved_output_root);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logPath = resolve(logDir, evidenceContract.log_file_pattern.replace("<timestamp>", timestamp));
const summaryPath = resolve(logDir, evidenceContract.summary_file_pattern.replace("<timestamp>", timestamp));
const includeTauriBuild = process.argv.includes("--include-tauri-build");

const commandByStepName = new Map([
  ["Audio Studio static validator", ["run", "validate:audio-studio"]],
  ["TypeScript typecheck", ["run", "typecheck"]],
  ["Rust cargo check", ["run", "check:rust"]],
  ["Frontend build", ["run", "build:frontend"]],
  ["Tauri build", ["run", "build"]],
]);

const steps = evidenceContract.required_steps.map((name) => {
  const command = commandByStepName.get(name);
  if (!command) throw new Error(`Missing local validation command mapping for required step: ${name}`);
  return [name, command];
});

if (includeTauriBuild) {
  const optionalStepName = "Tauri build";
  if (evidenceContract.optional_steps.includes(optionalStepName)) {
    steps.push([optionalStepName, commandByStepName.get(optionalStepName)]);
  }
}

const summary = {
  schema: evidenceContract.summary_schema,
  status: "running",
  started_at: new Date().toISOString(),
  completed_at: null,
  package_root: packageRoot,
  log_path: logPath,
  summary_path: summaryPath,
  include_tauri_build: includeTauriBuild,
  runtime_claim: evidenceContract.required_runtime_claim,
  steps: [],
};

mkdirSync(logDir, { recursive: true });
writeFileSync(logPath, "", "utf8");
writeSummary();

function readEvidenceContract() {
  const content = readFileSync(evidenceContractPath, "utf8");
  const contract = JSON.parse(content);
  if (contract.schema !== "translateit.audio_studio_local_validation_evidence_contract.v1") {
    throw new Error(`Unexpected Audio Studio evidence contract schema: ${String(contract.schema)}`);
  }
  if (contract.status !== "contract_only") {
    throw new Error(`Unexpected Audio Studio evidence contract status: ${String(contract.status)}`);
  }
  if (contract.approved_output_root !== "UserData/CacheData/AudioStudio/logs/") {
    throw new Error(`Unexpected Audio Studio evidence output root: ${String(contract.approved_output_root)}`);
  }
  if (contract.required_runtime_claim !== "not_ready_until_target_pc_review") {
    throw new Error(`Unexpected Audio Studio runtime claim: ${String(contract.required_runtime_claim)}`);
  }
  if (!Array.isArray(contract.required_steps) || contract.required_steps.length === 0) {
    throw new Error("Audio Studio evidence contract must define required_steps.");
  }
  if (!Array.isArray(contract.optional_steps)) {
    throw new Error("Audio Studio evidence contract must define optional_steps.");
  }
  return contract;
}

function writeSummary(errorMessage = null) {
  const payload = {
    ...summary,
    error_message: errorMessage,
  };
  writeFileSync(summaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  appendFileSync(logPath, line, "utf8");
  process.stdout.write(line);
}

function runStep(name, args) {
  const step = {
    name,
    command: `npm ${args.join(" ")}`,
    status: "running",
    started_at: new Date().toISOString(),
    completed_at: null,
    exit_code: null,
  };
  summary.steps.push(step);
  writeSummary();

  log(`START ${name}: ${step.command}`);
  const result = spawnSync("npm", args, {
    cwd: packageRoot,
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) appendFileSync(logPath, result.stdout, "utf8");
  if (result.stderr) appendFileSync(logPath, result.stderr, "utf8");
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  step.completed_at = new Date().toISOString();
  step.exit_code = typeof result.status === "number" ? result.status : null;

  if (result.error) {
    step.status = "failed";
    writeSummary(result.error.message);
    throw result.error;
  }
  if (result.status !== 0) {
    step.status = "failed";
    const message = `${name} failed with exit code ${result.status}. See log: ${logPath}`;
    writeSummary(message);
    throw new Error(message);
  }

  step.status = "passed";
  writeSummary();
  log(`PASS ${name}`);
}

try {
  log("Audio Studio local validation started.");
  log(`Package root: ${packageRoot}`);
  log(`Evidence contract path: ${evidenceContractPath}`);
  log(`Log path: ${logPath}`);
  log(`Summary path: ${summaryPath}`);
  log("This runner records command output only. Runtime readiness still requires target-PC execution and review.");

  for (const [name, args] of steps) {
    runStep(name, args);
  }

  if (!includeTauriBuild) {
    log("SKIP Tauri build. Re-run with -- --include-tauri-build to include packaging.");
  }

  summary.status = "passed";
  summary.completed_at = new Date().toISOString();
  writeSummary();
  log("Audio Studio local validation completed successfully.");
} catch (error) {
  summary.status = "failed";
  summary.completed_at = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  writeSummary(message);
  log(`Audio Studio local validation failed: ${message}`);
  process.exitCode = 1;
}
