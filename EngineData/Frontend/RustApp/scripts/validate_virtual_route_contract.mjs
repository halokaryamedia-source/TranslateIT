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
  sharedTypes: "EngineData/Frontend/RustApp/src/app/shared/types.ts",
  routeApi: "EngineData/Frontend/RustApp/src/app/bridge/virtualRouteApi.ts",
  audioRuntimeApi: "EngineData/Frontend/RustApp/src/app/bridge/virtualAudioRouteRuntimeApi.ts",
  routeModel: "EngineData/Frontend/RustApp/src/app/active-launcher/virtualRouteSelectionSurfaceModel.ts",
  routeRenderer: "EngineData/Frontend/RustApp/src/app/active-launcher/virtualRouteSelectionSurfaceRenderer.ts",
  routeMount: "EngineData/Frontend/RustApp/src/app/active-launcher/virtualRouteSelectionSurfaceMount.ts",
  routeCss: "EngineData/Frontend/RustApp/src/virtualRouteSelectionSurface.css",
  diagnosticButton: "EngineData/Frontend/RustApp/src/app/active-launcher/diagnosticButtonBinding.ts",
  sourceBinding: "EngineData/Frontend/RustApp/src/app/active-launcher/sourceOrchestrationBinding.ts",
  providerBinding: "EngineData/Frontend/RustApp/src/app/active-launcher/virtualAudioRouteProviderBinding.ts",
  lifecycle: "EngineData/Frontend/RustApp/src/app/active-launcher/lifecycleCleanup.ts",
  provider: "EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py",
  requirements: "EngineData/Backend/LocalWorker/WorkerRuntime/requirements-virtual-audio-route.txt",
  notes: "DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_VIRTUAL_AUDIO_PROVIDER_WINDOWS_NOTES.md",
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
  ".collect::<String>()",
]) expectIncludes(files.audioRuntime, marker);

for (const marker of [
  "ProfessionalRuntimeReadinessGateStatus",
  "ProfessionalSourceReadinessOrchestrationStatus",
  "run_professional_source_readiness_orchestration",
  "fn route_stub_for_snapshot",
  "professional_gate_from_parts(live_gate, &pipeline_snapshot, route_stub.clone())",
  "let ok = gaps.is_empty();",
]) expectIncludes(files.professionalGate, marker);
for (const marker of [
  "user_facing_route_device_selection_surface_not_finished",
  "real_audio_output_route_runtime_not_implemented",
  "gap.contains(\"not_ready\")",
  "professional_gate_from_parts(live_gate, &pipeline_snapshot);",
]) expectNotIncludes(files.professionalGate, marker);

for (const marker of [
  "professional_readiness_gate",
  "virtual_audio_route_runtime",
]) expectIncludes(files.mod, marker);
for (const marker of [
  "get_virtual_mic_route_contract_status",
  "set_preferred_virtual_mic_route_devices",
  "run_professional_source_readiness_orchestration",
  "dispatch_guarded_virtual_audio_route_provider",
]) expectIncludes(files.registry, marker);

for (const marker of [
  "VirtualMicRouteContractStatus",
  "VirtualMicOutputRouteRuntimeStubStatus",
  "ProfessionalSourceReadinessOrchestrationStatus",
  "development_progress_percent_excluding_ci_local",
]) expectIncludes(files.sharedTypes, marker);
for (const marker of [
  "get_live_pipeline_session_snapshot",
  "tts_audio_output_path",
  "set_preferred_virtual_mic_route_devices",
]) expectIncludes(files.routeApi, marker);
expectNotIncludes(files.routeApi, "sourceAudioPath: null");

for (const marker of [
  "prepare_guarded_virtual_audio_route_runtime",
  "dispatch_guarded_virtual_audio_route_provider",
  "dispatchProviderFromLatestPipeline",
]) expectIncludes(files.audioRuntimeApi, marker);

for (const marker of ["loadVirtualRouteSelectionSurfaceState", "saveVirtualRouteSelectionSurfaceSelection"]) expectIncludes(files.routeModel, marker);
for (const marker of ["bindVirtualRouteSelectionSurface", "escapeHtml", "data-virtual-route-action"]) expectIncludes(files.routeRenderer, marker);
for (const marker of ["mountVirtualRouteSelectionSurface", "getDiagnosticsControlsContainer", "unmountVirtualRouteSelectionSurface"]) expectIncludes(files.routeMount, marker);
expectNotIncludes(files.routeMount, "Capture helper bridge preview controls");
for (const marker of [".virtual-route-selection-surface", "data-virtual-route-ready"]) expectIncludes(files.routeCss, marker);

for (const marker of [
  "bindDiagnosticButton",
  "getDiagnosticsControlsContainer",
  "DIAGNOSTIC_CONTROLS_SELECTOR",
  "dataAttribute",
  "setAttribute(options.dataAttribute",
]) expectIncludes(files.diagnosticButton, marker);
expectNotIncludes(files.diagnosticButton, "dataset[options");
for (const marker of ["bindSourceOrchestrationUi", "data-source-orchestration-action", "dataAttribute"]) expectIncludes(files.sourceBinding, marker);
for (const marker of ["bindVirtualAudioRouteProviderUi", "providerResponseSummary", "data-virtual-audio-provider-action", "dataAttribute"]) expectIncludes(files.providerBinding, marker);

for (const marker of ["createCleanupRegistry", "scheduleCleanupAwareDelay", "window.clearTimeout"]) expectIncludes(files.lifecycle, marker);
for (const marker of ["TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER", "route_virtual_audio", "sounddevice", "dry_run"]) expectIncludes(files.provider, marker);
for (const marker of ["numpy", "sounddevice", "not runtime proof"]) expectIncludes(files.requirements, marker);
for (const marker of ["Provider Dry Run", "TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER"]) expectIncludes(files.notes, marker);

for (const marker of ["SimpleLauncherController", "simple-ui-v1"]) expectIncludes(files.main, marker);
for (const marker of ["mountVirtualRouteSelectionSurface", "bindSourceOrchestrationUi", "bindVirtualAudioRouteProviderUi", "virtualRouteSelectionSurface.css"]) expectNotIncludes(files.main, marker, `simple main should not mount ${marker}`);

if (errors.length > 0) {
  console.error("Virtual route contract validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Virtual route contract validation passed: engine/dev capability remains present and simple main UI does not mount the complex virtual route surface.");
