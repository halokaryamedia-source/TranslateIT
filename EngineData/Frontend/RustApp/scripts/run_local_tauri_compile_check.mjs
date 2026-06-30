import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const tauriRoot = join(appRoot, "src-tauri");
const manifestPath = join(tauriRoot, "Cargo.toml");
const targetPath = join(tauriRoot, "target");
const frontendDistPath = join(appRoot, "dist", "index.html");
const isWindows = process.platform === "win32";
mkdirSync(reportDir, { recursive: true });

const logPath = resolve(reportDir, "local-tauri-cargo-check.log");
const color = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
};

const colorizeDiagnosticLine = (line) => {
  if (/^(error\[|error:|FAILED:|failed to|Caused by:)/i.test(line.trim())) return `${color.red}${line}${color.reset}`;
  if (/^(warning\[|warning:|help:|note:)/i.test(line.trim())) return `${color.yellow}${line}${color.reset}`;
  if (/^\s*-->\s+/.test(line) || /^\s*\|/.test(line)) return `${color.cyan}${line}${color.reset}`;
  return line;
};

const printColoredBlock = (text, writer = process.stderr) => {
  writer.write(text.split(/\r?\n/).map(colorizeDiagnosticLine).join("\n"));
  if (!text.endsWith("\n")) writer.write("\n");
};

const fail = (message) => {
  console.error(`${color.red}[local-tauri-compile] ${message}${color.reset}`);
  console.error(`${color.yellow}[local-tauri-compile] Full log: ${logPath}${color.reset}`);
  process.exit(1);
};

const commandName = (command) => {
  if (!isWindows) return command;
  if (command === "npm") return "npm.cmd";
  return command;
};

const quoteArgs = (args) => args.map((arg) => JSON.stringify(arg)).join(" ");

const run = (label, command, args, options = {}) => {
  console.log(`${color.cyan}[local-tauri-compile] ${label}: ${command} ${quoteArgs(args)}${color.reset}`);
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
  console.log(`${color.cyan}${header}${color.reset}`);
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
  if (result.stdout) printColoredBlock(result.stdout, process.stdout);
  if (result.stderr) printColoredBlock(result.stderr, process.stderr);
  if (result.error) fail(`${label} failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    const lines = output.split(/\r?\n/).filter(Boolean);
    console.error(`\n${color.red}[local-tauri-compile] Cargo check failed. Last diagnostic lines:${color.reset}`);
    printColoredBlock(lines.slice(-80).join("\n"), process.stderr);
    fail(`${label} exited with status ${result.status}`);
  }
};

if (!existsSync(manifestPath)) {
  fail(`Missing Tauri Cargo manifest: ${manifestPath}`);
}

console.log(`${color.cyan}[local-tauri-compile] This is a manual local proof command. It is intentionally not part of primary CI.${color.reset}`);
console.log(`${color.cyan}[local-tauri-compile] Checking Rust toolchain...${color.reset}`);
run("rustc version", "rustc", ["--version"]);
run("cargo version", "cargo", ["--version"]);

if (!existsSync(frontendDistPath)) {
  console.log(`${color.yellow}[local-tauri-compile] Frontend dist is missing. Building frontend first...${color.reset}`);
  run("frontend build", "npm", ["run", "build:frontend"]);
}

if (existsSync(targetPath)) {
  console.log(`${color.yellow}[local-tauri-compile] Removing stale Tauri target cache: ${targetPath}${color.reset}`);
  rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
}

console.log(`${color.cyan}[local-tauri-compile] Running cargo check for Tauri Rust source...${color.reset}`);
runCaptured("cargo check", "cargo", ["check", `--manifest-path=${manifestPath}`]);
console.log(`${color.green}[local-tauri-compile] Tauri Rust source compile check passed.${color.reset}`);
