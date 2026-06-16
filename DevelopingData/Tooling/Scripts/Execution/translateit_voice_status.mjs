import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const runtimeManifestPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "MODEL_RUNTIME_MANIFEST.json");
const gapPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "RUNTIME_GAP_ESTIMATE.json");
const contractPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "AUDIO_PIPELINE_RUNTIME_CONTRACT.json");

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

const runtimeManifest = readJson(runtimeManifestPath);
const gap = readJson(gapPath);
const contract = readJson(contractPath);
const targetAudioPath = contract?.target_audio_path ? join(ROOT, ...contract.target_audio_path.split("/")) : "";
const asrReady = Boolean(runtimeManifest?.asr?.primary?.ready || runtimeManifest?.asr?.backup?.ready);
const ttsReady = Boolean(runtimeManifest?.tts?.default_sapi_ready);
const successAllowed = contract?.success_claim_allowed_without_evidence === true;

const payload = {
  schema: "translateit.audio_pipeline_status.v2",
  contract_loaded: Boolean(contract),
  runtime_manifest_loaded: Boolean(runtimeManifest),
  asr_marker_ready: asrReady,
  tts_marker_ready: ttsReady,
  latest_target_audio_exists: targetAudioPath ? existsSync(targetAudioPath) : false,
  remaining_percent: gap?.remaining?.voice_pipeline_percent ?? "30-35",
  ready_for_success_claim: successAllowed,
  blockers: [
    ...(asrReady ? [] : ["asr_marker_not_ready"]),
    ...(ttsReady ? [] : ["tts_marker_not_ready"]),
    ...(targetAudioPath && existsSync(targetAudioPath) ? [] : ["missing_latest_target_audio"]),
    ...(successAllowed ? [] : ["missing_real_target_pc_audio_evidence"])
  ],
  user_message: successAllowed ? contract?.user_message_pending : contract?.user_message_blocked,
  note: "Status only. This does not execute capture, recognition, translation, or speech output."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(successAllowed ? 0 : 1);
