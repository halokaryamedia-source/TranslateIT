import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const manifestPath = join(appRoot, "src-tauri", "Cargo.toml");

const fail = (message) => {
  console.error(`[local-tauri-compile] ${message}`);
  process.exit(1);
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    shell: process.platform === "win32",
    stdio: "inherit",
    ...options,
  });
  if (result.error) fail(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} exited with status ${result.status}`);
};

if (!existsSync(manifestPath)) {
  fail(`Missing Tauri Cargo manifest: ${manifestPath}`);
}

console.log("[local-tauri-compile] This is a manual local proof command. It is intentionally not part of primary CI.");
console.log("[local-tauri-compile] Checking Rust toolchain...");
run("rustc", ["--version"]);
run("cargo", ["--version"]);

console.log("[local-tauri-compile] Running cargo check for Tauri Rust source...");
run("cargo", ["check", "--manifest-path", manifestPath]);
console.log("[local-tauri-compile] Tauri Rust source compile check passed.");
