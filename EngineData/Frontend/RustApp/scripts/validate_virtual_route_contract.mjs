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
expectIncludes(audioRuntime, "dispatch_guarded_virtual_audio_route_provider", "audio route provider dispatch command");
expectIncludes(audioRuntime, "latest_virtual_audio_route_runtime_handoff.json", "audio route runtime evidence");
expectIncludes(audioRuntime, "latest_virtual_audio_route_provider_payload.json", "audio route provider payload");
expectIncludes(audioRuntime, "TRANSLATEIT_PYTHON", "audio route python env override");
expectIncludes(audioRuntime, "provider_response_json", "audio route provider response field");
expectIncludes(audioRuntime, "virtual_audio_route_provider_dry_run_source_side_not_audio_runtime_proof", "audio route provider dry-run claim");
expectIncludes(audioRuntime, "virtual_audio_route_provider_process_failed_no_audio_execution", "audio route provider process failure claim");
expectIncludes(audioRuntime, "\"source_audio_path\": &status.source_audio_path", "audio route source audio borrow guard");
expectIncludes(audioRuntime, "\"selected_output_device\": &status.selected_output_device", "audio route selected output borrow guard");
expectIncludes(audioRuntime, "\"selected_input_device\": &status.selected_input_device", "audio route selected input borrow guard");

const provider = readText("EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py");
expectIncludes(provider, "TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER", "provider env guard");
expectIncludes(provider, "route_virtual_audio", "provider route function");
expectIncludes(provider, "sounddevice", "provider audio output dependency");
expectIncludes(provider, "dry_run", "provider dry-run guard");
expectIncludes(provider, "virtual_audio_route_provider_execution_attempted_needs_windows_runtime_validation", "provider execution runtime claim");
expectIncludes(provider, "virtual_audio_route_provider_dependency_missing", "provider dependency blocker claim");
expectIncludes(provider, "selected_output_device_not_found", "provider selected output blocker");

const providerRequirements = readText("EngineData/Backend/LocalWorker/WorkerRuntime/requirements-virtual-audio-route.txt");
expectIncludes(providerRequirements, "numpy", "provider requirements numpy");
expectIncludes(providerRequirements, "sounddevice", "provider requirements sounddevice");
expectIncludes(providerRequirements, "not runtime proof", "provider requirements proof disclaimer");

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
expectIncludes(registry, "dispatch_guarded_virtual_audio_route_provider", "audio route provider dispatch registry");

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
expectIncludes(audioRuntimeApi, "dispatch_guarded_virtual_audio_route_provider", "audio route provider dispatch bridge command");
expectIncludes(audioRuntimeApi, "dispatchGuardedProvider", "audio route provider dispatch bridge method");
expectIncludes(audioRuntimeApi, "dispatchProviderFromLatestPipeline", "audio route provider latest pipeline helper");
expectIncludes(audioRuntimeApi, "enableRouteRuntime", "audio route runtime guard argument");
expectIncludes(audioRuntimeApi, "dryRun", "audio route provider dry-run argument");

const routeSelectionSurface = readText("EngineData/Frontend/RustApp/src/app/active-launcher/virtualRouteSelectionSurfaceModel.ts");
expectIncludes(routeSelectionSurface, "VirtualRouteSelectionSurfaceState", "route selection surface state");
expectIncludes(routeSelectionSurface, "loadVirtualRouteSelectionSurfaceState", "route selection surface loader");
expectIncludes(routeSelectionSurface, "saveVirtualRouteSelectionSurfaceSelection", "route selection surface save action");
expectIncludes(routeSelectionSurface, "setPreferredVirtualMicRouteDevices", "route selection surface preference bridge");

const routeSelectionRenderer = readText("EngineData/Frontend/RustApp/src/app/active-launcher/virtualRouteSelectionSurfaceRenderer.ts");
expectIncludes(routeSelectionRenderer, "bindVirtualRouteSelectionSurface", "route selection renderer binder");
expectIncludes(routeSelectionRenderer, "escapeHtml", "route selection renderer html escaping");
expectIncludes(routeSelectionRenderer, "&amp;", "route selection renderer ampersand escape");
expectIncludes(routeSelectionRenderer, "data-virtual-route-field", "route selection renderer fields");
expectIncludes(routeSelectionRenderer, "data-virtual-route-action", "route selection renderer actions");
expectIncludes(routeSelectionRenderer, "Save Route Devices", "route selection renderer save button");
expectIncludes(routeSelectionRenderer, "Refresh Devices", "route selection renderer refresh button");

const routeSelectionStyle = readText("EngineData/Frontend/RustApp/src/virtualRouteSelectionSurface.css");
expectIncludes(routeSelectionStyle, ".virtual-route-selection-surface", "route selection css surface");
expectIncludes(routeSelectionStyle, ".virtual-route-selection-status", "route selection css status");
expectIncludes(routeSelectionStyle, "data-virtual-route-ready", "route selection css ready state");

const routeSelectionMount = readText("EngineData/Frontend/RustApp/src/app/active-launcher/virtualRouteSelectionSurfaceMount.ts");
expectIncludes(routeSelectionMount, "mountVirtualRouteSelectionSurface", "route selection auto mount function");
expectIncludes(routeSelectionMount, "data-virtual-route-selection-host", "route selection host marker");
expectIncludes(routeSelectionMount, "bindVirtualRouteSelectionSurface", "route selection mount uses renderer");
expectIncludes(routeSelectionMount, "getDiagnosticsControlsContainer", "route selection uses shared diagnostics controls helper");
expectNotIncludes(routeSelectionMount, "Capture helper bridge preview controls", "route selection duplicate diagnostics selector");
expectIncludes(routeSelectionMount, "unmountVirtualRouteSelectionSurface", "route selection unmount function");

