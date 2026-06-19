import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const workerRoot = resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime");
const acceleratedWorker = resolve(workerRoot, "realtime_local_worker_accelerated.py");
const standardWorker = resolve(workerRoot, "realtime_local_worker.py");
const workerPath = existsSync(acceleratedWorker) ? acceleratedWorker : standardWorker;
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");

function runWorker(payload, timeoutMs = 120000) {
  const started = Date.now();
  return new Promise((resolve) => {
    if (!existsSync(workerPath)) {
      resolve({ ok: false, stage: payload.command, blocker: "worker_script_missing", worker_path: workerPath });
      return;
    }
    const child = spawn(process.platform === "win32" ? "python" : "python3", [workerPath], {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      child.kill();
      resolve({ ok: false, stage: payload.command, blocker: "timeout", elapsed_ms: Date.now() - started, stderr_tail: stderr.slice(-600) });
    }, timeoutMs);
    child.stdout.on("data", (data) => { stdout += String(data); });
    child.stderr.on("data", (data) => { stderr += String(data); });
    child.on("close", (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        resolve({ ...JSON.parse(stdout.trim()), process_exit_code: code, elapsed_ms_total: Date.now() - started, stderr_tail: stderr.slice(-600) });
      } catch {
        resolve({ ok: false, stage: payload.command, blocker: "invalid_json", process_exit_code: code, stdout_tail: stdout.slice(-600), stderr_tail: stderr.slice(-600) });
      }
    });
    child.on("error", (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ ok: false, stage: payload.command, blocker: error.name, note: error.message });
    });
    child.stdin.write(`${JSON.stringify(payload)}\n`);
    child.stdin.end();
  });
}

function ok(value) {
  return value?.ok === true;
}

function row(name, value) {
  const state = ok(value) ? "PASS" : "FAIL";
  const blocker = value?.blocker ? ` / ${value.blocker}` : "";
  const elapsed = value?.elapsed_ms_total ? ` / ${value.elapsed_ms_total}ms` : value?.elapsed_ms ? ` / ${value.elapsed_ms}ms` : "";
  return `| ${name} | ${state}${blocker}${elapsed} |`;
}

async function main() {
  mkdirSync(reportDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const status = await runWorker({ command: "status" }, 60000);
  const asrPreload = await runWorker({ command: "asr_preload" }, 180000);
  const ttsPreflight = await runWorker({ command: "tts_preflight" }, 60000);
  const synthesize = await runWorker({ command: "synthesize", text: "Voice preflight complete." }, 60000);
  const finishedAt = new Date().toISOString();
  const summary = {
    worker_ok: ok(status),
    asr_ready: ok(asrPreload),
    tts_ready: ok(ttsPreflight) || ok(synthesize),
    synthesize_ok: ok(synthesize),
    asr_device: asrPreload?.device ?? status?.selected_device ?? "unknown",
    asr_compute_type: asrPreload?.compute_type ?? status?.selected_compute_type ?? "unknown",
    tts_provider: ttsPreflight?.provider ?? synthesize?.provider ?? "unknown",
    blocker: [status, asrPreload, ttsPreflight, synthesize].map((item) => item?.blocker).filter(Boolean).join(" | "),
  };
  const report = {
    schema: "translateit.voice_preflight_report.v1",
    started_at: startedAt,
    finished_at: finishedAt,
    worker_path: workerPath,
    results: { status, asr_preload: asrPreload, tts_preflight: ttsPreflight, synthesize },
    summary,
  };
  const latestJson = resolve(reportDir, "latest-voice-preflight.json");
  const latestMd = resolve(reportDir, "latest-voice-preflight.md");
  const md = [
    "# TranslateIT Voice Preflight Report",
    "",
    `Started: ${startedAt}`,
    `Finished: ${finishedAt}`,
    `Worker: ${workerPath}`,
    "",
    "| Scenario | Result |",
    "|---|---|",
    row("Worker status", status),
    row("ASR preload", asrPreload),
    row("TTS preflight", ttsPreflight),
    row("TTS synthesize", synthesize),
    "",
    "## Summary",
    "",
    `- ASR ready: ${summary.asr_ready}`,
    `- ASR device: ${summary.asr_device}`,
    `- ASR compute type: ${summary.asr_compute_type}`,
    `- TTS ready: ${summary.tts_ready}`,
    `- TTS provider: ${summary.tts_provider}`,
    `- Blocker: ${summary.blocker || "none"}`,
    "",
    "## Manual mic note",
    "",
    "This report validates worker-side ASR/TTS readiness. Actual microphone capture still requires the app runtime because browser/Tauri permissions and Windows input device state are interactive.",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Voice preflight report written: ${latestMd}`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.worker_ok || !summary.tts_ready) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
