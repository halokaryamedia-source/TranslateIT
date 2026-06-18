import { getRuntimeCommandErrors, runCommand } from "../shared/tauriBridge";
import type {
  AudioDeviceListReport,
  AudioStudioValidationEvidence,
  CaptureHelperBridgeRequestPreview,
  CommandResult,
  HardwareUsageReport,
  HelperBridgeActionResult,
  HelperBridgeRequest,
  HelperBridgeStatus,
  InputPreparationStatus,
  LauncherChatActionResult,
  LauncherChatSession,
  LauncherChatSummary,
  RuntimeDiagnostics,
  RuntimeSettings,
  RuntimeStatusBundleReport,
  VoiceCapturePreparationReport,
} from "../shared/types";

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
  );
}

function chatListKey(kind?: string): string {
  return `chat-list:${kind ?? "all"}`;
}

function clearChatReads(kind?: string): void {
  clearRuntimeReads(chatListKey(), chatListKey("recent"), chatListKey("unsaved"), chatListKey("saved"), chatListKey(kind));
}

function hasDeviceId(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function broadcastSettingsSaved(settings: RuntimeSettings): void {
  window.dispatchEvent(new CustomEvent<RuntimeSettings>(RUNTIME_SETTINGS_SAVED_EVENT, { detail: settings }));
}

async function settingsForSave(settings: RuntimeSettings): Promise<RuntimeSettings> {
  const current = await runCommand<RuntimeSettings>("load_runtime_settings");
  if (!current) return settings;
  return {
    ...settings,
    audio: {
      ...settings.audio,
      input_device_id: hasDeviceId(settings.audio.input_device_id) ? settings.audio.input_device_id : current.audio.input_device_id,
      output_device_id: hasDeviceId(settings.audio.output_device_id) ? settings.audio.output_device_id : current.audio.output_device_id,
    },
  };
}

export const runtimeApi = {
  loadSettings: () => singleFlight("runtime-settings", () => runCommand<RuntimeSettings>("load_runtime_settings")),
  saveSettings: async (settings: RuntimeSettings) => {
    const mergedSettings = await settingsForSave(settings);
    const result = await runCommand<CommandResult>("save_runtime_settings", { settings: mergedSettings });
    clearSettingsDependentReads();
    if (result?.ok) broadcastSettingsSaved(mergedSettings);
    return result;
  },
  saveDefaultSettings: async () => {
    const result = await runCommand<CommandResult>("save_default_runtime_settings");
    clearSettingsDependentReads();
    const settings = await runCommand<RuntimeSettings>("load_runtime_settings");
    if (result?.ok && settings) broadcastSettingsSaved(settings);
    return result;
  },
  getStatusBundle: () => singleFlight("status-bundle", () => runCommand<RuntimeStatusBundleReport>("get_runtime_status_bundle")),
  getDiagnostics: () => singleFlight("diagnostics", () => runCommand<RuntimeDiagnostics>("get_runtime_diagnostics")),
  getHelperBridgeStatus: () => singleFlight("helper-bridge-status", () => runCommand<HelperBridgeStatus>("get_helper_bridge_status")),
  startHelperBridge: async () => {
    clearHelperBridgeReads();
    const result = await runHelperActionWithTimeout("start_helper_bridge", HELPER_START_TIMEOUT_MS);
    clearHelperBridgeReads();
    return result;
  },
  stopHelperBridge: async () => {
    clearHelperBridgeReads();
    const result = await runHelperActionWithTimeout("stop_helper_bridge", HELPER_COMMAND_TIMEOUT_MS);
    clearHelperBridgeReads();
    return result;
  },
  cancelHelperBridgeTask: async () => {
    clearHelperBridgeReads();
    const result = await runHelperActionWithTimeout("cancel_helper_bridge_task", HELPER_COMMAND_TIMEOUT_MS);
    clearHelperBridgeReads();
    return result;
  },
  checkHelperBridgeHealth: async () => {
    clearHelperBridgeReads();
    const result = await runHelperActionWithTimeout("check_helper_bridge_health", HELPER_COMMAND_TIMEOUT_MS);
    clearHelperBridgeReads();
    return result;
  },
  sendHelperBridgeRequest: async (request: HelperBridgeRequest) => {
    clearHelperBridgeReads();
    const result = await runHelperActionWithTimeout("send_helper_bridge_request", HELPER_COMMAND_TIMEOUT_MS, { request });
    clearHelperBridgeReads();
    return result;
  },
  prepareCaptureStartRequest: () => singleFlight("capture-start-preview", () => runCommand<CaptureHelperBridgeRequestPreview>("prepare_capture_start_request")),
  prepareCaptureStopRequest: () => singleFlight("capture-stop-preview", () => runCommand<CaptureHelperBridgeRequestPreview>("prepare_capture_stop_request")),
  getLatestAudioStudioValidationEvidence: () => singleFlight("audio-studio-validation-evidence", () => runCommand<AudioStudioValidationEvidence>("get_latest_audio_studio_validation_evidence")),
  getHardwareUsage: () => singleFlight("hardware-usage", () => runCommand<HardwareUsageReport>("get_hardware_usage")),
  getInputStatus: () => singleFlight("input-status", () => runCommand<InputPreparationStatus>("get_input_status")),
  prepareVoiceCapture: (autoStart = true) => singleFlight("voice-capture-prep", () => runCommand<VoiceCapturePreparationReport>("prepare_voice_capture", { autoStart })),
  listAudioDevices: () => singleFlight("audio-devices", () => runCommand<AudioDeviceListReport>("list_audio_devices")),
  startCapture: async () => {
    clearVoiceDependentReads();
    const result = await runCommand<CommandResult>("start_capture");
    clearVoiceDependentReads();
    return result;
  },
  stopCapture: async () => {
    clearVoiceDependentReads();
    const result = await runCommand<CommandResult>("stop_capture");
    clearVoiceDependentReads();
    return result;
  },
  translateText: async (source: string) => {
    const result = await runCommand<CommandResult>("translate_text", { source });
    clearTextJobReads();
    return result;
  },
  createChatSession: async (kind: string) => {
    const result = await runCommand<LauncherChatSession>("create_chat_session", { kind });
    clearChatReads(kind);
    return result;
  },
  listChatSessions: (kind?: string) => singleFlight(chatListKey(kind), () => runCommand<LauncherChatSummary[]>("list_chat_sessions", kind ? { kind } : {})),
  appendChatMessage: async (sessionId: string, role: string, content: string) => {
    const result = await runCommand<LauncherChatActionResult>("append_chat_message", { sessionId, role, content });
    clearChatReads();
    return result;
  },
  getCommandErrors: () => getRuntimeCommandErrors(),
};
