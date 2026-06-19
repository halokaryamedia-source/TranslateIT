import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const appPackage = join(ROOT, "EngineData", "Frontend", "RustApp");
const contractsRoot = join(ROOT, "EngineData", "Backend", "RuntimeContracts");
const gapPath = join(appPackage, "RUNTIME_GAP_ESTIMATE.json");
const manifestPath = join(contractsRoot, "MODEL_RUNTIME_MANIFEST.json");
const attachmentContractPath = join(contractsRoot, "ATTACHMENT_RUNTIME_CONTRACT.json");
const translationContractPath = join(contractsRoot, "TRANSLATION_RUNTIME_CONTRACT.json");
const audioContractPath = join(contractsRoot, "AUDIO_PIPELINE_RUNTIME_CONTRACT.json");

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function fromRepoPath(value) {
  return value ? join(ROOT, ...value.split("/")) : "";
}

const gap = readJson(gapPath);
const manifest = readJson(manifestPath);
const attachmentContract = readJson(attachmentContractPath);
const translationContract = readJson(translationContractPath);
const audioContract = readJson(audioContractPath);
const evidence = Object.fromEntries(Object.entries(gap?.evidence_files ?? {}).map(([key, value]) => [key, existsSync(fromRepoPath(value))]));
const payload = {
  schema: "translateit.remaining_status.v4",
  gap_path: "EngineData/Frontend/RustApp/RUNTIME_GAP_ESTIMATE.json",
  contracts_root: "EngineData/Backend/RuntimeContracts",
  remaining: gap?.remaining ?? null,
  contracts_loaded: {
    attachment: Boolean(attachmentContract),
    translation: Boolean(translationContract),
    audio_pipeline: Boolean(audioContract)
  },
  evidence_present: evidence,
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
