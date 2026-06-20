import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, "UserData", "LogData", "RuntimeTestReports");
const evidencePath = resolve(repoRoot, "UserData", "LogData", "RustAppValidation", "latest_audio_pipeline_evidence.json");

function readEvidence() {
  if (!existsSync(evidencePath)) {
    return { found: false, ok: false, stage: "not_run", blocker: "voice_capture_evidence_missing" };
  }
  try {
    const data = JSON.parse(readFileSync(evidencePath, "utf8"));
    const ageMs = Date.now() - statSync(evidencePath).mtimeMs;
    return { found: true, age_ms: Math.round(ageMs), ...data };
  } catch (error) {
    return { found: true, ok: false, stage: "invalid_json", blocker: error instanceof Error ? error.message : String(error) };
  }
}

function classify(evidence) {
  if (!evidence.found) return "not_run";
  if (evidence.ok === true) return "pass";
  if (evidence.stage === "invalid_json") return "invalid_evidence";
  if (String(evidence.stage ?? "").includes("segment_write")) return "segment_write_failed";
  if (evidence.transcribe_ok === false) return "asr_failed";
  if (evidence.translate_ok === false) return "translation_failed";
  if (evidence.synthesize_ok === false) return "tts_failed";
  if (evidence.blocker) return "capture_failed";
  return "needs_attention";
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const evidence = readEvidence();
  const classification = classify(evidence);
  const report = {
    schema: "translateit.voice_capture_evidence_report.v2",
    generated_at: new Date().toISOString(),
    evidence_path: evidencePath,
    ok: evidence.ok === true,
    classification,
    evidence_summary: {
      found: evidence.found,
      age_ms: evidence.age_ms ?? null,
      stage: evidence.stage ?? "unknown",
      blocker: evidence.blocker ?? "",
      worker_script: evidence.worker_script ?? "",
      worker_preferred_accelerated: evidence.worker_preferred_accelerated ?? null,
      worker_fallback_standard: evidence.worker_fallback_standard ?? null,
      segment_write_ok: evidence.segment_write_ok ?? null,
      segment_duration_ms: evidence.segment_duration_ms ?? null,
      segment_sample_count: evidence.segment_sample_count ?? null,
      transcribe_ok: evidence.transcribe_ok ?? null,
      translate_ok: evidence.translate_ok ?? null,
      synthesize_ok: evidence.synthesize_ok ?? null,
      playback_ok: evidence.playback_ok ?? null,
      transcript_chars: evidence.transcript_chars ?? null,
      translated_chars: evidence.translated_chars ?? null,
      latency_ms: evidence.latency_ms ?? null,
    },
  };
  const latestJson = resolve(reportDir, "latest-voice-capture-evidence.json");
  const latestMd = resolve(reportDir, "latest-voice-capture-evidence.md");
  const md = [
    "# TranslateIT Voice Capture Evidence Report",
    "",
    `Generated: ${report.generated_at}`,
    `Evidence found: ${report.evidence_summary.found}`,
    `Classification: ${classification}`,
    `OK: ${report.ok}`,
    "",
    "| Field | Value |",
    "|---|---|",
    ...Object.entries(report.evidence_summary).map(([key, value]) => `| ${key} | ${value ?? ""} |`),
    "",
    "## Interpretation",
    "",
    classification === "not_run"
      ? "No mic stop evidence has been generated yet. Run a manual mic test after the app is open."
      : classification === "pass"
        ? "The latest mic capture pipeline completed through ASR, translation, and TTS."
        : classification === "segment_write_failed"
          ? "The latest mic capture stopped before ASR because the target WAV segment was not ready. Read blocker, duration, and sample count first."
          : "The latest mic capture pipeline needs attention. Read blocker and stage fields first.",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`Voice capture evidence report written: ${latestMd}`);
  console.log(JSON.stringify({ ok: report.ok, classification }, null, 2));
}

main();
