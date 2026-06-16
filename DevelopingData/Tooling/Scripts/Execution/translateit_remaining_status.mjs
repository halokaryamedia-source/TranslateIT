import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const rustApp = join(ROOT, "EngineData", "LauncherApp", "RustApp");
const gapPath = join(rustApp, "RUNTIME_GAP_ESTIMATE.json");
const manifestPath = join(rustApp, "MODEL_RUNTIME_MANIFEST.json");
const attachmentContractPath = join(rustApp, "ATTACHMENT_RUNTIME_CONTRACT.json");
const translationContractPath = join(rustApp, "TRANSLATION_RUNTIME_CONTRACT.json");
const audioContractPath = join(rustApp, "AUDIO_PIPELINE_RUNTIME_CONTRACT.json");

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

const gap = readJson(gapPath);
const manifest = readJson(manifestPath);
const attachmentContract = readJson(attachmentContractPath);
const translationContract = readJson(translationContractPath);
const audioContract = readJson(audioContractPath);
const payload = {
  schema: "translateit.remaining_status.v2",
  remaining: gap?.remaining ?? null,
  contracts_loaded: {
    attachment: Boolean(attachmentContract),
    translation: Boolean(translationContract),
    audio_pipeline: Boolean(audioContract)
  },
  runtime_manifest_loaded: Boolean(manifest),
  markers: {
    attachment_text_only: attachmentContract?.text_only_supported === true,
    translation_ready: Boolean(manifest?.translation?.primary?.ready && manifest?.translation?.fallback?.ready),
    audio_ready: Boolean(manifest?.asr?.primary?.ready && manifest?.tts?.default_sapi_ready)
  },
  success_claim_allowed: false,
  note: "Read-only status. No validation is executed."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(0);
