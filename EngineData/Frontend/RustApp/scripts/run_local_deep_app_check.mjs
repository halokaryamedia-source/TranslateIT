import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
mkdirSync(reportDir, { recursive: true });

const color = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m" };
const node = process.execPath;
const steps = [
  ["script-profiles", "Package script policy", "npm", ["run", "validate:script-profiles"], true],
  ["import-integrity", "Frontend import integrity", "npm", ["run", "validate:imports"], true],
  ["naming-policy", "Active route and naming policy", "npm", ["run", "validate:naming"], true],
  ["translation-flow", "Translation flow contract", "npm", ["run", "validate:translation-flow"], true],
  ["runtime-ux", "Runtime UX contract", "npm", ["run", "validate:runtime-ux"], true],
  ["simple-ui", "Simple UI contract", "npm", ["run", "validate:simple-ui"], true],
  ["functional-surface", "Functional surface contract", node, ["scripts/validate_functional_surface_contract.mjs"], true],
  ["readiness-scenarios", "Runtime readiness scenarios", node, ["scripts/validate_runtime_readiness_scenarios.mjs"], true],
  ["error-feedback", "Error feedback contract", node, ["scripts/validate_error_feedback_contract.mjs"], true],
  ["settings-surface", "Settings surface contract", node, ["scripts/validate_settings_surface_contract.mjs"], true],
  ["startup-readiness", "Startup readiness contract", "npm", ["run", "validate:startup-readiness"], true],
  ["virtual-route-contract", "Virtual route engine/dev contract", "npm", ["run", "validate:virtual-route"], true],
  ["rust-manifest-preflight", "Rust manifest preflight", "npm", ["run", "check:rust"], true],
  ["frontend-build-preflight", "Frontend build preflight", "npm", ["run", "preflight:frontend-build"], true],
  ["typescript", "TypeScript typecheck", "npm", ["run", "typecheck"], true],
  ["frontend-build", "Vite frontend build", "npm", ["run", "build:frontend"], true],
  ["tauri-package-preflight", "Tauri package preflight", "npm", ["run", "preflight:tauri-package"], true],
  ["local-tauri-rust-proof", "Local Tauri/Rust cargo check", "npm", ["run", "check:tauri-rust-local"], true],
  ["contract-reports", "Diagnostic contract reports", "npm", ["run", "test:contract-reports"], false],
].map(([id, label, command, args, blocking]) => ({ id, label, command, args, blocking }));

function runStep(step) {
  const startedAt = new Date().toISOString();
  const display = `${step.command} ${step.args.join(" ")}`;
  console.log(`\n${color.cyan}=== ${step.label} ===${color.reset}`);
  console.log(display);
  const result = spawnSync(step.command, step.args, { cwd: appRoot, shell: process.platform === "win32", encoding: "utf8", maxBuffer: 8_000_000 });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const status = result.status ?? (result.error ? 1 : 0);
  const ok = status === 0;
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  console.log(ok ? `${color.green}PASS:${color.reset} ${step.label}` : `${color.red}FAIL:${color.reset} ${step.label}`);
  return { ...step, commandLine: display, startedAt, finishedAt: new Date().toISOString(), ok, status, stdoutTail: stdout.slice(-12_000), stderrTail: stderr.slice(-12_000), error: result.error ? String(result.error) : null };
}

const startedAt = new Date().toISOString();
const results = [];
let failedBlocking = false;
for (const step of steps) {
  const result = runStep(step);
  results.push(result);
  if (!result.ok && step.blocking) {
    failedBlocking = true;
    break;
  }
}

const summary = {
  schema: "translateit.local_deep_app_check.v2",
  generatedAt: new Date().toISOString(),
  startedAt,
  finishedAt: new Date().toISOString(),
  appRoot,
  repoRoot,
  ok: !failedBlocking,
  failedBlocking: results.filter((result) => result.blocking && !result.ok).map((result) => result.id),
  failedNonBlocking: results.filter((result) => !result.blocking && !result.ok).map((result) => result.id),
  note: "This local deep check validates source contracts, UI wiring, readiness scenarios, error feedback, settings surface, TypeScript, frontend build, Tauri package preflight, and local cargo check.",
  results: results.map((result) => ({ id: result.id, label: result.label, commandLine: result.commandLine, blocking: result.blocking, ok: result.ok, status: result.status, startedAt: result.startedAt, finishedAt: result.finishedAt, error: result.error })),
};

const jsonPath = resolve(reportDir, "latest-local-deep-app-check.json");
const mdPath = resolve(reportDir, "latest-local-deep-app-check.md");
writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
writeFileSync(mdPath, [
  "# TranslateIT Local Deep App Check", "", `Overall: ${summary.ok ? "PASS" : "FAIL"}`, `Generated: ${summary.generatedAt}`, "", summary.note, "",
  "| Step | Blocking | Result | Command |", "|---|---:|---:|---|",
  ...summary.results.map((result) => `| ${result.label} | ${result.blocking ? "yes" : "no"} | ${result.ok ? "PASS" : "FAIL"} | \`${result.commandLine.replaceAll("|", "\\|")}\` |`),
  "", "## Failed blocking steps", "", summary.failedBlocking.length ? summary.failedBlocking.map((id) => `- ${id}`).join("\n") : "none",
  "", "## Failed non-blocking diagnostics", "", summary.failedNonBlocking.length ? summary.failedNonBlocking.map((id) => `- ${id}`).join("\n") : "none",
].join("\n"));

for (const result of results) {
  const detailPath = resolve(reportDir, `local-deep-app-check-${result.id}.log`);
  writeFileSync(detailPath, [`# ${result.label}`, `command=${result.commandLine}`, `blocking=${result.blocking}`, `ok=${result.ok}`, `status=${result.status}`, `startedAt=${result.startedAt}`, `finishedAt=${result.finishedAt}`, "", "## stdout tail", result.stdoutTail || "(empty)", "", "## stderr tail", result.stderrTail || "(empty)", "", "## error", result.error || "(none)", ""].join("\n"));
}

console.log("\nReport written:");
console.log(jsonPath);
console.log(mdPath);
if (summary.ok) {
  console.log(`\n${color.green}DONE: Local deep app check passed.${color.reset}`);
  process.exit(0);
}
console.error(`\n${color.red}FAILED: Local deep app check failed at blocking step(s): ${summary.failedBlocking.join(", ")}${color.reset}`);
process.exit(1);
