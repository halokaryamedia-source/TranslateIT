import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const logDir = resolve(repoRoot, "UserData/CacheData/AudioStudio/logs");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logPath = resolve(logDir, `audio_studio_local_validation_${timestamp}.log`);
const summaryPath = resolve(logDir, `audio_studio_local_validation_${timestamp}.summary.json`);
const includeTauriBuild = process.argv.includes("--include-tauri-build");

const steps = [
  ["Audio Studio static validator", ["run", "validate:audio-studio"]],
  ["TypeScript typecheck", ["run", "typecheck"]],
  ["Rust cargo check", ["run", "check:rust"]],
  ["Frontend build", ["run", "build:frontend"]],
];

if (includeTauriBuild) {
  steps.push(["Tauri build", ["run", "build"]]);
}

const summary = {
  schema: "translateit.audio_studio_local_validation.v1",
  status: "running",
  started_at: new Date().toISOString(),
  completed_at: null,
  package_root: packageRoot,
  log_path: logPath,
  summary_path: summaryPath,
  include_tauri_build: includeTauriBuild,
  runtime_claim: "not_ready_until_target_pc_review",
  steps: [],
};

mkdirSync(logDir, { recursive: true });
writeFileSync(logPath, "", "utf8");
writeSummary();

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
