import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Functional gate: every Tauri command registered in Rust must be invoked by
// exactly the frontend bridge layer, and vice versa. Replaces prose-marker
// validators with a real ownership contract between registry.rs and src/app.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = join(root, "src-tauri", "src", "commands", "registry.rs");
const bridgeRoot = join(root, "src", "app");

function registeredCommands() {
  const body = readFileSync(registryPath, "utf8");
  const names = new Set();
  for (const match of body.matchAll(/crate::commands::[a-z_0-9]+::([a-z_0-9]+)/g)) {
    names.add(match[1]);
  }
  return names;
}

function invokedCommands() {
  const names = new Set();
  const stack = [bridgeRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(path);
        continue;
      }
      if (!/\.(ts|js|svelte)$/.test(entry.name)) continue;
      const body = readFileSync(path, "utf8");
      const callPattern = /(?:\brunCommand|\binvoke[A-Za-z0-9_]*)(?:<[\s\S]{0,160}?>)?\(\s*"([a-z_0-9]+)"/g;
      for (const match of body.matchAll(callPattern)) {
        names.add(match[1]);
      }
    }
  }
  return names;
}

const rust = registeredCommands();
const ts = invokedCommands();

if (rust.size === 0) throw new Error("command-parity: no registered commands found in registry.rs");
if (ts.size === 0) throw new Error("command-parity: no runCommand/invoke literals found under src/app");

const uninvoked = [...rust].filter((name) => !ts.has(name)).sort();
const unregistered = [...ts].filter((name) => !rust.has(name)).sort();

// Commands reachable only from Rust internals may live here with a reason.
const allowlist = new Set([]);

const deadRust = uninvoked.filter((name) => !allowlist.has(name));
const unknownAllowlist = [...allowlist].filter((name) => !rust.has(name));

for (const name of deadRust) console.error(`[command-parity] registered but never invoked by frontend: ${name}`);
for (const name of unregistered) console.error(`[command-parity] invoked by frontend but not registered: ${name}`);
for (const name of unknownAllowlist) console.error(`[command-parity] allowlist entry is not registered: ${name}`);

if (deadRust.length > 0 || unregistered.length > 0 || unknownAllowlist.length > 0) {
  throw new Error(`command-parity: ${deadRust.length} dead, ${unregistered.length} unregistered, ${unknownAllowlist.length} stale allowlist entries`);
}

console.log(`[command-parity] ${rust.size} registered commands and ${ts.size} frontend invocations are 1:1 aligned.`);
