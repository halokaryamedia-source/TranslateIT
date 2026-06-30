import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
mkdirSync(reportDir, { recursive: true });

const color = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const steps = [
  {
    id: "script-profiles",
    label: "Package script policy",
    command: "npm",
    args: ["run", "validate:script-profiles"],
    blocking: true,
  },
  {
    id: "import-integrity",
    label: "Frontend import integrity",
    command: "npm",
    args: ["run", "validate:imports"],
    blocking: true,
  },
  {
    id: "naming-policy",
    label: "Active route and naming policy",
    command: "npm",
    args: ["run", "validate:naming"],
    blocking: true,
  },
  {
    id: "translation-flow",
    label: "Translation flow contract",
    command: "npm",
    args: ["run", "validate:translation-flow"],
    blocking: true,
  },
  {
    id: "runtime-ux",
    label: "Runtime UX contract",
    command: "npm",
    args: ["run", "validate:runtime-ux"],
    blocking: true,
  },
  {
    id: "simple-ui",
    label: "Simple UI contract",
    command: "npm",
    args: ["run", "validate:simple-ui"],
    blocking: true,
  },
  {
    id: "functional-surface",
    label: "Functional surface contract",
    command: "npm",
    args: ["run", "validate:functional-surface"],
    blocking: true,
  },
  {
    id: "startup-readiness",
    label: "Startup readiness contract",
    command: "npm",
    args: ["run", "validate:startup-readiness"],
    blocking: true,
  },
  {
    id: "virtual-route-contract",
    label: "Virtual route engine/dev contract",
    command: "npm",
    args: ["run", "validate:virtual-route"],
    blocking: true,
  },
  {
    id: "rust-manifest-preflight",
    label: "Rust manifest preflight",
    command: "npm",
    args: ["run", "check:rust"],
    blocking: true,
  },
  {
    id: "frontend-build-preflight",
    label: "Frontend build preflight",
    command: "npm",
    args: ["run", "preflight:frontend-build"],
    blocking: true,
  },
  {
    id: "typescript",
    label: "TypeScript typecheck",
    command: "npm",
    args: ["run", "typecheck"],
    blocking: true,
  },
  {
    id: "frontend-build",
    label: "Vite frontend build",
    command: "npm",
    args: ["run", "build:frontend"],
    blocking: true,
  },
  {
    id: "tauri-package-preflight",
    label: "Tauri package preflight",
    command: "npm",
    args: ["run", "preflight:tauri-package"],
    blocking: true,
  },
  {
    id: "local-tauri-rust-proof",
    label: "Local Tauri/Rust cargo check",
    command: "npm",
    args: ["run", "check:tauri-rust-local"],
    blocking: true,
  },
  {
    id: "contract-reports",
    label: "Diagnostic contract reports",
    command: "npm",
    args: ["run", "test:contract-reports"],
    blocking: false,
  },
];

function runStep(step) {
  const startedAt = new Date().toISOString();
  const display = `${step.command} ${step.args.join(" ")}`;
  console.log(`\n${color.cyan}=== ${step.label} ===${color.reset}`);
  console.log(display);
  const result = spawnSync(step.command, step.args, {
    cwd: appRoot,
    shell: process.platform === "win32",
    encoding: "utf8",
    maxBuffer: 8_000_000,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const status = result.status ?? (result.error ? 1 : 0);
  const ok = status === 0;
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  console.log(ok ? `${color.green}PASS:${color.reset} ${step.label}` : `${color.red}FAIL:${color.reset} ${step.label}`);
  return {
    ...step,
    commandLine: display,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok,
    status,
    stdoutTail: stdout.slice(-12_000),
    stderrTail: stderr.slice(-12_000),
    error: result.error ? String(result.error) : null,
  };
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
  schema: "translateit.local_deep_app_check.v1",
  generatedAt: new Date().toISOString(),
  startedAt,
  finishedAt: new Date().toISOString(),
  appRoot,
  repoRoot,
  ok: !failedBlocking,
  failedBlocking: results.filter((result) => result.blocking && !result.ok).map((result) => result.id),
  failedNonBlocking: results.filter((result) => !result.blocking && !result.ok).map((result) => result.id),
  note: "This local deep check validates source contracts, UI wiring, TypeScript, frontend build, Tauri package preflight, and local cargo check. It does not replace final manual WebView/microphone/model usability testing.",
  results: results.map((result) => ({
    id: result.id,
    label: result.label,
    commandLine: result.commandLine,
    blocking: result.blocking,
    ok: result.ok,
    status: result.status,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    error: result.error,
  })),
};

const jsonPath = resolve(reportDir, "latest-local-deep-app-check.json");
const mdPath = resolve(reportDir, "latest-local-deep-app-check.md");
writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
writeFileSync(
  mdPath,
  [
    "# TranslateIT Local Deep App Check",
    "",
    `Overall: ${summary.ok ? "PASS" : "FAIL"}`,
    `Generated: ${summary.generatedAt}`,
    "",
    summary.note,
    "",
    "| Step | Blocking | Result | Command |",
    "|---|---:|---:|---|",
    ...summary.results.map((result) => `| ${result.label} | ${result.blocking ? "yes" : "no"} | ${result.ok ? "PASS" : "FAIL"} | \`${result.commandLine.replaceAll("|", "\\|")}\` |`),
    "",
    "## Failed blocking steps",
    "",
    summary.failedBlocking.length ? summary.failedBlocking.map((id) => `- ${id}`).join("\n") : "none",
    "",
    "## Failed non-blocking diagnostics",
    "",
    summary.failedNonBlocking.length ? summary.failedNonBlocking.map((id) => `- ${id}`).join("\n") : "none",
  ].join("\n"),
);

for (const result of results) {
  const detailPath = resolve(reportDir, `local-deep-app-check-${result.id}.log`);
  writeFileSync(
    detailPath,
    [
      `# ${result.label}`,
      `command=${result.commandLine}`,
      `blocking=${result.blocking}`,
      `ok=${result.ok}`,
      `status=${result.status}`,
      `startedAt=${result.startedAt}`,
      `finishedAt=${result.finishedAt}`,
      "",
      "## stdout tail",
      result.stdoutTail || "(empty)",
      "",
      "## stderr tail",
      result.stderrTail || "(empty)",
      "",
      "## error",
      result.error || "(none)",
      "",
    ].join("\n"),
  );
}

console.log(`\nReport written:`);
console.log(jsonPath);
console.log(mdPath);

if (summary.ok) {
  console.log(`\n${color.green}DONE: Local deep app check passed.${color.reset}`);
  process.exit(0);
}

console.error(`\n${color.red}FAILED: Local deep app check failed at blocking step(s): ${summary.failedBlocking.join(", ")}${color.reset}`);
process.exit(1);
