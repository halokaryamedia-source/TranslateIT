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

function expectIncludes(path, marker, label = marker) {
  const content = readText(path);
  if (!content.includes(marker)) errors.push(`${path}: missing ${label}`);
}

function expectNotIncludes(path, marker, label = marker) {
  const content = readText(path);
  if (content.includes(marker)) errors.push(`${path}: forbidden ${label}`);
}

const files = {
  virtualRoute: "EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_mic_route.rs",
  audioRuntime: "EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_audio_route_runtime.rs",
  professionalGate: "EngineData/Frontend/RustApp/src-tauri/src/commands/professional_readiness_gate.rs",
  registry: "EngineData/Frontend/RustApp/src-tauri/src/commands/registry.rs",
  mod: "EngineData/Frontend/RustApp/src-tauri/src/commands/mod.rs",
  productFacade: "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts",
  provider: "EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py",
  requirements: "EngineData/Backend/LocalWorker/WorkerRuntime/requirements-virtual-audio-route.txt",
  main: "EngineData/Frontend/RustApp/src/main.ts",
};

for (const path of Object.values(files)) readText(path);

for (const marker of [
  "VirtualMicRouteContractStatus",
  "VirtualMicOutputRouteRuntimeStubStatus",
  "prepare_virtual_mic_output_route_runtime_stub",
  "set_preferred_virtual_mic_route_devices",
  "virtual_route:missing_source_audio_path",
]) expectIncludes(files.virtualRoute, marker);
expectNotIncludes(files.virtualRoute, "\"selected_output_device\": route.selected_output_device");
expectNotIncludes(files.virtualRoute, "\"selected_input_device\": route.selected_input_device");

for (const marker of [
  "VirtualAudioRouteRuntimeStatus",
  "prepare_guarded_virtual_audio_route_runtime",
  "dispatch_guarded_virtual_audio_route_provider",
  "TRANSLATEIT_PYTHON",
  "provider_response_json",
]) expectIncludes(files.audioRuntime, marker);

for (const marker of [
  "ProfessionalRuntimeReadinessGateStatus",
  "run_professional_source_readiness_orchestration",
  "fn route_stub_for_snapshot",
  "let ok = gaps.is_empty();",
]) expectIncludes(files.professionalGate, marker);

for (const marker of ["professional_readiness_gate", "virtual_audio_route_runtime"]) expectIncludes(files.mod, marker);
for (const marker of [
  "get_virtual_mic_route_contract_status",
  "set_preferred_virtual_mic_route_devices",
  "run_professional_source_readiness_orchestration",
  "dispatch_guarded_virtual_audio_route_provider",
]) expectIncludes(files.registry, marker);

for (const marker of [
  "meetingRouteReady",
  "virtual_mic_route_ready",
  "meetingReady",
  "live_meeting_runtime_gate",
]) expectIncludes(files.productFacade, marker, `product readiness route marker ${marker}`);

for (const marker of ["TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER", "route_virtual_audio", "sounddevice", "dry_run"]) expectIncludes(files.provider, marker);
for (const marker of ["numpy", "sounddevice", "not runtime proof"]) expectIncludes(files.requirements, marker);

for (const marker of ["SimpleLauncherController", "simple-ui-v1"]) expectIncludes(files.main, marker);
for (const marker of [
  "mountVirtualRouteSelectionSurface",
  "bindSourceOrchestrationUi",
  "bindVirtualAudioRouteProviderUi",
  "virtualRouteSelectionSurface.css",
]) expectNotIncludes(files.main, marker, `main must not mount retired route-selection UI: ${marker}`);

if (errors.length > 0) {
  console.error("Virtual route contract validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Virtual route contract validation passed: engine/provider route capability and product readiness mapping remain present without the retired route-selection UI or DevelopingData validation dependency.");
