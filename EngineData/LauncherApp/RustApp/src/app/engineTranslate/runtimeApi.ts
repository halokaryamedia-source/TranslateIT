import { getRuntimeCommandErrors, runCommand } from "../shared/tauriBridge";
import type {
  CommandResult,
  HardwareUsageReport,
  InputPreparationStatus,
  LauncherChatActionResult,
  LauncherChatSession,
  LauncherChatSummary,
  RuntimeDiagnostics,
  RuntimeSettings,
  RuntimeStatusBundleReport,
} from "../shared/types";

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
  clearRuntimeReads("runtime-settings", "status-bundle", "diagnostics", "input-status", "hardware-usage");
}

function clearVoiceDependentReads(): void {
  clearRuntimeReads("status-bundle", "diagnostics", "input-status");
}

function chatListKey(kind?: string): string {
  return `chat-list:${kind ?? "all"}`;
}

function clearChatReads(kind?: string): void {
  clearRuntimeReads(chatListKey(), chatListKey("recent"), chatListKey("unsaved"), chatListKey("saved"), chatListKey(kind));
}

export const runtimeApi = {
  loadSettings: () => singleFlight("runtime-settings", () => runCommand<RuntimeSettings>("load_runtime_settings")),
  saveSettings: async (settings: RuntimeSettings) => {
    const result = await runCommand<CommandResult>("save_runtime_settings", { settings });
    clearSettingsDependentReads();
    return result;
  },
  saveDefaultSettings: async () => {
    const result = await runCommand<CommandResult>("save_default_runtime_settings");
    clearSettingsDependentReads();
    return result;
  },
  getStatusBundle: () => singleFlight("status-bundle", () => runCommand<RuntimeStatusBundleReport>("get_runtime_status_bundle")),
  getDiagnostics: () => singleFlight("diagnostics", () => runCommand<RuntimeDiagnostics>("get_runtime_diagnostics")),
  getHardwareUsage: () => singleFlight("hardware-usage", () => runCommand<HardwareUsageReport>("get_hardware_usage")),
  getInputStatus: () => singleFlight("input-status", () => runCommand<InputPreparationStatus>("get_input_status")),
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
    clearRuntimeReads("status-bundle", "diagnostics");
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
