import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const rustApp = join(ROOT, "EngineData", "LauncherApp", "RustApp");

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

const contracts = {
  attachment: readJson(join(rustApp, "ATTACHMENT_RUNTIME_CONTRACT.json")),
  translation: readJson(join(rustApp, "TRANSLATION_RUNTIME_CONTRACT.json")),
  audio_pipeline: readJson(join(rustApp, "AUDIO_PIPELINE_RUNTIME_CONTRACT.json"))
};

const loaded = Object.fromEntries(Object.entries(contracts).map(([key, value]) => [key, Boolean(value)]));
const payload = {
  schema: "translateit.contract_status.v1",
  loaded,
  all_loaded: Object.values(loaded).every(Boolean),
  success_claim_allowed: false,
  note: "Contract status only. This does not run validation, model inference, audio recognition, or speech output."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(payload.all_loaded ? 0 : 1);
