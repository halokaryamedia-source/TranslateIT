import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const gapPath = join(ROOT, "EngineData", "Frontend", "RustApp", "RUNTIME_GAP_ESTIMATE.json");
const readinessPath = join(ROOT, "UserData", "LogData", "RustAppValidation", "latest_readiness_summary.json");

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

const gap = readJson(gapPath);
const readiness = readJson(readinessPath);
const payload = {
  schema: "translateit.gap_status.v1",
  gap_loaded: Boolean(gap),
  readiness_loaded: Boolean(readiness),
  remaining: gap?.remaining ?? null,
  client_ready: readiness?.client_ready ?? false,
  blockers: readiness?.blockers ?? ["missing:latest_readiness_summary.json"],
  note: "Status only. This does not run build, tests, worker smoke, ASR, translation, or TTS."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(payload.client_ready ? 0 : 1);
