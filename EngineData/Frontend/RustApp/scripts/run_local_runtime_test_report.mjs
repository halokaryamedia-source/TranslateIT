import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const workerPath = resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "realtime_local_worker.py");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const timeoutMs = Number(process.env.TRANSLATEIT_TEST_TIMEOUT_MS ?? 120000);

function nowIso() {
  return new Date().toISOString();
}

function runWorker(payload, timeout = timeoutMs) {
  const started = Date.now();
  return new Promise((resolve) => {
    if (!existsSync(workerPath)) {
      resolve({ ok: false, stage: payload.command, blocker: "worker_script_missing", elapsed_ms: 0, worker_path: workerPath });
      return;
    }
    const child = spawn(process.platform === "win32" ? "python" : "python3", [workerPath], {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({ ok: false, stage: payload.command, blocker: "timeout", elapsed_ms: Date.now() - started, timeout_ms: timeout, stderr: stderr.slice(-1000) });
    }, timeout);
    child.stdout.on("data", (data) => { stdout += String(data); });
    child.stderr.on("data", (data) => { stderr += String(data); });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, stage: payload.command, blocker: error.name, note: error.message, elapsed_ms: Date.now() - started });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const elapsed = Date.now() - started;
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve({ ...parsed, elapsed_ms_total: elapsed, process_exit_code: code, stderr_tail: stderr.slice(-1000) });
      } catch {
        resolve({ ok: false, stage: payload.command, blocker: "invalid_json", elapsed_ms: elapsed, process_exit_code: code, stdout_tail: stdout.slice(-1000), stderr_tail: stderr.slice(-1000) });
      }
    });
    child.stdin.write(`${JSON.stringify(payload)}\n`);
    child.stdin.end();
  });
}

function pass(value) {
  return value?.ok === true;
}

function row(label, result) {
  const mark = pass(result) ? "PASS" : "FAIL";
  const blocker = result?.blocker ? ` / ${result.blocker}` : "";
  const elapsed = typeof result?.elapsed_ms_total === "number" ? ` / ${result.elapsed_ms_total}ms` : typeof result?.elapsed_ms === "number" ? ` / ${result.elapsed_ms}ms` : "";
  return `| ${label} | ${mark}${blocker}${elapsed} |`;
}

async function main() {
  mkdirSync(reportDir, { recursive: true });
  const startedAt = nowIso();
  const status = await runWorker({ command: "status" }, 60000);
  const ping = await runWorker({ command: "ping" }, 15000);
  const translationRealtime = await runWorker({ command: "translate", text: "coba berbicara hari ini", source_language: "id", target_language: "en", mode: "Realtime", max_new_tokens: 64 }, 120000);
  const translationQuality = await runWorker({ command: "translate", text: "coba berbicara hari ini", source_language: "id", target_language: "en", mode: "Quality", max_new_tokens: 64 }, 180000);
  const translationReverse = await runWorker({ command: "translate", text: "try speaking today", source_language: "en", target_language: "id", mode: "Quality", max_new_tokens: 64 }, 180000);
  const tts = await runWorker({ command: "synthesize", text: "Translation test complete." }, 60000);
  const finishedAt = nowIso();
  const report = {
    schema: "translateit.local_runtime_test_report.v1",
    started_at: startedAt,
    finished_at: finishedAt,
    repo_root: repoRoot,
    worker_path: workerPath,
    results: { ping, status, translation_realtime: translationRealtime, translation_quality: translationQuality, translation_reverse: translationReverse, tts },
    summary: {
      worker_alive: pass(ping),
      status_ok: pass(status),
      realtime_translation_ok: pass(translationRealtime),
      quality_translation_ok: pass(translationQuality),
      reverse_quality_translation_ok: pass(translationReverse),
      tts_ok: pass(tts),
      selected_translation_device: status?.selected_translation_device ?? translationRealtime?.device ?? "unknown",
      torch_cuda_available: status?.torch_cuda_available ?? false,
      ctranslate2_cuda_available: status?.ctranslate2_cuda_available ?? false,
      blocker: [ping, status, translationRealtime, translationQuality, translationReverse, tts].map((item) => item?.blocker).filter(Boolean).join(" | "),
    },
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = resolve(reportDir, `runtime-test-${stamp}.json`);
  const latestJsonPath = resolve(reportDir, "latest-runtime-test.json");
  const mdPath = resolve(reportDir, `runtime-test-${stamp}.md`);
  const latestMdPath = resolve(reportDir, "latest-runtime-test.md");
  const markdown = [
    "# TranslateIT Local Runtime Test Report",
    "",
    `Started: ${startedAt}`,
    `Finished: ${finishedAt}`,
    `Worker: ${workerPath}`,
    "",
    "| Scenario | Result |",
    "|---|---|",
    row("Worker ping", ping),
    row("Worker status", status),
    row("Realtime ID -> EN translation", translationRealtime),
    row("Quality ID -> EN translation", translationQuality),
    row("Quality EN -> ID translation", translationReverse),
    row("TTS synthesize", tts),
    "",
    "## Summary",
    "",
    `- Selected translation device: ${report.summary.selected_translation_device}`,
    `- Torch CUDA available: ${report.summary.torch_cuda_available}`,
    `- CTranslate2 CUDA available: ${report.summary.ctranslate2_cuda_available}`,
    `- Blocker: ${report.summary.blocker || "none"}`,
    "",
    "## Next manual checks",
    "",
    "1. Open the app with `npm.cmd run dev`.",
    "2. Confirm status pill matches this report.",
    "3. Test mic click-toggle for at least 2 seconds before stopping.",
    "4. Read latest audio evidence from `UserData/LogData/RustAppValidation/latest_audio_pipeline_evidence.json` if voice fails.",
  ].join("\n");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(latestJsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, markdown);
  writeFileSync(latestMdPath, markdown);
  console.log(`Runtime test report written: ${latestMdPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
  if (!report.summary.worker_alive || !report.summary.realtime_translation_ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
