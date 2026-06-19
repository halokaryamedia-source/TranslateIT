import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");

const reportFiles = {
  package_scripts: "latest-package-script-integrity.json",
  frontend_backend_contract: "latest-frontend-backend-contract.json",
  worker_contract: "latest-worker-contract.json",
  rust_module_linkage: "latest-rust-module-linkage.json",
  accelerated_worker_usage: "latest-accelerated-worker-usage.json",
  runtime: "latest-runtime-test.json",
  voice_preflight: "latest-voice-preflight.json",
  voice_capture_evidence: "latest-voice-capture-evidence.json",
  ui: "latest-ui-readiness.json",
  ui_binding: "latest-ui-binding-consistency.json",
  action_binding: "latest-action-binding.json",
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
    advisory: false,
    detail: `worker=${summary.worker_alive}; realtime=${summary.realtime_translation_ok}; quality=${summary.quality_translation_ok}; tts=${summary.tts_ok}; device=${summary.selected_translation_device ?? "unknown"}; blocker=${summary.blocker || "none"}`,
  };
}

function voicePreflightGate(report) {
  const summary = report.data?.summary ?? {};
  return {
    ok: Boolean(summary.worker_ok && summary.tts_ready),
    advisory: false,
    detail: `worker=${summary.worker_ok}; asr=${summary.asr_ready}; tts=${summary.tts_ready}; device=${summary.asr_device ?? "unknown"}; blocker=${summary.blocker || "none"}`,
  };
}

function voiceCaptureEvidenceGate(report) {
  if (!report.ok || report.missing) {
    return { ok: true, advisory: true, detail: `manual mic evidence not generated yet; ${report.missing ? `missing ${report.path}` : report.error}` };
  }
  const classification = report.data?.classification ?? "unknown";
  const summary = report.data?.evidence_summary ?? {};
  const pass = report.data?.ok === true;
  const notRun = classification === "not_run";
  return {
    ok: pass || notRun,
    advisory: notRun,
    detail: `classification=${classification}; stage=${summary.stage ?? "unknown"}; blocker=${summary.blocker || "none"}; worker=${summary.worker_script ?? "unknown"}; transcript_chars=${summary.transcript_chars ?? "n/a"}; translated_chars=${summary.translated_chars ?? "n/a"}`,
  };
}

function boolFromReportData(data) {
  if (typeof data?.ok === "boolean") return data.ok;
  if (typeof data?.summary?.ok === "boolean") return data.summary.ok;
  if (typeof data?.summary?.passed === "boolean") return data.summary.passed;
  return false;
}

function failureSummary(data) {
  const values = [
    ...(Array.isArray(data?.summary?.failed) ? data.summary.failed : []),
    ...(Array.isArray(data?.failed) ? data.failed : []),
    ...(Array.isArray(data?.missing_backend_commands) ? data.missing_backend_commands : []),
    ...(Array.isArray(data?.missing_handlers) ? data.missing_handlers : []),
    ...(Array.isArray(data?.missing_core_handlers) ? data.missing_core_handlers : []),
    ...(Array.isArray(data?.missing_from_test_local_final) ? data.missing_from_test_local_final : []),
    ...(Array.isArray(data?.duplicate_script_keys) ? data.duplicate_script_keys : []),
  ];
  return values.length ? values.join(", ") : "none";
}

function genericGate(report, label) {
  const ok = boolFromReportData(report.data);
  return { ok, advisory: false, detail: `${label}=${ok}; failed=${failureSummary(report.data)}` };
}

function gateFor(key, report) {
  if (key === "voice_capture_evidence") return voiceCaptureEvidenceGate(report);
  if (!report.ok || report.missing) return { ok: false, advisory: false, detail: report.missing ? `missing ${report.path}` : `invalid ${report.path}: ${report.error}` };
  if (key === "runtime") return runtimeGate(report);
  if (key === "voice_preflight") return voicePreflightGate(report);
  return genericGate(report, key);
}

function statusText(gate) {
  if (gate.ok && gate.advisory) return "ADVISORY";
  return gate.ok ? "PASS" : "NEEDS ATTENTION";
}

function row(key, gate) {
  return `| ${key} | ${statusText(gate)} | ${gate.detail} |`;
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const reports = Object.fromEntries(Object.entries(reportFiles).map(([key, file]) => [key, readJson(file)]));
  const gates = Object.fromEntries(Object.entries(reports).map(([key, report]) => [key, gateFor(key, report)]));
  const ok = Object.values(gates).every((gate) => gate.ok);
  const finalReport = {
    schema: "translateit.professional_gate_report.v3",
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
    ok ? "V1-Pull is eligible for deeper manual UI review before any manual merge to V1. Advisory gates may still require manual mic evidence." : "Do not merge V1-Pull to V1 yet. Fix the gates marked NEEDS ATTENTION first.",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(finalReport, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Professional gate report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, gates }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();
