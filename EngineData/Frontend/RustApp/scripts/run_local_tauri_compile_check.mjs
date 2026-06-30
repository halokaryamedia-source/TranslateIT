import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const manifestPath = join(appRoot, "src-tauri", "Cargo.toml");
const frontendDistPath = join(appRoot, "dist", "index.html");
const isWindows = process.platform === "win32";
mkdirSync(reportDir, { recursive: true });

const logPath = resolve(reportDir, "local-tauri-cargo-check.log");

const fail = (message) => {
  console.error(`[local-tauri-compile] ${message}`);
  console.error(`[local-tauri-compile] Full log: ${logPath}`);
  process.exit(1);
};

const commandName = (command) => {
  if (!isWindows) return command;
  if (command === "npm") return "npm.cmd";
  return command;
};

const quoteArgs = (args) => args.map((arg) => JSON.stringify(arg)).join(" ");

const run = (label, command, args, options = {}) => {
  console.log(`[local-tauri-compile] ${label}: ${command} ${quoteArgs(args)}`);
  const result = spawnSync(commandName(command), args, {
    cwd: appRoot,
    shell: false,
    stdio: "inherit",
    ...options,
  });
  if (result.error) fail(`${label} failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} exited with status ${result.status}`);
};

const runCaptured = (label, command, args) => {
  const header = `[local-tauri-compile] ${label}: ${command} ${quoteArgs(args)}`;
  console.log(header);
  const result = spawnSync(commandName(command), args, {
    cwd: appRoot,
    shell: false,
    encoding: "utf8",
    maxBuffer: 20_000_000,
  });
  const output = [
    header,
    "",
    "## stdout",
    result.stdout || "(empty)",
    "",
    "## stderr",
    result.stderr || "(empty)",
    "",
    `exit_status=${result.status}`,
  ].join("\n");
  writeFileSync(logPath, output);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) fail(`${label} failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    const lines = output.split(/\r?\n/).filter(Boolean);
    console.error("\n[local-tauri-compile] Cargo check failed. Last diagnostic lines:");
    console.error(lines.slice(-80).join("\n"));
    fail(`${label} exited with status ${result.status}`);
  }
};

if (!existsSync(manifestPath)) {
  fail(`Missing Tauri Cargo manifest: ${manifestPath}`);
}

console.log("[local-tauri-compile] This is a manual local proof command. It is intentionally not part of primary CI.");
console.log("[local-tauri-compile] Checking Rust toolchain...");
run("rustc version", "rustc", ["--version"]);
run("cargo version", "cargo", ["--version"]);

if (!existsSync(frontendDistPath)) {
  console.log("[local-tauri-compile] Frontend dist is missing. Building frontend first...");
  run("frontend build", "npm", ["run", "build:frontend"]);
}

console.log("[local-tauri-compile] Running cargo check for Tauri Rust source...");
runCaptured("cargo check", "cargo", ["check", `--manifest-path=${manifestPath}`]);
console.log("[local-tauri-compile] Tauri Rust source compile check passed.");
