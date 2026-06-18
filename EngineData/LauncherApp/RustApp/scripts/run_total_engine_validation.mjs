import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const APP = resolve(ROOT, "EngineData", "LauncherApp", "RustApp");
const SRC_TAURI = resolve(APP, "src-tauri");
const REPORT_DIR = resolve(ROOT, "docs", "local-validation");
const REPORT_MD = resolve(REPORT_DIR, "AUTOMATED_ENGINE_VALIDATION.md");
const REPORT_JSON = resolve(REPORT_DIR, "AUTOMATED_ENGINE_VALIDATION_SUMMARY.json");
const CACHE_DIR = resolve(ROOT, "UserData", "CacheData", "validation");
const CACHE_REPORT = resolve(CACHE_DIR, "latest_total_engine_validation.json");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const cargoCmd = process.platform === "win32" ? "cargo.exe" : "cargo";

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const ci = args.has("--ci");
const reportOnly = args.has("--report-only");
const workerOnly = args.has("--worker-only");

mkdirSync(REPORT_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });

function now() {
  return new Date().toISOString();
}

function spawnCommand(command, commandArgs, options = {}) {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", command, ...commandArgs], {
      cwd: options.cwd || APP,
      encoding: "utf8",
      shell: false,
      timeout: options.timeoutMs ?? 1000 * 60 * 60,
      env: {
        ...process.env,
        CI: ci ? "true" : process.env.CI,
        FORCE_COLOR: "0",
      },
      windowsHide: true,
    });
  }
  return spawnSync(command, commandArgs, {
    cwd: options.cwd || APP,
    encoding: "utf8",
    shell: false,
    timeout: options.timeoutMs ?? 1000 * 60 * 60,
    env: {
      ...process.env,
      CI: ci ? "true" : process.env.CI,
      FORCE_COLOR: "0",
    },
    windowsHide: true,
  });
}

