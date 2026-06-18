import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const errors = [];

function readJson(path) {
  const fullPath = resolve(repoRoot, path);
  if (!existsSync(fullPath)) {
    errors.push(`Missing contract: ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(fullPath, "utf8"));
  } catch (error) {
    errors.push(`Invalid contract JSON ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function expect(value, expected, label) {
  if (value !== expected) errors.push(`${label}: expected ${expected}, got ${String(value)}`);
}

function includes(list, value, label) {
  if (!Array.isArray(list) || !list.includes(value)) errors.push(`${label}: missing ${value}`);
}

const architecture = readJson("EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json");
if (architecture) {
  expect(architecture.schema, "translateit.final_architecture_contract.v1", "architecture schema");
  expect(architecture.final_desktop_shell, "Rust/Tauri", "final desktop shell");
  expect(architecture.helper_runtime, "Python", "helper runtime");
  includes(architecture.rust_tauri_responsibilities, "helper_process_orchestration", "Rust/Tauri responsibilities");
  includes(architecture.python_helper_responsibilities, "asr_model_loading", "Python helper responsibilities");
}

const helper = readJson("EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json");
if (helper) {
  expect(helper.schema, "translateit.python_helper_bridge_contract.v1", "helper bridge schema");
  expect(helper.owner_shell, "Rust/Tauri", "helper owner shell");
  expect(helper.helper_runtime, "Python", "helper runtime");
  includes(helper.required_bridge_states, "degraded", "helper bridge states");
  includes(helper.required_status_fields, "cuda_ready", "helper status fields");
  includes(helper.not_ready_until_implemented, "helper_process_spawn_policy", "helper blocked items");
}

const route = readJson("EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json");
if (route) {
  expect(route.schema, "translateit.audio_studio_route_status_contract.v1", "Audio Studio route status schema");
  expect(route.status, "metadata_runtime_enabled_provider_runtime_blocked", "Audio Studio route status");
  includes(route.metadata_routes_enabled, "audio_studio_list_takes", "Audio Studio metadata routes");
  expect(route.approved_storage?.evidence_log, "UserData/CacheData/AudioStudio/logs/evidence.jsonl", "Audio Studio evidence log path");
}

if (errors.length > 0) {
  console.error("Architecture contract validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Architecture contract validation passed.");
