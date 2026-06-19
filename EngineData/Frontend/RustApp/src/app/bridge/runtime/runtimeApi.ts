import { getRuntimeCommandErrors, runCommand } from "../../shared/tauriBridge";
import type {
  AudioDeviceListReport,
  AudioStudioValidationEvidence,
  CaptureHelperBridgeRequestPreview,
  CommandResult,
  GpuPolicyReport,
  HardwareUsageReport,
  HelperBridgeActionResult,
  HelperBridgeRequest,
  HelperBridgeStatus,
  InputPreparationStatus,
  LauncherChatActionResult,
  LauncherChatSession,
  LauncherChatSummary,
  ModelInventoryReport,
  ModelSetupReport,
  RuntimeDiagnostics,
  RuntimeSettings,
  RuntimeStatusBundleReport,
  VoiceCapturePreparationReport,
} from "../../shared/types";

export const RUNTIME_SETTINGS_SAVED_EVENT = "translateit:runtime-settings-saved";

const pendingRuntimeReads = new Map<string, Promise<unknown>>();
const HELPER_COMMAND_TIMEOUT_MS = 8_000;
const HELPER_START_TIMEOUT_MS = 15_000;

function singleFlight<T>(key: string, task: () => Promise<T | null>): Promise<T | null> {
  const current = pendingRuntimeReads.get(key) as Promise<T | null> | undefined;
  if (current) return current;
  const pending = task().finally(() => pendingRuntimeReads.delete(key));
  pendingRuntimeReads.set(key, pending);
  return pending;
}

function clearRuntimeReads(...keys: string[]): void {
  keys.forEach((key) => pendingRuntimeReads.delete(key));
}

function clearSettingsDependentReads(): void {
  clearRuntimeReads("runtime-settings", "status-bundle", "diagnostics", "input-status", "hardware-usage", "audio-devices", "helper-bridge-status", "audio-studio-validation-evidence", "capture-start-preview", "capture-stop-preview");
}

function clearVoiceDependentReads(): void {
  clearRuntimeReads("status-bundle", "diagnostics", "input-status", "helper-bridge-status", "capture-start-preview", "capture-stop-preview");
}

function clearTextJobReads(): void {
  clearRuntimeReads("status-bundle", "diagnostics", "helper-bridge-status");
}

function clearHelperBridgeReads(): void {
  clearRuntimeReads("helper-bridge-status", "status-bundle", "diagnostics", "capture-start-preview", "capture-stop-preview");
}

function helperTimeoutResult(action: string, timeoutMs: number): HelperBridgeActionResult {
  return {
    ok: false,
    state: "timeout",
    message: `${action} did not return within ${Math.round(timeoutMs / 1000)} seconds. The UI has stopped waiting; check Developer diagnostics and helper stderr logs before retrying.`,
    generation_token: 0,
    runtime_claim: "frontend_timeout_backend_result_unknown",
  };
}

function withTimeout<T>(task: Promise<T | null>, timeoutMs: number, fallback: T): Promise<T | null> {
  let timer: number | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = window.setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([task, timeout]).finally(() => {
    if (timer !== undefined) window.clearTimeout(timer);
  });
}

function runHelperActionWithTimeout(command: string, timeoutMs: number, args?: Record<string, unknown>): Promise<HelperBridgeActionResult | null> {
  return withTimeout(
    runCommand<HelperBridgeActionResult>(command, args),
    timeoutMs,
    helperTimeoutResult(command, timeoutMs),
  ).finally(() => clearHelperBridgeReads());
}

function publishSettings(settings: RuntimeSettings): void {
  window.dispatchEvent(new CustomEvent<RuntimeSettings>(RUNTIME_SETTINGS_SAVED_EVENT, { detail: settings }));
}