const diagnosticButtonBinding = readText("EngineData/Frontend/RustApp/src/app/active-launcher/diagnosticButtonBinding.ts");
expectIncludes(diagnosticButtonBinding, "bindDiagnosticButton", "reusable diagnostic binding helper");
expectIncludes(diagnosticButtonBinding, "getDiagnosticsControlsContainer", "reusable diagnostics controls helper");
expectIncludes(diagnosticButtonBinding, "DIAGNOSTIC_CONTROLS_SELECTOR", "shared diagnostics controls selector");
expectIncludes(diagnosticButtonBinding, "DIAGNOSTIC_BUTTON_CLASS", "shared diagnostic button class");
expectIncludes(diagnosticButtonBinding, "setAssistantNotice", "reusable assistant notice helper");
expectIncludes(diagnosticButtonBinding, "retryDelayMs", "reusable diagnostic retry delay");
expectIncludes(diagnosticButtonBinding, "mic-test-button-v22 secondary", "reusable diagnostic button styling");

const sourceOrchestrationBinding = readText("EngineData/Frontend/RustApp/src/app/active-launcher/sourceOrchestrationBinding.ts");
expectIncludes(sourceOrchestrationBinding, "bindSourceOrchestrationUi", "source orchestration binding");
expectIncludes(sourceOrchestrationBinding, "bindDiagnosticButton", "source orchestration uses reusable diagnostic binding");
expectIncludes(sourceOrchestrationBinding, "runProfessionalSourceReadinessOrchestration", "source orchestration bridge call");
expectIncludes(sourceOrchestrationBinding, "data-source-orchestration-action", "source orchestration action marker");
expectIncludes(sourceOrchestrationBinding, "Source Orchestration", "source orchestration button label");
expectNotIncludes(sourceOrchestrationBinding, "let clickHandler", "source orchestration duplicate click handler");
expectNotIncludes(sourceOrchestrationBinding, "let installedButton", "source orchestration duplicate installed button state");

const providerBinding = readText("EngineData/Frontend/RustApp/src/app/active-launcher/virtualAudioRouteProviderBinding.ts");
expectIncludes(providerBinding, "bindVirtualAudioRouteProviderUi", "provider dry run binding");
expectIncludes(providerBinding, "bindDiagnosticButton", "provider uses reusable diagnostic binding");
expectIncludes(providerBinding, "dispatchProviderFromLatestPipeline", "provider dry run latest pipeline call");
expectIncludes(providerBinding, "providerResponseSummary", "provider response summary parser");
expectIncludes(providerBinding, "providerBlocker", "provider response blocker output");
expectIncludes(providerBinding, "providerClaim", "provider response runtime claim output");
expectIncludes(providerBinding, "data-virtual-audio-provider-action", "provider dry run action marker");
expectIncludes(providerBinding, "Provider Dry Run", "provider dry run button label");
expectNotIncludes(providerBinding, "let clickHandler", "provider duplicate click handler");
expectNotIncludes(providerBinding, "let installedButton", "provider duplicate installed button state");

const lifecycleCleanup = readText("EngineData/Frontend/RustApp/src/app/active-launcher/lifecycleCleanup.ts");
expectIncludes(lifecycleCleanup, "createCleanupRegistry", "launcher cleanup registry factory");
expectIncludes(lifecycleCleanup, "CleanupRegistry", "launcher cleanup registry type");
expectIncludes(lifecycleCleanup, "scheduleCleanupAwareDelay", "cleanup-aware delayed task helper");
expectIncludes(lifecycleCleanup, "window.clearTimeout", "cleanup-aware timeout cleanup");
expectIncludes(lifecycleCleanup, "beforeunload", "cleanup registry beforeunload binding");

const windowsNotes = readText("DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_VIRTUAL_AUDIO_PROVIDER_WINDOWS_NOTES.md");
expectIncludes(windowsNotes, "requirements-virtual-audio-route.txt", "windows provider notes requirements file");
expectIncludes(windowsNotes, "numpy", "windows provider notes numpy");
expectIncludes(windowsNotes, "sounddevice", "windows provider notes sounddevice");
expectIncludes(windowsNotes, "TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER", "windows provider notes env guard");
expectIncludes(windowsNotes, "Provider Dry Run", "windows provider notes dry run");

const main = readText("EngineData/Frontend/RustApp/src/main.ts");
expectIncludes(main, "virtualRouteSelectionSurface.css", "main route selection css import");
expectIncludes(main, "createCleanupRegistry", "main cleanup registry import/use");
expectIncludes(main, "scheduleCleanupAwareDelay", "main cleanup-aware delay import/use");
expectIncludes(main, "cleanup.add", "main cleanup registry registration");
expectIncludes(main, "cleanup.bindBeforeUnload", "main cleanup beforeunload registry");
expectIncludes(main, "mountVirtualRouteSelectionSurface", "main route selection mount import/use");
expectIncludes(main, "unmountVirtualRouteSelectionSurface", "main route selection unmount import/use");
expectIncludes(main, "bindSourceOrchestrationUi", "main source orchestration import/use");
expectIncludes(main, "bindVirtualAudioRouteProviderUi", "main provider dry-run import/use");
expectNotIncludes(main, "const stop", "main duplicate stop variable cleanup pattern");
expectNotIncludes(main, "window.addEventListener(\"beforeunload\"", "main direct beforeunload cleanup handler");

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
