import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const contractsRoot = join(repoRoot, "EngineData", "Backend", "RuntimeContracts");

const failures = [];
const fail = (message) => failures.push(message);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const contractFiles = {
  finalArchitecture: join(contractsRoot, "FINAL_ARCHITECTURE_CONTRACT.json"),
  helperBridge: join(contractsRoot, "PYTHON_HELPER_BRIDGE_CONTRACT.json"),
  captureBridge: join(contractsRoot, "CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json"),
  audioStudio: join(contractsRoot, "AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json"),
};

for (const [name, path] of Object.entries(contractFiles)) {
  if (!existsSync(path)) fail(`${name} contract is missing: ${path}`);
}

const requireValue = (label, actual, expected) => {
  if (actual !== expected) fail(`${label} expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
};

const requireIncludes = (label, values, expected) => {
  if (!Array.isArray(values) || !values.includes(expected)) fail(`${label} must include ${JSON.stringify(expected)}`);
};

const requireTextIncludes = (label, value, marker) => {
  if (typeof value !== "string" || !value.includes(marker)) fail(`${label} must include ${JSON.stringify(marker)}`);
};

if (failures.length === 0) {
  const finalArchitecture = readJson(contractFiles.finalArchitecture);
  const helperBridge = readJson(contractFiles.helperBridge);
  const captureBridge = readJson(contractFiles.captureBridge);
  const audioStudio = readJson(contractFiles.audioStudio);

  for (const [name, contract] of [
    ["FINAL_ARCHITECTURE_CONTRACT", finalArchitecture],
    ["PYTHON_HELPER_BRIDGE_CONTRACT", helperBridge],
    ["CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT", captureBridge],
    ["AUDIO_STUDIO_ROUTE_STATUS_CONTRACT", audioStudio],
  ]) {
    requireValue(`${name}.branch`, contract.branch, "V1-Advance");
  }

  requireValue("finalArchitecture.final_desktop_shell", finalArchitecture.final_desktop_shell, "Rust/Tauri");
  requireValue("finalArchitecture.helper_runtime", finalArchitecture.helper_runtime, "Python");
  requireIncludes("finalArchitecture.rules", finalArchitecture.rules, "Runtime readiness must be reported through the Rust/Tauri UI and must not be inferred from helper process existence alone.");
  requireIncludes("finalArchitecture.rules", finalArchitecture.rules, "Do not create alternative V1/V2/V3/V4 engines, legacy engines, or parallel product runtimes.");
  requireValue("finalArchitecture.inactive_reference_policy.DesignIT", finalArchitecture.inactive_reference_policy?.DesignIT, "inactive_and_not_allowed_as_active_runtime_dependency");
  requireValue("finalArchitecture.inactive_reference_policy.FigmaDesignExport", finalArchitecture.inactive_reference_policy?.FigmaDesignExport, "inactive_and_not_allowed_as_active_runtime_dependency");

  requireValue("helperBridge.owner_shell", helperBridge.owner_shell, "Rust/Tauri");
  requireValue("helperBridge.helper_runtime", helperBridge.helper_runtime, "Python");
  requireIncludes("helperBridge.required_bridge_states", helperBridge.required_bridge_states, "blocked");
  requireIncludes("helperBridge.required_bridge_states", helperBridge.required_bridge_states, "degraded");
  requireIncludes("helperBridge.rules", helperBridge.rules, "Non-local CI must not claim local helper readiness without target-PC evidence.");
  requireIncludes("helperBridge.not_ready_until_implemented", helperBridge.not_ready_until_implemented, "target_pc_worker_spawn_validation");

  requireValue("captureBridge.owner_shell", captureBridge.owner_shell, "Rust/Tauri");
  requireValue("captureBridge.helper_runtime", captureBridge.helper_runtime, "Python");
  requireValue("captureBridge.status", captureBridge.status, "contract_ready_runtime_not_migrated");
  requireValue("captureBridge.v1_advance_speech_policy.silence_threshold_ms", captureBridge.v1_advance_speech_policy?.silence_threshold_ms, 700);
  requireValue("captureBridge.v1_advance_speech_policy.max_speech_segment_seconds", captureBridge.v1_advance_speech_policy?.max_speech_segment_seconds, 12);
  requireIncludes("captureBridge.not_ready_claims", captureBridge.not_ready_claims, "microphone_capture_ready");
  requireIncludes("captureBridge.not_ready_claims", captureBridge.not_ready_claims, "virtual_microphone_ready");
  requireIncludes("captureBridge.safety_rules", captureBridge.safety_rules, "Do not claim voice capture readiness without target-PC evidence.");

  requireValue("audioStudio.status", audioStudio.status, "metadata_runtime_enabled_provider_runtime_blocked");
  requireTextIncludes("audioStudio.v1_advance_scope", audioStudio.v1_advance_scope, "secondary_feature");
  requireValue("audioStudio.route_state_semantics.ready", audioStudio.route_state_semantics?.ready, "Reserved for fully implemented runtime behavior with target-PC evidence.");
  requireIncludes("audioStudio.provider_routes_blocked_until_implemented", audioStudio.provider_routes_blocked_until_implemented, "custom_voice_actor_generation");
  requireIncludes("audioStudio.rules", audioStudio.rules, "Provider routes must remain provider_blocked until real runtime implementation and target-PC evidence exist.");
}

if (failures.length > 0) {
  console.error("[runtime-contract-consistency] failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[runtime-contract-consistency] runtime contracts are aligned with V1-Advance non-local readiness boundaries");
