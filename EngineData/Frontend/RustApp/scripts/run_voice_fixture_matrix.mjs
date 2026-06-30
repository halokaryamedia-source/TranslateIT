import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTO_TEST_REPORT_DIR } from "./auto_test_registry.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const scriptsRoot = resolve(appRoot, "scripts");
const reportDir = resolve(repoRoot, ...AUTO_TEST_REPORT_DIR);
const generatedAudioDir = resolve(reportDir, "generated-audio-fixtures");
const manifestPath = resolve(scriptsRoot, "fixtures", "voice_scenarios.json");
const TRANSLATION_DICTIONARY = new Map([
  ["id->en::halo dunia", "hello world"],
  ["en->id::hello world", "halo dunia"],
]);

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAllKeywords(text, keywords = []) {
  const normalized = normalizeText(text);
  return keywords.every((keyword) => normalized.includes(normalizeText(keyword)));
}

function writeAscii(buffer, offset, value) {
  buffer.write(value, offset, value.length, "ascii");
}

function createPcmWav(samples, sampleRateHz) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  writeAscii(buffer, 0, "RIFF");
  buffer.writeUInt32LE(36 + dataSize, 4);
  writeAscii(buffer, 8, "WAVE");
  writeAscii(buffer, 12, "fmt ");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRateHz, 24);
  buffer.writeUInt32LE(sampleRateHz * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  writeAscii(buffer, 36, "data");
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + index * bytesPerSample);
  }

  return buffer;
}

function synthesizeScenarioAudio(scenario) {
  const sampleRateHz = scenario.sample_rate_hz ?? 16000;
  const durationMs = scenario.duration_ms ?? 1500;
  const totalSamples = Math.max(1, Math.round((durationMs / 1000) * sampleRateHz));
  const text = normalizeText(scenario.text);
  const characters = text.length ? Array.from(text) : [" "];
  const samples = new Array(totalSamples);

  for (let index = 0; index < totalSamples; index += 1) {
    if (scenario.mode === "silence_guard") {
      samples[index] = 0;
      continue;
    }

    const progress = index / totalSamples;
    const charIndex = Math.min(characters.length - 1, Math.floor(progress * characters.length));
    const code = characters[charIndex].charCodeAt(0);
    const frequency = 180 + (code % 24) * 18;
    const syllableGate = Math.sin(2 * Math.PI * 6 * progress) > -0.35 ? 1 : 0.12;
    const fadeIn = Math.min(1, index / Math.max(1, sampleRateHz * 0.04));
    const fadeOut = Math.min(1, (totalSamples - index) / Math.max(1, sampleRateHz * 0.04));
    const envelope = Math.min(fadeIn, fadeOut) * syllableGate;
    const carrier = Math.sin((2 * Math.PI * frequency * index) / sampleRateHz);
    const overtone = 0.35 * Math.sin((2 * Math.PI * frequency * 2.01 * index) / sampleRateHz);
    samples[index] = 0.28 * envelope * (carrier + overtone);
  }

  return createPcmWav(samples, sampleRateHz);
}

function readWavMetadata(buffer) {
  if (buffer.length < 44) return { valid: false, reason: "WAV buffer is shorter than 44 bytes." };
  const riff = buffer.toString("ascii", 0, 4);
  const wave = buffer.toString("ascii", 8, 12);
  const data = buffer.toString("ascii", 36, 40);
  const sampleRateHz = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  const dataBytes = buffer.readUInt32LE(40);
  const durationMs = Math.round((dataBytes / Math.max(1, sampleRateHz * (bitsPerSample / 8))) * 1000);
  const valid = riff === "RIFF" && wave === "WAVE" && data === "data" && sampleRateHz > 0 && bitsPerSample === 16 && dataBytes > 0;
  return { valid, riff, wave, data, sample_rate_hz: sampleRateHz, bits_per_sample: bitsPerSample, data_bytes: dataBytes, duration_ms: durationMs };
}

function simulateTranscript(scenario) {
  if (scenario.mode === "silence_guard") return "";
  return normalizeText(scenario.text);
}

function simulateTranslation(scenario, transcript) {
  if (!transcript) return "";
  const key = `${scenario.source_language}->${scenario.target_language}::${normalizeText(transcript)}`;
  return TRANSLATION_DICTIONARY.get(key) ?? transcript;
}

function validateScenarioShape(scenario) {
  const errors = [];
  for (const field of ["id", "title", "mode", "source_language", "target_language", "purpose"]) {
    if (typeof scenario[field] !== "string" || scenario[field].trim().length === 0) errors.push(`missing ${field}`);
  }
  if (!Array.isArray(scenario.expected_transcript_keywords)) errors.push("expected_transcript_keywords must be an array");
  if (!Array.isArray(scenario.expected_translation_keywords)) errors.push("expected_translation_keywords must be an array");
  if (!Number.isFinite(scenario.duration_ms) || scenario.duration_ms <= 0) errors.push("duration_ms must be positive");
  return errors;
}

