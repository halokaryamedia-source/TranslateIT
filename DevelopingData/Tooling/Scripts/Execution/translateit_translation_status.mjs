import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const runtimeManifestPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "MODEL_RUNTIME_MANIFEST.json");
const gapPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "RUNTIME_GAP_ESTIMATE.json");
const contractPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "TRANSLATION_RUNTIME_CONTRACT.json");

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

const runtimeManifest = readJson(runtimeManifestPath);
const gap = readJson(gapPath);
const contract = readJson(contractPath);
const primaryReady = Boolean(runtimeManifest?.translation?.primary?.ready);
const fallbackReady = Boolean(runtimeManifest?.translation?.fallback?.ready);
const successAllowed = contract?.success_claim_allowed_without_evidence === true;

const payload = {
  schema: "translateit.translation_status.v2",
  contract_loaded: Boolean(contract),
  runtime_manifest_loaded: Boolean(runtimeManifest),
  primary_translation_marker_ready: primaryReady,
  fallback_translation_marker_ready: fallbackReady,
  remaining_percent: gap?.remaining?.real_translation_percent ?? "25-30",
  ready_for_success_claim: successAllowed,
  blockers: [
    ...(primaryReady && fallbackReady ? [] : ["translation_marker_not_ready"]),
    ...(successAllowed ? [] : ["missing_real_target_pc_translation_evidence"])
  ],
  user_message: successAllowed ? contract?.user_message_pending : contract?.user_message_blocked,
  note: "Status only. This does not execute translation."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(successAllowed ? 0 : 1);