export const runtimeApi = {
  getCommandErrors() {
    return getRuntimeCommandErrors();
  },
  getStatusBundle(): Promise<RuntimeStatusBundleReport | null> {
    return singleFlight("status-bundle", () => runCommand<RuntimeStatusBundleReport>("get_runtime_status_bundle").catch(() => null));
  },
  getRealtimeStatusPayload(): Promise<import("../../shared/types").RealtimeStatusPayload | null> {
    return singleFlight("realtime-status-payload", () => runCommand<import("../../shared/types").RealtimeStatusPayload>("get_realtime_status_payload").catch(() => null));
  },
  getDiagnostics(): Promise<RuntimeDiagnostics | null> {
    return singleFlight("diagnostics", () => runCommand<RuntimeDiagnostics>("get_runtime_diagnostics").catch(() => null));
  },
  getHardwareUsage(): Promise<HardwareUsageReport | null> {
    return singleFlight("hardware-usage", () => runCommand<HardwareUsageReport>("get_hardware_usage").catch(() => null));
  },
  getHelperBridgeStatus(): Promise<HelperBridgeStatus | null> {
    return singleFlight("helper-bridge-status", () => runCommand<HelperBridgeStatus>("get_helper_bridge_status").catch(() => null));
  },
  startHelperBridge(): Promise<HelperBridgeActionResult | null> {
    return runHelperActionWithTimeout("start_helper_bridge", HELPER_START_TIMEOUT_MS);
  },
  stopHelperBridge(): Promise<HelperBridgeActionResult | null> {
    return runHelperActionWithTimeout("stop_helper_bridge", HELPER_COMMAND_TIMEOUT_MS);
  },
  cancelHelperBridgeTask(): Promise<HelperBridgeActionResult | null> {
    return runHelperActionWithTimeout("cancel_helper_bridge_task", HELPER_COMMAND_TIMEOUT_MS);
  },
  sendHelperBridgeRequest(request: HelperBridgeRequest): Promise<HelperBridgeActionResult | null> {
    return runHelperActionWithTimeout("send_helper_bridge_request", HELPER_COMMAND_TIMEOUT_MS, { request });
  },
  checkHelperBridgeHealth(): Promise<HelperBridgeActionResult | null> {
    return runHelperActionWithTimeout("check_helper_bridge_health", HELPER_COMMAND_TIMEOUT_MS);
  },
  prepareCaptureStartRequest(): Promise<CaptureHelperBridgeRequestPreview | null> {
    return singleFlight("capture-start-preview", () => runCommand<CaptureHelperBridgeRequestPreview>("prepare_capture_start_request").catch(() => null));
  },
  prepareCaptureStopRequest(): Promise<CaptureHelperBridgeRequestPreview | null> {
    return singleFlight("capture-stop-preview", () => runCommand<CaptureHelperBridgeRequestPreview>("prepare_capture_stop_request").catch(() => null));
  },
  prepareVoiceCapture(autoStart: boolean): Promise<VoiceCapturePreparationReport | null> {
    return runCommand<VoiceCapturePreparationReport>("prepare_voice_capture", { autoStart }).catch(() => null).finally(() => clearVoiceDependentReads());
  },
  startCapture(): Promise<CommandResult | null> {
    return runCommand<CommandResult>("start_capture").catch(() => null).finally(() => clearVoiceDependentReads());
  },
  stopCapture(): Promise<CommandResult | null> {
    return runCommand<CommandResult>("stop_capture").catch(() => null).finally(() => clearVoiceDependentReads());
  },
  getInputStatus(): Promise<InputPreparationStatus | null> {
    return singleFlight("input-status", () => runCommand<InputPreparationStatus>("get_input_status").catch(() => null));
  },
  listAudioDevices(): Promise<AudioDeviceListReport | null> {
    return singleFlight("audio-devices", () => runCommand<AudioDeviceListReport>("list_audio_devices").catch(() => null));
  },
  loadSettings(): Promise<RuntimeSettings | null> {
    return singleFlight("runtime-settings", () => runCommand<RuntimeSettings>("load_runtime_settings").catch(() => null));
  },
  saveSettings(settings: RuntimeSettings): Promise<CommandResult | null> {
    publishSettings(settings);
    return runCommand<CommandResult>("save_runtime_settings", { settings }).catch(() => null).finally(clearSettingsDependentReads);
  },
  saveDefaultSettings(): Promise<CommandResult | null> {
    return runCommand<CommandResult>("save_default_runtime_settings").catch(() => null).finally(clearSettingsDependentReads);
  },
  createChatSession(kind: string): Promise<LauncherChatSession | null> {
    return runCommand<LauncherChatSession>("create_chat_session", { kind }).catch(() => null);
  },
  listChatSessions(kind?: string): Promise<LauncherChatSummary[] | null> {
    return runCommand<LauncherChatSummary[]>("list_chat_sessions", { kind: kind ?? null }).catch(() => null);
  },
  appendChatMessage(sessionId: string, role: "user" | "assistant", content: string): Promise<LauncherChatActionResult | null> {
    return runCommand<LauncherChatActionResult>("append_chat_message", { sessionId, role, content }).catch(() => null);
  },
  translateText(source: string): Promise<CommandResult | null> {
    return runCommand<CommandResult>("translate_text", { source }).catch(() => null).finally(clearTextJobReads);
  },
  getModelInventory(): Promise<ModelInventoryReport | null> {
    return singleFlight("model-inventory", () => runCommand<ModelInventoryReport>("get_model_inventory").catch(() => null));
  },
  verifyModels(): Promise<ModelSetupReport | null> {
    return runCommand<ModelSetupReport>("verify_models").catch(() => null);
  },
  setupModels(): Promise<ModelSetupReport | null> {
    return runCommand<ModelSetupReport>("setup_models").catch(() => null);
  },
  getGpuPolicy(): Promise<GpuPolicyReport | null> {
    return singleFlight("gpu-policy", () => runCommand<GpuPolicyReport>("get_gpu_policy").catch(() => null));
  },
  getLatestAudioPipelineEvidence(): Promise<AudioStudioValidationEvidence | null> {
    return singleFlight("audio-pipeline-evidence", () => runCommand<AudioStudioValidationEvidence>("get_latest_audio_pipeline_evidence").catch(() => null));
  },
  getLatestAudioStudioValidationEvidence(): Promise<AudioStudioValidationEvidence | null> {
    return singleFlight("audio-studio-validation-evidence", () => runCommand<AudioStudioValidationEvidence>("get_latest_audio_studio_validation_evidence").catch(() => null));
  },
};
