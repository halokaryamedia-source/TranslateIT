import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const checks = [
  ["contracts", "translateit_contract_status.mjs"],
  ["attachment", "translateit_attachment_status.mjs"],
  ["translation", "translateit_translation_status.mjs"],
  ["audio_pipeline", "translateit_voice_status.mjs"],
  ["remaining", "translateit_remaining_status.mjs"]
];

function runCheck(name, script) {
  const result = spawnSync(process.execPath, [join(SCRIPT_DIR, script)], { encoding: "utf8" });
  let parsed = null;
  try { parsed = JSON.parse((result.stdout || "{}").trim()); } catch { parsed = null; }
  return {
    name,
    exit_code: result.status,
    loaded: Boolean(parsed),
    output: parsed,
    note: result.stderr ? result.stderr.trim() : ""
  };
}

const results = checks.map(([name, script]) => runCheck(name, script));
const payload = {
  schema: "translateit.all_status.v1",
  ok: results.every((item) => item.loaded),
  checks: results,
  success_claim_allowed: false,
  note: "Read-only combined status. This does not run build, tests, model inference, audio recognition, or speech output."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(payload.ok ? 0 : 1);
