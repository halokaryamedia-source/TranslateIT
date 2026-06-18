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

mkdirSync(logDir, { recursive: true });
writeFileSync(logPath, "", "utf8");

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  appendFileSync(logPath, line, "utf8");
  process.stdout.write(line);
}

function runStep(name, args) {
  log(`START ${name}: npm ${args.join(" ")}`);
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

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${name} failed with exit code ${result.status}. See log: ${logPath}`);
  }
  log(`PASS ${name}`);
}

log("Audio Studio local validation started.");
log(`Package root: ${packageRoot}`);
log(`Log path: ${logPath}`);
log("This runner records command output only. Runtime readiness still requires target-PC execution and review.");

for (const [name, args] of steps) {
  runStep(name, args);
}

if (!includeTauriBuild) {
  log("SKIP Tauri build. Re-run with -- --include-tauri-build to include packaging.");
}

log("Audio Studio local validation completed successfully.");
