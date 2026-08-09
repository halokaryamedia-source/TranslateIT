import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, ".tmp", "validation", "RuntimeTestReports");
const workerPath = resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "realtime_local_worker.py");
const acceleratedWorkerPath = resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "realtime_local_worker_accelerated.py");
const scriptsDir = resolve(appRoot, "scripts");
const rustCapturePath = resolve(appRoot, "src-tauri", "src", "engine", "capture_lifecycle.rs");
const manualTranslationPath = resolve(appRoot, "src-tauri", "src", "engine", "manual_translation_accelerated.rs");

const workerCommandContract = new Set([
  "ping",
  "status",
  "asr_preload",
  "transcribe",
  "translation_preload",
  "translate",
  "tts_preflight",
  "synthesize",
]);

const nonWorkerEnvelopeCommands = new Set([
  "capture_start",
  "capture_stop",
]);

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function unique(values) {
  return Array.from(new Set(values)).sort();
}

function handlerCommands(content) {
  const commands = [];
  for (const match of content.matchAll(/"([a-z_]+)"\s*:\s*handle_[a-z_]+/g)) commands.push(match[1]);
  for (const match of content.matchAll(/HANDLERS\["([a-z_]+)"\]/g)) commands.push(match[1]);
  return unique(commands);
}

function usedWorkerCommands(contents) {
  const commands = [];
  for (const content of contents) {
    for (const match of content.matchAll(/"command"\s*:\s*"([a-z_]+)"/g)) commands.push(match[1]);
    for (const match of content.matchAll(/command:\s*"([a-z_]+)"/g)) commands.push(match[1]);
  }
  return unique(commands).filter((command) => workerCommandContract.has(command));
}

function discoveredNonWorkerCommands(contents) {
  const commands = [];
  for (const content of contents) {
    for (const match of content.matchAll(/"command"\s*:\s*"([a-z_]+)"/g)) commands.push(match[1]);
    for (const match of content.matchAll(/command:\s*"([a-z_]+)"/g)) commands.push(match[1]);
  }
  return unique(commands).filter((command) => nonWorkerEnvelopeCommands.has(command));
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const worker = read(workerPath);
  const accelerated = read(acceleratedWorkerPath);
  const runtimeReport = read(resolve(scriptsDir, "run_local_runtime_test_report.mjs"));
  const voiceReport = read(resolve(scriptsDir, "run_voice_preflight_report.mjs"));
  const rustCapture = read(rustCapturePath);
  const manualTranslation = read(manualTranslationPath);
  const scannedSources = [runtimeReport, voiceReport, rustCapture, manualTranslation];
  const handlers = handlerCommands(`${worker}\n${accelerated}`);
  const used = usedWorkerCommands(scannedSources);
  const nonWorkerEnvelopes = discoveredNonWorkerCommands(scannedSources);
  const missingHandlers = used.filter((command) => !handlers.includes(command));
  const requiredCore = ["ping", "status", "asr_preload", "transcribe", "translate", "tts_preflight", "synthesize"];
  const missingCore = requiredCore.filter((command) => !handlers.includes(command));
  const ok = worker.length > 0 && missingHandlers.length === 0 && missingCore.length === 0;
  const report = {
    schema: "translateit.worker_contract_report.v2",
    generated_at: new Date().toISOString(),
    ok,
    worker_path: workerPath,
    accelerated_worker_path: acceleratedWorkerPath,
    accelerated_worker_present: existsSync(acceleratedWorkerPath),
    handlers,
    used_commands: used,
    non_worker_envelope_commands: nonWorkerEnvelopes,
    missing_handlers: missingHandlers,
    missing_core_handlers: missingCore,
  };
  const latestJson = resolve(reportDir, "latest-worker-contract.json");
  const latestMd = resolve(reportDir, "latest-worker-contract.md");
  const md = [
    "# TranslateIT Worker Contract Report",
    "",
    `OK: ${ok}`,
    `Accelerated worker present: ${report.accelerated_worker_present}`,
    "",
    "## Missing handlers for used worker commands",
    "",
    missingHandlers.length ? missingHandlers.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Missing required core handlers",
    "",
    missingCore.length ? missingCore.map((item) => `- ${item}`).join("\n") : "none",
    "",
    "## Used worker commands",
    "",
    used.map((item) => `- ${item}`).join("\n"),
    "",
    "## Non-worker helper envelope commands ignored by this report",
    "",
    nonWorkerEnvelopes.length ? nonWorkerEnvelopes.map((item) => `- ${item}`).join("\n") : "none",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Worker contract report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, handlers: handlers.length, used: used.length, missingHandlers, missingCore, nonWorkerEnvelopes }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();
