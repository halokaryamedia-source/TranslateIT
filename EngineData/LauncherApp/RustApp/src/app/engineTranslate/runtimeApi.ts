import { getRuntimeCommandErrors, runCommand } from "../shared/tauriBridge";
import type {
  AudioDeviceListReport,
  AudioStudioValidationEvidence,
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
} from "../shared/types";

export const RUNTIME_SETTINGS_SAVED_EVENT = "translateit:runtime-settings-saved";

const pendingRuntimeReads = new Map<string, Promise<unknown>>();

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
  clearRuntimeReads("runtime-settings", "status-bundle", "diagnostics", "input-status", "hardware-usage", "audio-devices", "helper-bridge-status", "audio-studio-validation-evidence");
}

function clearVoiceDependentReads(): void {
  clearRuntimeReads("status-bundle", "diagnostics", "input-status", "helper-bridge-status");
}

function clearTextJobReads(): void {
  clearRuntimeReads("status-bundle", "diagnostics", "helper-bridge-status");
}

function clearHelperBridgeReads(): void {
  clearRuntimeReads("helper-bridge-status", "status-bundle", "diagnostics");
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
    const result = await runCommand<HelperBridgeActionResult>("start_helper_bridge");
    clearHelperBridgeReads();
    return result;
  },
  stopHelperBridge: async () => {
    const result = await runCommand<HelperBridgeActionResult>("stop_helper_bridge");
    clearHelperBridgeReads();
    return result;
  },
  cancelHelperBridgeTask: async () => {
    const result = await runCommand<HelperBridgeActionResult>("cancel_helper_bridge_task");
    clearHelperBridgeReads();
    return result;
  },
  checkHelperBridgeHealth: async () => {
    const result = await runCommand<HelperBridgeActionResult>("check_helper_bridge_health");
    clearHelperBridgeReads();
    return result;
  },
  sendHelperBridgeRequest: async (request: HelperBridgeRequest) => {
    const result = await runCommand<HelperBridgeActionResult>("send_helper_bridge_request", { request });
    clearHelperBridgeReads();
    return result;
  },
  getLatestAudioStudioValidationEvidence: () => singleFlight("audio-studio-validation-evidence", () => runCommand<AudioStudioValidationEvidence>("get_latest_audio_studio_validation_evidence")),
  getHardwareUsage: () => singleFlight("hardware-usage", () => runCommand<HardwareUsageReport>("get_hardware_usage")),
  getInputStatus: () => singleFlight("input-status", () => runCommand<InputPreparationStatus>("get_input_status")),
  listAudioDevices: () => singleFlight("audio-devices", () => runCommand<AudioDeviceListReport>("list_audio_devices")),
  startCapture: async () => {
    const result = await runCommand<CommandResult>("start_capture");
    clearVoiceDependentReads();
    return result;
  },
  stopCapture: async () => {
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
