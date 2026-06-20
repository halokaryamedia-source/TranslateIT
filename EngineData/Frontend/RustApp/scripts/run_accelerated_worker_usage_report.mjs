import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");

const files = {
  acceleratedWorker: resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "realtime_local_worker_accelerated.py"),
  ct2Setup: resolve(repoRoot, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "setup_ctranslate2_translation_model.py"),
  manualTranslation: resolve(appRoot, "src-tauri", "src", "engine", "manual_translation_accelerated.rs"),
  captureLifecycle: resolve(appRoot, "src-tauri", "src", "engine", "capture_lifecycle.rs"),
  runtimeReport: resolve(appRoot, "scripts", "run_local_runtime_test_report.mjs"),
};

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function check(name, ok, detail) {
  return { name, ok, detail };
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const content = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, read(path)]));
  const checks = [
    check("accelerated worker exists", content.acceleratedWorker.length > 0, files.acceleratedWorker),
    check("CT2 setup exists", content.ct2Setup.length > 0, files.ct2Setup),
    check("manual text translation prefers accelerated worker", content.manualTranslation.includes("realtime_local_worker_accelerated.py"), files.manualTranslation),
    check("runtime report prefers accelerated worker", content.runtimeReport.includes("realtime_local_worker_accelerated.py"), files.runtimeReport),
    check("audio pipeline capture lifecycle prefers accelerated worker", content.captureLifecycle.includes("realtime_local_worker_accelerated.py"), files.captureLifecycle),
  ];
  const ok = checks.every((item) => item.ok);
  const report = {
    schema: "translateit.accelerated_worker_usage_report.v1",
    generated_at: new Date().toISOString(),
    ok,
    checks,
  };
  const latestJson = resolve(reportDir, "latest-accelerated-worker-usage.json");
  const latestMd = resolve(reportDir, "latest-accelerated-worker-usage.md");
  const md = [
    "# TranslateIT Accelerated Worker Usage Report",
    "",
    `OK: ${ok}`,
    "",
    "| Check | Result | Detail |",
    "|---|---|---|",
    ...checks.map((item) => `| ${item.name} | ${item.ok ? "PASS" : "FAIL"} | ${item.detail} |`),
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Accelerated worker usage report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, failed: checks.filter((item) => !item.ok).map((item) => item.name) }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();
