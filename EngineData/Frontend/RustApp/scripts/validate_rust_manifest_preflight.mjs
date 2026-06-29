import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const appRoot = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const manifestPath = join(appRoot, "src-tauri", "Cargo.toml");

const fail = (message) => {
  console.error(`[rust-manifest-preflight] ${message}`);
  process.exit(1);
};

if (!existsSync(manifestPath)) {
  fail(`Missing Rust manifest: ${manifestPath}`);
}

const cargoToml = readFileSync(manifestPath, "utf8");

for (const marker of ["[package]", "[dependencies]"]) {
  if (!cargoToml.includes(marker)) {
    fail(`Cargo.toml is missing required section: ${marker}`);
  }
}

if (!cargoToml.includes("tauri")) {
  fail("Cargo.toml must include Tauri dependency/configuration marker.");
}

console.log("[rust-manifest-preflight] Rust manifest preflight passed. Full cargo check remains deferred.");
