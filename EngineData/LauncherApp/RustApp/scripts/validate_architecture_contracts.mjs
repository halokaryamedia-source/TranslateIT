import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const errors = [];

function readText(path) {
  const fullPath = resolve(repoRoot, path);
  if (!existsSync(fullPath)) {
    errors.push(`Missing file: ${path}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function readJson(path) {
  const content = readText(path);
  if (!content) return null;
  try {
    return JSON.parse(content);
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

function textIncludes(content, value, label) {
  if (!content.includes(value)) errors.push(`${label}: missing ${value}`);
}

function textNotIncludes(content, value, label) {
  if (content.includes(value)) errors.push(`${label}: forbidden ${value}`);
}

const activeIndex = readText("DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md");
textIncludes(activeIndex, "Rust/Tauri desktop shell + Python helper runtime", "active documentation index engine rule");
textIncludes(activeIndex, "CURRENT_APP_STATUS.md", "active documentation index current status pointer");
textIncludes(activeIndex, "SINGLE_ACTIVE_ENGINE_POLICY.md", "active documentation index single engine pointer");
textIncludes(activeIndex, "There is no second launcher engine", "active documentation index no second engine rule");

const singleEnginePolicy = readText("DevelopingData/Documentation/Reports/Engineering/SINGLE_ACTIVE_ENGINE_POLICY.md");
textIncludes(singleEnginePolicy, "Rust/Tauri desktop shell + Python helper runtime", "single active engine rule");
textIncludes(singleEnginePolicy, "Python is an internal helper runtime", "single active engine Python helper rule");
textIncludes(singleEnginePolicy, "Do not describe older material as another active engine", "single active engine wording rule");

const currentStatus = readText("DevelopingData/Documentation/Reports/Engineering/CURRENT_APP_STATUS.md");
textIncludes(currentStatus, "ACTIVE_DOCUMENTATION_INDEX.md", "current status documentation entrypoint");
textIncludes(currentStatus, "Rust/Tauri desktop shell + Python helper runtime", "current status engine rule");
textIncludes(currentStatus, "Single active engine policy", "current status single engine policy");
textNotIncludes(currentStatus, "Legacy reference", "current status removed legacy reference heading");
textNotIncludes(currentStatus, "legacy reference", "current status removed legacy reference wording");

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
  expect(helper.status, "process_spawn_bridge_implemented_pending_local_verification", "helper bridge status");
  expect(helper.owner_shell, "Rust/Tauri", "helper owner shell");
  expect(helper.helper_runtime, "Python", "helper runtime");
  includes(helper.required_bridge_states, "degraded", "helper bridge states");
  includes(helper.required_status_fields, "cuda_ready", "helper status fields");
  includes(helper.required_status_fields, "generation_token", "helper status fields");
  includes(helper.implemented_bridge_features, "stdin_jsonl_worker_protocol", "helper implemented features");
  includes(helper.implemented_bridge_features, "ping_health_check_on_start", "helper implemented features");
  includes(helper.not_ready_until_implemented, "target_pc_worker_spawn_validation", "helper blocked items");
}

const capture = readJson("EngineData/Backend/RuntimeContracts/CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json");
if (capture) {
  expect(capture.schema, "translateit.capture_helper_bridge_request_contract.v1", "capture helper bridge schema");
  expect(capture.status, "contract_ready_runtime_not_migrated", "capture helper bridge status");
  expect(capture.owner_shell, "Rust/Tauri", "capture owner shell");
  expect(capture.helper_runtime, "Python", "capture helper runtime");
  includes(capture.safety_rules, "Do not run capture_start through the older one-shot worker when helper provider readiness is false.", "capture safety rules");
  expect(capture.migration_state?.current_rust_command_guard, "start_capture blocks when helper provider readiness is not verified", "capture current guard");
}

const route = readJson("EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json");
if (route) {
  expect(route.schema, "translateit.audio_studio_route_status_contract.v1", "Audio Studio route status schema");
  expect(route.status, "metadata_runtime_enabled_provider_runtime_blocked", "Audio Studio route status");
  includes(route.metadata_routes_enabled, "audio_studio_list_takes", "Audio Studio metadata routes");
  expect(route.approved_storage?.evidence_log, "UserData/CacheData/AudioStudio/logs/evidence.jsonl", "Audio Studio evidence log path");
}

const audioStudioPlaceholder = readJson("EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_PLACEHOLDER.json");
if (audioStudioPlaceholder) {
  expect(audioStudioPlaceholder.status, "deprecated_replaced_by_route_status_contract", "Audio Studio placeholder status");
  expect(audioStudioPlaceholder.replacement_contract, "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json", "Audio Studio placeholder replacement");
  expect(audioStudioPlaceholder.current_storage_policy?.evidence_log_root, "UserData/CacheData/AudioStudio/logs/", "Audio Studio placeholder evidence log root");
}

const audioStudioRust = readText("EngineData/LauncherApp/RustApp/src-tauri/src/commands/audio_studio.rs");
textIncludes(audioStudioRust, "pub fn audio_studio_get_provider_status", "Audio Studio provider route");
textIncludes(audioStudioRust, "pub fn audio_studio_get_quality_gate_status", "Audio Studio quality gate route");
textIncludes(audioStudioRust, "provider_status_checked", "Audio Studio provider evidence event");
textIncludes(audioStudioRust, "quality_gate_status_checked", "Audio Studio quality evidence event");
textIncludes(audioStudioRust, "result(false, \"provider_blocked\"", "Audio Studio provider/quality readiness guard");

const audioStudioApi = readText("EngineData/LauncherApp/RustApp/src/app/engineTranslate/audioStudioApi.ts");
textIncludes(audioStudioApi, "getProviderStatus", "Audio Studio provider frontend API");
textIncludes(audioStudioApi, "getQualityGateStatus", "Audio Studio quality gate frontend API");

const timeoutPolicy = readText("DevelopingData/Documentation/Reports/Engineering/HELPER_BRIDGE_TIMEOUT_POLICY.md");
textIncludes(timeoutPolicy, "frontend_timeout_backend_result_unknown", "helper timeout policy frontend claim");
textIncludes(timeoutPolicy, "timeout_backend_read", "helper timeout policy backend state");

if (errors.length > 0) {
  console.error("Architecture contract validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Architecture contract validation passed.");
