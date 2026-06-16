import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const runtimeManifestPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "MODEL_RUNTIME_MANIFEST.json");
const gapPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "RUNTIME_GAP_ESTIMATE.json");
const targetWavPath = join(ROOT, "UserData", "CacheData", "audio_segments", "latest_live_target_segment.wav");

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

const runtimeManifest = readJson(runtimeManifestPath);
const gap = readJson(gapPath);
const asrReady = Boolean(runtimeManifest?.asr?.primary?.ready || runtimeManifest?.asr?.backup?.ready);
const ttsReady = Boolean(runtimeManifest?.tts?.default_sapi_ready);

const payload = {
  schema: "translateit.voice_status.v1",
  runtime_manifest_loaded: Boolean(runtimeManifest),
  asr_marker_ready: asrReady,
  tts_marker_ready: ttsReady,
  latest_target_wav_exists: existsSync(targetWavPath),
  remaining_percent: gap?.remaining?.voice_pipeline_percent ?? "30-35",
  ready_for_success_claim: false,
  blockers: [
    ...(asrReady ? [] : ["asr_marker_not_ready"]),
    ...(ttsReady ? [] : ["tts_marker_not_ready"]),
    ...(existsSync(targetWavPath) ? [] : ["missing_latest_target_wav"]),
    "missing_real_target_pc_voice_evidence"
  ],
  note: "Status only. This does not run capture, ASR, translation, or TTS."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(1);
