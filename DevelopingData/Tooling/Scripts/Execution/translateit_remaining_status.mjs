import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const gapPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "RUNTIME_GAP_ESTIMATE.json");
const manifestPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "MODEL_RUNTIME_MANIFEST.json");

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

const gap = readJson(gapPath);
const manifest = readJson(manifestPath);
const payload = {
  schema: "translateit.remaining_status.v1",
  remaining: gap?.remaining ?? null,
  runtime_manifest_loaded: Boolean(manifest),
  translation_marker_ready: Boolean(manifest?.translation?.primary?.ready && manifest?.translation?.fallback?.ready),
  audio_marker_ready: Boolean(manifest?.asr?.primary?.ready && manifest?.tts?.default_sapi_ready),
  success_claim_allowed: false,
  note: "Read-only status. No validation is executed."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(0);