function runScenario(scenario) {
  const shapeErrors = validateScenarioShape(scenario);
  const audioPath = resolve(generatedAudioDir, `${scenario.id}.wav`);
  const started = Date.now();
  let wavMetadata = { valid: false, reason: "not generated" };
  let transcript = "";
  let translation = "";
  const checks = [];

  try {
    if (shapeErrors.length) throw new Error(shapeErrors.join("; "));
    const audio = synthesizeScenarioAudio(scenario);
    writeFileSync(audioPath, audio);
    wavMetadata = readWavMetadata(audio);
    transcript = simulateTranscript(scenario);
    translation = simulateTranslation(scenario, transcript);

    checks.push({ id: "manifest_shape", ok: shapeErrors.length === 0, detail: shapeErrors.join("; ") || "valid" });
    checks.push({ id: "audio_generated", ok: existsSync(audioPath), detail: audioPath });
    checks.push({ id: "wav_header_valid", ok: wavMetadata.valid, detail: JSON.stringify(wavMetadata) });

    if (scenario.mode === "silence_guard") {
      checks.push({ id: "silent_transcript_guard", ok: transcript.length === 0, detail: "silent audio should not produce transcript" });
      checks.push({ id: "silent_translation_guard", ok: translation.length === 0, detail: "silent audio should not produce translation" });
    } else {
      checks.push({ id: "synthetic_transcript", ok: containsAllKeywords(transcript, scenario.expected_transcript_keywords), detail: transcript });
      checks.push({ id: "synthetic_translation", ok: containsAllKeywords(translation, scenario.expected_translation_keywords), detail: translation });
    }
  } catch (error) {
    checks.push({ id: "scenario_exception", ok: false, detail: error instanceof Error ? error.message : String(error) });
  }

  const failedChecks = checks.filter((check) => !check.ok);
  return {
    id: scenario.id,
    title: scenario.title,
    mode: scenario.mode,
    source_language: scenario.source_language,
    target_language: scenario.target_language,
    status: failedChecks.length ? "failed" : "passed",
    ok: failedChecks.length === 0,
    duration_ms: Date.now() - started,
    purpose: scenario.purpose,
    generated_audio: audioPath,
    wav: wavMetadata,
    transcript,
    translation,
    checks,
    failure_markers: failedChecks.map((check) => `${check.id}: ${check.detail}`),
  };
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
}

function main() {
  mkdirSync(generatedAudioDir, { recursive: true });
  if (!existsSync(manifestPath)) throw new Error(`Missing voice scenario manifest: ${manifestPath}`);
  const scenarios = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(scenarios)) throw new Error("Voice scenario manifest must be a JSON array.");

  const startedAt = new Date();
  const results = scenarios.map(runScenario);
  const finishedAt = new Date();
  const failures = results.filter((result) => !result.ok);
  const report = {
    schema: "translateit.voice_fixture_matrix.v1",
    generated_at: finishedAt.toISOString(),
    started_at: startedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    mode: "diagnostic-synthetic-voice-fixture",
    note: "This runner generates deterministic WAV fixtures and simulates transcript output from the manifest. It does not require a real microphone or real ASR model.",
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: failures.length,
    results,
  };

  writeFileSync(resolve(reportDir, "latest-voice-fixture-matrix.json"), JSON.stringify(report, null, 2));
  writeFileSync(resolve(reportDir, "latest-voice-fixture-matrix.md"), [
    "# TranslateIT Voice Fixture Matrix",
    "",
    `Generated: ${report.generated_at}`,
    `Mode: ${report.mode}`,
    `Total: ${report.total}`,
    `Passed: ${report.passed}`,
    `Failed: ${report.failed}`,
    "",
    "> This is an automatic generated-audio fixture test. It is designed to reduce repeated manual microphone QA before real ASR fixture tests are promoted.",
    "",
    "## Scenarios",
    "",
    "| Status | Scenario | Mode | Source | Target | Transcript | Translation | Audio |",
    "|---|---|---|---|---|---|---|---|",
    ...results.map((result) => `| ${result.ok ? "PASS" : "FAIL"} | ${markdownCell(result.title)} | ${markdownCell(result.mode)} | ${markdownCell(result.source_language)} | ${markdownCell(result.target_language)} | ${markdownCell(result.transcript || "(empty)")} | ${markdownCell(result.translation || "(empty)")} | ${markdownCell(result.generated_audio)} |`),
    "",
    "## Failure Details",
    "",
    failures.length
      ? failures.flatMap((result) => [
          `### ${result.id}`,
          "",
          ...result.failure_markers.map((marker) => `- ${marker}`),
          "",
        ]).join("\n")
      : "none",
    "",
  ].join("\n"));

  console.log("Voice fixture matrix summary:");
  console.log(JSON.stringify({ ...report, results: results.map(({ checks, ...result }) => result) }, null, 2));

  if (failures.length) process.exit(1);
}

main();
