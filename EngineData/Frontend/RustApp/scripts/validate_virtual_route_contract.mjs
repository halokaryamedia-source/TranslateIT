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

function expectIncludes(content, marker, label) {
  if (!content.includes(marker)) errors.push(`${label}: missing ${marker}`);
}

function expectNotIncludes(content, marker, label) {
  if (content.includes(marker)) errors.push(`${label}: forbidden ${marker}`);
}

const virtualRoute = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_mic_route.rs");
expectIncludes(virtualRoute, "pub struct VirtualMicRouteContractStatus", "route status contract");
expectIncludes(virtualRoute, "pub struct VirtualMicOutputRouteRuntimeStubStatus", "route runtime stub contract");
expectIncludes(virtualRoute, "prepare_virtual_mic_output_route_runtime_stub", "route runtime stub command");
expectIncludes(virtualRoute, "set_preferred_virtual_mic_route_devices", "route preference command");
expectIncludes(virtualRoute, "latest_virtual_mic_route_evidence.json", "route evidence file");
expectIncludes(virtualRoute, "latest_virtual_mic_output_route_stub.json", "route stub evidence file");
expectIncludes(virtualRoute, "guarded_runtime_execution", "guarded runtime execution flag");
expectIncludes(virtualRoute, "virtual_mic_output_route_runtime_stub_source_side_no_audio_execution", "no-audio-execution claim");
expectIncludes(virtualRoute, "virtual_route:missing_source_audio_path", "missing source audio blocker");
expectNotIncludes(virtualRoute, "\"selected_output_device\": route.selected_output_device", "borrowed route output move guard");
expectNotIncludes(virtualRoute, "\"selected_input_device\": route.selected_input_device", "borrowed route input move guard");

const professionalGate = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/professional_readiness_gate.rs");
expectIncludes(professionalGate, "pub struct ProfessionalRuntimeReadinessGateStatus", "professional gate contract");
expectIncludes(professionalGate, "pub struct ProfessionalSourceReadinessOrchestrationStatus", "source orchestration contract");
expectIncludes(professionalGate, "get_professional_runtime_readiness_gate_status", "professional gate command");
expectIncludes(professionalGate, "run_professional_source_readiness_orchestration", "source orchestration command");
expectIncludes(professionalGate, "development_progress_percent_excluding_ci_local", "development-only progress field");
expectIncludes(professionalGate, "remaining_development_gaps", "remaining development gaps field");
expectIncludes(professionalGate, "prepare_virtual_mic_output_route_runtime_stub", "professional gate route stub integration");
expectIncludes(professionalGate, "route_stub_evidence_path", "professional gate route stub evidence path");
expectIncludes(professionalGate, "professional_source_orchestration_development_only_not_ci_local_runtime_proof", "source orchestration runtime claim");
expectIncludes(professionalGate, "professional_runtime_readiness_gate_source_side_not_runtime_proof", "professional gate runtime claim");

const commandMod = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/mod.rs");
expectIncludes(commandMod, "pub mod professional_readiness_gate", "professional gate module export");

const registry = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/registry.rs");
expectIncludes(registry, "get_virtual_mic_route_contract_status", "route status registry");
expectIncludes(registry, "prepare_virtual_mic_output_route_runtime_stub", "route stub registry");
expectIncludes(registry, "set_preferred_virtual_mic_route_devices", "route preference registry");
expectIncludes(registry, "get_professional_runtime_readiness_gate_status", "professional gate registry");
expectIncludes(registry, "run_professional_source_readiness_orchestration", "source orchestration registry");

const sharedTypes = readText("EngineData/Frontend/RustApp/src/app/shared/types.ts");
expectIncludes(sharedTypes, "export type VirtualMicRouteContractStatus", "route status frontend type");
expectIncludes(sharedTypes, "export type VirtualMicOutputRouteRuntimeStubStatus", "route stub frontend type");
expectIncludes(sharedTypes, "export type ProfessionalRuntimeReadinessGateStatus", "professional gate frontend type");
expectIncludes(sharedTypes, "export type ProfessionalSourceReadinessOrchestrationStatus", "source orchestration frontend type");
expectIncludes(sharedTypes, "development_progress_percent_excluding_ci_local", "development-only frontend progress type");
expectIncludes(sharedTypes, "remaining_development_gaps", "remaining development gaps frontend type");
expectIncludes(sharedTypes, "source_audio_path", "route stub source audio type");
expectIncludes(sharedTypes, "route_output_contract_json", "route output contract type");
expectIncludes(sharedTypes, "route_stub_evidence_path", "professional gate route stub evidence type");

const routeApi = readText("EngineData/Frontend/RustApp/src/app/bridge/virtualRouteApi.ts");
expectIncludes(routeApi, "get_live_pipeline_session_snapshot", "route bridge latest pipeline snapshot");
expectIncludes(routeApi, "tts_audio_output_path", "route bridge actual TTS output path");
expectIncludes(routeApi, "setPreferredVirtualMicRouteDevices", "route bridge preference setter");
expectIncludes(routeApi, "set_preferred_virtual_mic_route_devices", "route bridge preference command");
expectIncludes(routeApi, "prepare_virtual_mic_output_route_runtime_stub", "route bridge stub command");
expectIncludes(routeApi, "get_professional_runtime_readiness_gate_status", "route bridge professional gate command");
expectIncludes(routeApi, "runProfessionalSourceReadinessOrchestration", "route bridge source orchestration method");
expectIncludes(routeApi, "run_professional_source_readiness_orchestration", "route bridge source orchestration command");
expectIncludes(routeApi, "sourceAudioPath", "route bridge camelCase argument");
expectIncludes(routeApi, "outputDevice", "route bridge output device argument");
expectIncludes(routeApi, "inputDevice", "route bridge input device argument");
expectNotIncludes(routeApi, "sourceAudioPath: null", "route bridge hardcoded null source path");

const helperBinding = readText("EngineData/Frontend/RustApp/src/app/active-launcher/developerHelperBridgeBinding.ts");
expectIncludes(helperBinding, "virtualRouteApi", "developer diagnostics route bridge import");
expectIncludes(helperBinding, "prepareVirtualMicOutputRouteRuntimeStubFromLatestPipeline", "developer diagnostics latest TTS route stub");
expectIncludes(helperBinding, "getProfessionalRuntimeReadinessGateStatus", "developer diagnostics professional gate bridge");
expectIncludes(helperBinding, "Professional Gate", "developer diagnostics professional gate button");
expectIncludes(helperBinding, "Route Runtime Stub", "developer diagnostics route stub button");
expectNotIncludes(helperBinding, "prepare_virtual_mic_output_route_runtime_stub\", { sourceAudioPath: null }", "developer diagnostics hardcoded null source path");

const docs = readText("DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_CI_AND_NON_LOCAL_DEV_NOTES.md");
expectIncludes(docs, "Virtual route", "CI notes virtual route coverage");

if (errors.length > 0) {
  console.error("Virtual route contract validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Virtual route contract validation passed.");
