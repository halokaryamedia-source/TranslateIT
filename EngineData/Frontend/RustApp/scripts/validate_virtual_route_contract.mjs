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

const audioRuntime = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_audio_route_runtime.rs");
expectIncludes(audioRuntime, "pub struct VirtualAudioRouteRuntimeStatus", "audio route runtime status");
expectIncludes(audioRuntime, "prepare_guarded_virtual_audio_route_runtime", "audio route runtime command");
expectIncludes(audioRuntime, "latest_virtual_audio_route_runtime_handoff.json", "audio route runtime evidence");
expectIncludes(audioRuntime, "virtual_audio_route:runtime_provider_not_implemented", "guarded provider not implemented blocker");
expectIncludes(audioRuntime, "virtual_audio_route_runtime_handoff_source_side_not_audio_runtime_proof", "audio route runtime handoff claim");

const professionalGate = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/professional_readiness_gate.rs");
expectIncludes(professionalGate, "pub struct ProfessionalRuntimeReadinessGateStatus", "professional gate contract");
expectIncludes(professionalGate, "pub struct ProfessionalSourceReadinessOrchestrationStatus", "source orchestration contract");
expectIncludes(professionalGate, "get_professional_runtime_readiness_gate_status", "professional gate command");
expectIncludes(professionalGate, "run_professional_source_readiness_orchestration", "source orchestration command");
expectIncludes(professionalGate, "development_progress_percent_excluding_ci_local", "development-only progress field");
expectIncludes(professionalGate, "remaining_development_gaps", "remaining development gaps field");

const commandMod = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/mod.rs");
expectIncludes(commandMod, "pub mod professional_readiness_gate", "professional gate module export");
expectIncludes(commandMod, "pub mod virtual_audio_route_runtime", "audio route runtime module export");

const registry = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/registry.rs");
expectIncludes(registry, "get_virtual_mic_route_contract_status", "route status registry");
expectIncludes(registry, "prepare_virtual_mic_output_route_runtime_stub", "route stub registry");
expectIncludes(registry, "set_preferred_virtual_mic_route_devices", "route preference registry");
expectIncludes(registry, "get_professional_runtime_readiness_gate_status", "professional gate registry");
expectIncludes(registry, "run_professional_source_readiness_orchestration", "source orchestration registry");
expectIncludes(registry, "prepare_guarded_virtual_audio_route_runtime", "audio route runtime registry");

const sharedTypes = readText("EngineData/Frontend/RustApp/src/app/shared/types.ts");
expectIncludes(sharedTypes, "export type VirtualMicRouteContractStatus", "route status frontend type");
expectIncludes(sharedTypes, "export type VirtualMicOutputRouteRuntimeStubStatus", "route stub frontend type");
expectIncludes(sharedTypes, "export type ProfessionalRuntimeReadinessGateStatus", "professional gate frontend type");
expectIncludes(sharedTypes, "export type ProfessionalSourceReadinessOrchestrationStatus", "source orchestration frontend type");
expectIncludes(sharedTypes, "development_progress_percent_excluding_ci_local", "development-only frontend progress type");
expectIncludes(sharedTypes, "remaining_development_gaps", "remaining development gaps frontend type");

const routeApi = readText("EngineData/Frontend/RustApp/src/app/bridge/virtualRouteApi.ts");
expectIncludes(routeApi, "get_live_pipeline_session_snapshot", "route bridge latest pipeline snapshot");
expectIncludes(routeApi, "tts_audio_output_path", "route bridge actual TTS output path");
expectIncludes(routeApi, "setPreferredVirtualMicRouteDevices", "route bridge preference setter");
expectIncludes(routeApi, "set_preferred_virtual_mic_route_devices", "route bridge preference command");
expectIncludes(routeApi, "runProfessionalSourceReadinessOrchestration", "route bridge source orchestration method");
expectNotIncludes(routeApi, "sourceAudioPath: null", "route bridge hardcoded null source path");

const audioRuntimeApi = readText("EngineData/Frontend/RustApp/src/app/bridge/virtualAudioRouteRuntimeApi.ts");
expectIncludes(audioRuntimeApi, "VirtualAudioRouteRuntimeStatus", "audio route runtime frontend type");
expectIncludes(audioRuntimeApi, "prepare_guarded_virtual_audio_route_runtime", "audio route runtime bridge command");
expectIncludes(audioRuntimeApi, "enableRouteRuntime", "audio route runtime guard argument");
expectIncludes(audioRuntimeApi, "prepareFromLatestPipeline", "audio route runtime latest pipeline helper");

const routeSelectionSurface = readText("EngineData/Frontend/RustApp/src/app/active-launcher/virtualRouteSelectionSurfaceModel.ts");
expectIncludes(routeSelectionSurface, "VirtualRouteSelectionSurfaceState", "route selection surface state");
expectIncludes(routeSelectionSurface, "loadVirtualRouteSelectionSurfaceState", "route selection surface loader");
expectIncludes(routeSelectionSurface, "saveVirtualRouteSelectionSurfaceSelection", "route selection surface save action");
expectIncludes(routeSelectionSurface, "setPreferredVirtualMicRouteDevices", "route selection surface preference bridge");

const helperBinding = readText("EngineData/Frontend/RustApp/src/app/active-launcher/developerHelperBridgeBinding.ts");
expectIncludes(helperBinding, "virtualRouteApi", "developer diagnostics route bridge import");
expectIncludes(helperBinding, "prepareVirtualMicOutputRouteRuntimeStubFromLatestPipeline", "developer diagnostics latest TTS route stub");
expectIncludes(helperBinding, "getProfessionalRuntimeReadinessGateStatus", "developer diagnostics professional gate bridge");
expectIncludes(helperBinding, "Professional Gate", "developer diagnostics professional gate button");
expectIncludes(helperBinding, "Route Runtime Stub", "developer diagnostics route stub button");
expectNotIncludes(helperBinding, "prepare_virtual_mic_output_route_runtime_stub\", { sourceAudioPath: null }", "developer diagnostics hardcoded null source path");

if (errors.length > 0) {
  console.error("Virtual route contract validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Virtual route contract validation passed.");