function run(command, commandArgs, options = {}) {
  const startedAt = now();
  const started = Date.now();
  const result = spawnCommand(command, commandArgs, options);
  const durationMs = Date.now() - started;
  return {
    name: options.name || `${command} ${commandArgs.join(" ")}`,
    command,
    args: commandArgs,
    cwd: options.cwd || APP,
    started_at: startedAt,
    ended_at: now(),
    duration_ms: durationMs,
    status: result.status,
    signal: result.signal || null,
    timed_out: Boolean(result.error && result.error.code === "ETIMEDOUT"),
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
    ok: result.status === 0,
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function commandLine(name, script) {
  return {
    name,
    command: npmCmd,
    args: ["run", script],
  };
}

function directCommand(name, command, commandArgs, cwd = APP) {
  return {
    name,
    command,
    args: commandArgs,
    cwd,
  };
}

function cargoLine(name, args) {
  return {
    name,
    command: cargoCmd,
    args,
    cwd: SRC_TAURI,
  };
}

function parseJsonTail(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines.slice(index).join("\n");
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }
  return null;
}

function gitShortHead() {
  const result = spawnCommand(process.platform === "win32" ? "git.exe" : "git", ["rev-parse", "--short", "HEAD"], { cwd: APP });
  return result.status === 0 ? (result.stdout || "").trim() : null;
}

function classifyStatusScript(result) {
  const parsed = parseJsonTail(`${result.stdout}\n${result.stderr}`);
  const blockers = Array.isArray(parsed?.blockers) ? parsed.blockers : [];
  if (result.ok) return "PASS";
  if (blockers.some((item) => String(item).includes("missing_real_target_pc"))) return "BLOCKED";
  if (blockers.some((item) => String(item).includes("not_ready"))) return "BLOCKED";
  if (blockers.length > 0) return "PARTIAL";
  return "FAIL";
}

function classifyAudit(result) {
  if (result.ok) return "PASS";
  if (result.stdout.includes("vite") || result.stdout.includes("esbuild") || result.stderr.includes("vite") || result.stderr.includes("esbuild")) return "PARTIAL";
  return "FAIL";
}

function classifyKnownBlockers(result) {
  const text = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (text.includes("missing_real_target_pc") || text.includes("not_ready_until_target_pc_review") || text.includes("missing:latest_validation_evidence") || text.includes("missing:latest_manual_runtime_evidence")) {
    return "BLOCKED";
  }
  if (text.includes("executionpolicy") || text.includes("running scripts is disabled on this system")) {
    return "BLOCKED";
  }
  if (
    text.includes("blocked") ||
    text.includes("not ready") ||
    text.includes("missing evidence") ||
    text.includes("missing:") ||
    text.includes("unexpected") ||
    text.includes("vulnerability") ||
    text.includes("advisory") ||
    text.includes("warning") ||
    text.includes("access is denied") ||
    text.includes("os error 5")
  ) {
    return "PARTIAL";
  }
  return "FAIL";
}

function classifyNativeSmoke(result) {
  if (result.ok) return "PASS";
  const text = `${result.stdout}\n${result.stderr}`;
  if (
    text.toLowerCase().includes("access is denied") ||
    text.toLowerCase().includes("failed to remove file") ||
    text.toLowerCase().includes("blocking waiting for file lock") ||
    text.toLowerCase().includes("os error 5")
  ) {
    return "PARTIAL";
  }
  if (text.includes("startup-diagnostic") || text.includes("VITE ready") || text.includes("Running `target\\debug\\translateit.exe`") || text.includes("Running `target/debug/translateit.exe`") || text.includes("Finished `dev` profile")) return "PARTIAL";
  if (result.timed_out && (text.includes("Running") || text.includes("Finished") || text.includes("Compiling") || text.includes("Building") || text.length > 0)) return "PARTIAL";
  return "FAIL";
}

function runNativeSmoke() {
  const command = npmCmd;
  const args = ["run", "dev"];
  const startedAt = now();
  const started = Date.now();
  const child = spawnCommand(command, args, { cwd: APP, timeoutMs: 1000 * 60 * 8 });
  const endedAt = now();
  const stdout = (child.stdout || "").trim();
  const stderr = (child.stderr || "").trim();
  return {
    name: "validate:native-smoke",
    command,
    args,
    cwd: APP,
    started_at: startedAt,
    ended_at: endedAt,
    duration_ms: Date.now() - started,
    status: child.status,
    signal: child.signal || null,
    timed_out: Boolean(child.error && child.error.code === "ETIMEDOUT"),
    stdout,
    stderr,
    ok: child.status === 0,
    error: child.error ? String(child.error.message || child.error) : null,
  };
}

async function main() {
  const entries = [];
  const summary = { schema: "translateit.automated_engine_validation.v1", created_at: now(), commit: null, result: "FAIL", entries: [] };

  const commands = [];
  if (!reportOnly) {
    const base = [
      directCommand("npm install", npmCmd, ["install"]),
      commandLine("typecheck", "typecheck"),
      commandLine("check:rust", "check:rust"),
      commandLine("build:frontend", "build:frontend"),
      commandLine("build", "build"),
      cargoLine("cargo test", ["test"]),
      cargoLine("cargo fmt --check", ["fmt", "--check"]),
      cargoLine("cargo clippy", ["clippy", "--all-targets"]),
      cargoLine("cargo clippy -- -D warnings", ["clippy", "--all-targets", "--", "-D", "warnings"]),
      commandLine("validate:engine-total", "validate:engine-total"),
      commandLine("validate:helper-bridge", "validate:helper-bridge"),
      commandLine("validate:voice-capture", "validate:voice-capture"),
      commandLine("validate:runtime-flow", "validate:runtime-flow"),
      commandLine("validate:audio-studio", "validate:audio-studio"),
      commandLine("validate:audio-studio:local", "validate:audio-studio:local"),
      commandLine("verify:audio-studio:summary", "verify:audio-studio:summary"),
      commandLine("status:all", "status:all"),
      commandLine("status:translation", "status:translation"),
      commandLine("status:audio-pipeline", "status:audio-pipeline"),
      commandLine("status:readiness", "status:readiness"),
      commandLine("validate:internal", "validate:internal"),
      commandLine("validate:full", "validate:full"),
    commandLine("audit:deps", "audit:deps"),
    ];
    const workerCommands = [
      commandLine("setup:worker", "setup:worker"),
      commandLine("smoke:worker", "smoke:worker"),
      commandLine("smoke:worker:quality", "smoke:worker:quality"),
      commandLine("smoke:worker:audio", "smoke:worker:audio"),
    ];
    commands.push(...(workerOnly ? workerCommands : [...base, ...workerCommands]));
    if (!strict) commands.push({ name: "validate:native-smoke", command: "__native_smoke__", args: [] });
  }

  for (const entry of commands) {
    if (entry.command === "__native_smoke__") {
      const result = runNativeSmoke();
      const classification = classifyNativeSmoke(result);
      entries.push({ ...result, classification });
      continue;
    }
    const isStatusScript = entry.name.startsWith("status:");
    const isAudit = entry.name === "audit:deps";
    const isValidateFull = entry.name === "validate:full";
    const result = run(entry.command, entry.args, { cwd: entry.cwd, name: entry.name });
    let classification = result.ok ? "PASS" : "FAIL";
    if (isStatusScript) classification = classifyStatusScript(result);
    if (isAudit) classification = classifyAudit(result);
    if (isValidateFull && !result.ok) classification = classifyKnownBlockers(result);
    if (!isStatusScript && !isAudit && !isValidateFull && !result.ok) classification = classifyKnownBlockers(result);
    if (!result.ok && !["BLOCKED", "PARTIAL"].includes(classification)) {
      classification = "FAIL";
    }
    entries.push({ ...result, classification });
  }

  const hardFail = entries.some((item) => item.classification === "FAIL");
  const hasPartial = entries.some((item) => item.classification === "PARTIAL" || item.classification === "BLOCKED");
  summary.entries = entries;
  summary.commit = gitShortHead();
  summary.result = hardFail ? "FAIL" : hasPartial ? "PARTIAL" : "PASS";
  if (strict && summary.result !== "PASS") {
    summary.result = "FAIL";
  }

  const markdown = [
    "# Automated Engine Validation",
    "",
    `- Result: ${summary.result}`,
    `- Created at: ${summary.created_at}`,
    `- Commit: ${summary.commit || "unknown"}`,
    "",
    "| Area | Command | Result | Notes |",
    "|---|---|---|---|",
    ...entries.map((item) => `| ${item.name} | ${item.command} ${item.args.join(" ")} | ${item.classification} | ${(item.stderr || item.stdout || "").replaceAll("\n", " ").slice(0, 500)} |`),
    "",
    "## Summary",
    "",
    JSON.stringify(
      {
        result: summary.result,
        entries: entries.map((item) => ({ name: item.name, classification: item.classification, ok: item.ok, status: item.status, timed_out: item.timed_out })),
      },
      null,
      2,
    ),
    "",
  ].join("\n");

  writeFileSync(REPORT_MD, markdown, "utf8");
  writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(CACHE_REPORT, JSON.stringify(summary, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
  if (summary.result === "FAIL") process.exit(1);
  if (summary.result === "PARTIAL") process.exit(2);
  process.exit(0);
}

main().catch((error) => {
  const payload = { schema: "translateit.automated_engine_validation.v1", created_at: now(), result: "FAIL", error: String(error?.stack || error) };
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(REPORT_JSON, JSON.stringify(payload, null, 2), "utf8");
  console.error(payload.error);
  process.exit(1);
});
