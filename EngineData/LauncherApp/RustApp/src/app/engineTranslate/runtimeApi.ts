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

export const runtimeApi = {
  loadSettings: () => runCommand<RuntimeSettings>("load_runtime_settings"),
  saveSettings: (settings: RuntimeSettings) => runCommand<CommandResult>("save_runtime_settings", { settings }),
  saveDefaultSettings: () => runCommand<CommandResult>("save_default_runtime_settings"),
  getStatusBundle: () => runCommand<RuntimeStatusBundleReport>("get_runtime_status_bundle"),
  getDiagnostics: () => runCommand<RuntimeDiagnostics>("get_runtime_diagnostics"),
  getHardwareUsage: () => runCommand<HardwareUsageReport>("get_hardware_usage"),
  getInputStatus: () => runCommand<InputPreparationStatus>("get_input_status"),
  startCapture: () => runCommand<CommandResult>("start_capture"),
  stopCapture: () => runCommand<CommandResult>("stop_capture"),
  translateText: (source: string) => runCommand<CommandResult>("translate_text", { source }),
  createChatSession: (kind: string) => runCommand<LauncherChatSession>("create_chat_session", { kind }),
  listChatSessions: (kind?: string) => runCommand<LauncherChatSummary[]>("list_chat_sessions", kind ? { kind } : {}),
  appendChatMessage: (sessionId: string, role: string, content: string) => runCommand<LauncherChatActionResult>("append_chat_message", { sessionId, role, content }),
  getCommandErrors: () => getRuntimeCommandErrors(),
};
