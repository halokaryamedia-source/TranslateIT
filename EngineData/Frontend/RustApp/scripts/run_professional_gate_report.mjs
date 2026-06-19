import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");

const reportFiles = {
  runtime: "latest-runtime-test.json",
  voice: "latest-voice-preflight.json",
  ui: "latest-ui-readiness.json",
  settings: "latest-settings-integrity.json",
};

function readJson(name) {
  const path = resolve(reportDir, name);
  if (!existsSync(path)) return { ok: false, missing: true, path };
  try {
    return { ok: true, missing: false, path, data: JSON.parse(readFileSync(path, "utf8")) };
  } catch (error) {
    return { ok: false, missing: false, path, error: error instanceof Error ? error.message : String(error) };
  }
}

function runtimeGate(report) {
  const summary = report.data?.summary ?? {};
  return {
    ok: Boolean(summary.worker_alive && summary.status_ok && summary.realtime_translation_ok && summary.quality_translation_ok && summary.tts_ok),
    detail: `worker=${summary.worker_alive}; realtime=${summary.realtime_translation_ok}; quality=${summary.quality_translation_ok}; tts=${summary.tts_ok}; device=${summary.selected_translation_device ?? "unknown"}; blocker=${summary.blocker || "none"}`,
  };
}

function voiceGate(report) {
  const summary = report.data?.summary ?? {};
  return {
    ok: Boolean(summary.worker_ok && summary.tts_ready),
    detail: `worker=${summary.worker_ok}; asr=${summary.asr_ready}; tts=${summary.tts_ready}; device=${summary.asr_device ?? "unknown"}; blocker=${summary.blocker || "none"}`,
  };
}

function genericGate(report, label) {
  const summary = report.data?.summary;
  const ok = typeof report.data?.ok === "boolean" ? report.data.ok : Boolean(summary?.ok);
  return { ok, detail: `${label}=${ok}; failed=${summary?.failed?.join?.(", ") ?? "none"}` };
}

function gateFor(key, report) {
  if (!report.ok || report.missing) return { ok: false, detail: report.missing ? `missing ${report.path}` : `invalid ${report.path}: ${report.error}` };
  if (key === "runtime") return runtimeGate(report);
  if (key === "voice") return voiceGate(report);
  return genericGate(report, key);
}

function row(key, gate) {
  return `| ${key} | ${gate.ok ? "PASS" : "NEEDS ATTENTION"} | ${gate.detail} |`;
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const reports = Object.fromEntries(Object.entries(reportFiles).map(([key, file]) => [key, readJson(file)]));
  const gates = Object.fromEntries(Object.entries(reports).map(([key, report]) => [key, gateFor(key, report)]));
  const ok = Object.values(gates).every((gate) => gate.ok);
  const finalReport = {
    schema: "translateit.professional_gate_report.v1",
    generated_at: new Date().toISOString(),
    app_root: appRoot,
    ok,
    gates,
    reports: Object.fromEntries(Object.entries(reports).map(([key, report]) => [key, report.path])),
  };
  const latestJson = resolve(reportDir, "latest-professional-gate.json");
  const latestMd = resolve(reportDir, "latest-professional-gate.md");
  const md = [
    "# TranslateIT Professional Gate Report",
    "",
    `Generated: ${finalReport.generated_at}`,
    `Overall: ${ok ? "PASS" : "NEEDS ATTENTION"}`,
    "",
    "| Gate | Status | Detail |",
    "|---|---|---|",
    ...Object.entries(gates).map(([key, gate]) => row(key, gate)),
    "",
    "## Release guidance",
    "",
    ok ? "V1-Pull is eligible for deeper manual UI review before merging to V1." : "Do not merge V1-Pull to V1 yet. Fix the gates marked NEEDS ATTENTION first.",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(finalReport, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Professional gate report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, gates }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();
