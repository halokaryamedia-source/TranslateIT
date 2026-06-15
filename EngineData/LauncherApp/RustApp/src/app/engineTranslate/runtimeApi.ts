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

function chatListKey(kind?: string): string {
  return `chat-list:${kind ?? "all"}`;
}

export const runtimeApi = {
  loadSettings: () => singleFlight("runtime-settings", () => runCommand<RuntimeSettings>("load_runtime_settings")),
  saveSettings: (settings: RuntimeSettings) => runCommand<CommandResult>("save_runtime_settings", { settings }),
  saveDefaultSettings: () => runCommand<CommandResult>("save_default_runtime_settings"),
  getStatusBundle: () => singleFlight("status-bundle", () => runCommand<RuntimeStatusBundleReport>("get_runtime_status_bundle")),
  getDiagnostics: () => singleFlight("diagnostics", () => runCommand<RuntimeDiagnostics>("get_runtime_diagnostics")),
  getHardwareUsage: () => singleFlight("hardware-usage", () => runCommand<HardwareUsageReport>("get_hardware_usage")),
  getInputStatus: () => singleFlight("input-status", () => runCommand<InputPreparationStatus>("get_input_status")),
  startCapture: () => runCommand<CommandResult>("start_capture"),
  stopCapture: () => runCommand<CommandResult>("stop_capture"),
  translateText: (source: string) => runCommand<CommandResult>("translate_text", { source }),
  createChatSession: (kind: string) => runCommand<LauncherChatSession>("create_chat_session", { kind }),
  listChatSessions: (kind?: string) => singleFlight(chatListKey(kind), () => runCommand<LauncherChatSummary[]>("list_chat_sessions", kind ? { kind } : {})),
  appendChatMessage: (sessionId: string, role: string, content: string) => runCommand<LauncherChatActionResult>("append_chat_message", { sessionId, role, content }),
  getCommandErrors: () => getRuntimeCommandErrors(),
};
