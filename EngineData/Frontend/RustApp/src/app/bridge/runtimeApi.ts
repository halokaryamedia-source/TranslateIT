import { invoke } from "@tauri-apps/api/core";
import { defaultSettings, errorMessage } from "../shared/state";
import { getRuntimeCommandErrors } from "../shared/tauriBridge";
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
  HelperBridgeWorkerResponse,
  InputPreparationStatus,
  LauncherChatActionResult,
  LauncherChatSession,
  LauncherChatSummary,
  ModelInventoryReport,
  ModelSetupReport,
  RealtimeStatusPayload,
  RuntimeCommandError,
  RuntimeDiagnostics,
  RuntimeSettings,
  RuntimeStatusBundleReport,
  VoiceCapturePreparationReport,
} from "../shared/types";

export const RUNTIME_SETTINGS_SAVED_EVENT = "translateit:runtime-settings-saved";

const MAX_COMMAND_ERRORS = 25;
const commandErrors: RuntimeCommandError[] = [];

type NativeInputPreparationStatus = InputPreparationStatus & {
  backend_id?: string;
  input_device_name?: string | null;
  prepared?: boolean;
  running?: boolean;
  target_sample_rate_hz?: number;
  target_channels?: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function commandFallback(message: string, state = "frontend_bridge_error"): CommandResult {
  return { ok: false, state, message };
}

function helperActionFallback(message: string): HelperBridgeActionResult {
  return {
    ok: false,
    state: "frontend_bridge_error",
    message,
    generation_token: 0,
    runtime_claim: "frontend_bridge_unavailable",
  };
}

function helperWorkerFallback(task: string, message: string): HelperBridgeWorkerResponse {
  return {
    ok: false,
    state: "frontend_bridge_error",
    task,
    message,
    generation_token: 0,
    runtime_claim: "frontend_bridge_unavailable",
    worker_response_json: JSON.stringify({ ok: false, stage: task, blocker: "frontend_bridge_unavailable", note: message }),
  };
}

function bridgeStatusFallback(message: string): HelperBridgeStatus {
  return {
    state: "frontend_bridge_error",
    message,
    cuda_ready: false,
    provider_ready: false,
    degraded_mode: false,
    active_task: null,
    generation_token: 0,
    last_error: "frontend_bridge_unavailable",
    stderr_log_path: null,
    updated_unix_ms: Date.now(),
    runtime_claim: "frontend_bridge_unavailable",
  };
}

function inputStatusFallback(message: string): InputPreparationStatus {
  return {
    ready: false,
    selected_device_name: null,
    device_count: 0,
    blocker: "frontend_bridge_unavailable",
    note: message,
  };
}

function normalizeInputStatus(status: NativeInputPreparationStatus): InputPreparationStatus {
  return {
    ...status,
    ready: status.ready ?? status.prepared ?? false,
    selected_device_name: status.selected_device_name ?? status.input_device_name ?? null,
    device_count: status.device_count ?? (status.input_device_name ? 1 : 0),
    blocker: status.blocker ?? (status.prepared === false ? "audio_input:not_prepared" : undefined),
    note: status.note ?? "Audio input status checked.",
  };
}

function audioDevicesFallback(message: string): AudioDeviceListReport {
  return {
    ok: false,
    input_devices: [],
    output_devices: [],
    blocker: "frontend_bridge_unavailable",
    note: message,
  };
}

function recordCommandError(command: string, error: unknown): void {
  commandErrors.unshift({
    command,
    message: errorMessage(error),
    occurred_at: nowIso(),
  });
  commandErrors.splice(MAX_COMMAND_ERRORS);
}

async function invokeOr<T>(command: string, args: Record<string, unknown> | undefined, fallback: T): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    recordCommandError(command, error);
    return fallback;
  }
}

async function invokeNullable<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  return invokeOr<T | null>(command, args, null);
}

function publishSettings(settings: RuntimeSettings): void {
  window.dispatchEvent(new CustomEvent<RuntimeSettings>(RUNTIME_SETTINGS_SAVED_EVENT, { detail: settings }));
}

async function loadRuntimeSettings(): Promise<RuntimeSettings> {
  return invokeOr<RuntimeSettings>("load_runtime_settings", undefined, defaultSettings());
}

export const runtimeApi = {
  getCommandErrors(): RuntimeCommandError[] {
    return [...commandErrors, ...getRuntimeCommandErrors()].slice(0, MAX_COMMAND_ERRORS);
  },

  async getStatusBundle(): Promise<RuntimeStatusBundleReport | null> {
    return invokeNullable<RuntimeStatusBundleReport>("get_runtime_status_bundle");
  },

  async getRealtimeStatusPayload(): Promise<RealtimeStatusPayload | null> {
    return invokeNullable<RealtimeStatusPayload>("get_realtime_status_payload");
  },

  async getDiagnostics(): Promise<RuntimeDiagnostics | null> {
    return invokeNullable<RuntimeDiagnostics>("get_runtime_diagnostics");
  },

  async recordFrontendStartupTrace(label: string, detail: Record<string, unknown> = {}): Promise<void> {
    await invokeOr(
      "record_frontend_startup_trace",
      {
        record: {
          label,
          detail,
          at: nowIso(),
          build_marker: (globalThis as typeof globalThis & { __translateitStartupBuildMarker?: string }).__translateitStartupBuildMarker ?? "unknown",
        },
      },
      undefined,
    );
  },

  async getHardwareUsage(): Promise<HardwareUsageReport | null> {
    return invokeNullable<HardwareUsageReport>("get_hardware_usage");
  },

  async getHelperBridgeStatus(): Promise<HelperBridgeStatus> {
    return invokeOr<HelperBridgeStatus>(
      "get_helper_bridge_status",
      undefined,
      bridgeStatusFallback("Helper bridge status is unavailable because the frontend bridge could not call Tauri."),
    );
  },

  async startHelperBridge(): Promise<HelperBridgeActionResult> {
    return invokeOr<HelperBridgeActionResult>(
      "start_helper_bridge",
      undefined,
      helperActionFallback("Start Helper failed before reaching the Tauri command bridge."),
    );
  },

  async stopHelperBridge(): Promise<HelperBridgeActionResult> {
    return invokeOr<HelperBridgeActionResult>(
      "stop_helper_bridge",
      undefined,
      helperActionFallback("Stop Helper failed before reaching the Tauri command bridge."),
    );
  },

  async cancelHelperBridgeTask(): Promise<HelperBridgeActionResult> {
    return invokeOr<HelperBridgeActionResult>(
      "cancel_helper_bridge_task",
      undefined,
      helperActionFallback("Cancel Helper Task failed before reaching the Tauri command bridge."),
    );
  },

  async sendHelperBridgeRequest(request: HelperBridgeRequest): Promise<HelperBridgeActionResult> {
    return invokeOr<HelperBridgeActionResult>(
      "send_helper_bridge_request",
      { request },
      helperActionFallback("Helper request failed before reaching the Tauri command bridge."),
    );
  },

  async helperBridgeWorkerStatus(): Promise<HelperBridgeWorkerResponse> {
    return invokeOr<HelperBridgeWorkerResponse>(
      "helper_bridge_worker_status",
      undefined,
      helperWorkerFallback("status", "Worker status failed before reaching the Tauri command bridge."),
    );
  },

  async helperBridgePreloadAsr(): Promise<HelperBridgeWorkerResponse> {
    return invokeOr<HelperBridgeWorkerResponse>(
      "helper_bridge_preload_asr",
      undefined,
      helperWorkerFallback("asr_preload", "ASR preload failed before reaching the Tauri command bridge."),
    );
  },

  async helperBridgePreloadTranslation(mode?: string | null): Promise<HelperBridgeWorkerResponse> {
    return invokeOr<HelperBridgeWorkerResponse>(
      "helper_bridge_preload_translation",
      { mode: mode ?? null },
      helperWorkerFallback("translation_preload", "Translation preload failed before reaching the Tauri command bridge."),
    );
  },

  async helperBridgeTtsPreflight(): Promise<HelperBridgeWorkerResponse> {
    return invokeOr<HelperBridgeWorkerResponse>(
      "helper_bridge_tts_preflight",
      undefined,
      helperWorkerFallback("tts_preflight", "TTS preflight failed before reaching the Tauri command bridge."),
    );
  },

  async helperBridgeSynthesizeText(text: string, outputPath?: string | null): Promise<HelperBridgeWorkerResponse> {
    return invokeOr<HelperBridgeWorkerResponse>(
      "helper_bridge_synthesize_text",
      { text, outputPath: outputPath ?? null },
      helperWorkerFallback("synthesize", "TTS synthesize failed before reaching the Tauri command bridge."),
    );
  },

  async checkHelperBridgeHealth(): Promise<HelperBridgeActionResult> {
    return invokeOr<HelperBridgeActionResult>(
      "check_helper_bridge_health",
      undefined,
      helperActionFallback("Helper health check failed before reaching the Tauri command bridge."),
    );
  },

  async prepareCaptureStartRequest(): Promise<CaptureHelperBridgeRequestPreview | null> {
    return invokeNullable<CaptureHelperBridgeRequestPreview>("prepare_capture_start_request");
  },

  async prepareCaptureStopRequest(): Promise<CaptureHelperBridgeRequestPreview | null> {
    return invokeNullable<CaptureHelperBridgeRequestPreview>("prepare_capture_stop_request");
  },

  async dispatchCaptureStartRequest(): Promise<HelperBridgeActionResult> {
    return invokeOr<HelperBridgeActionResult>(
      "dispatch_capture_start_request",
      undefined,
      helperActionFallback("Capture start dispatch failed before reaching the Tauri command bridge."),
    );
  },

  async dispatchCaptureStopRequest(): Promise<HelperBridgeActionResult> {
    return invokeOr<HelperBridgeActionResult>(
      "dispatch_capture_stop_request",
      undefined,
      helperActionFallback("Capture stop dispatch failed before reaching the Tauri command bridge."),
    );
  },

  async prepareVoiceCapture(autoStart: boolean): Promise<VoiceCapturePreparationReport | null> {
    return invokeNullable<VoiceCapturePreparationReport>("prepare_voice_capture", { autoStart });
  },

  async startCapture(): Promise<CommandResult> {
    return invokeOr<CommandResult>(
      "start_capture",
      undefined,
      commandFallback("Start capture failed before reaching the Tauri command bridge."),
    );
  },

  async stopCapture(): Promise<CommandResult> {
    return invokeOr<CommandResult>(
      "stop_capture",
      undefined,
      commandFallback("Stop capture failed before reaching the Tauri command bridge."),
    );
  },

  async getInputStatus(): Promise<InputPreparationStatus> {
    const status = await invokeOr<NativeInputPreparationStatus>(
      "get_input_status",
      undefined,
      inputStatusFallback("Microphone status is unavailable because the frontend bridge could not call Tauri."),
    );
    return normalizeInputStatus(status);
  },

  async listAudioDevices(): Promise<AudioDeviceListReport> {
    return invokeOr<AudioDeviceListReport>(
      "list_audio_devices",
      undefined,
      audioDevicesFallback("Audio device list is unavailable because the frontend bridge could not call Tauri."),
    );
  },

  async loadSettings(): Promise<RuntimeSettings> {
    return loadRuntimeSettings();
  },

  async saveSettings(settings: RuntimeSettings): Promise<CommandResult> {
    const result = await invokeOr<CommandResult>(
      "save_runtime_settings",
      { settings },
      commandFallback("Settings could not be saved because the frontend bridge could not call Tauri."),
    );
    if (result.ok) publishSettings(settings);
    return result;
  },

  async saveDefaultSettings(): Promise<CommandResult> {
    const result = await invokeOr<CommandResult>(
      "save_default_runtime_settings",
      undefined,
      commandFallback("Default settings could not be restored because the frontend bridge could not call Tauri."),
    );
    if (result.ok) publishSettings(await loadRuntimeSettings());
    return result;
  },

  async createChatSession(kind: string): Promise<LauncherChatSession | null> {
    return invokeNullable<LauncherChatSession>("create_chat_session", { kind });
  },

  async listChatSessions(kind?: string): Promise<LauncherChatSummary[]> {
    return invokeOr<LauncherChatSummary[]>("list_chat_sessions", { kind: kind ?? null }, []);
  },

  async appendChatMessage(sessionId: string, role: "user" | "assistant", content: string): Promise<LauncherChatActionResult | null> {
    return invokeNullable<LauncherChatActionResult>("append_chat_message", { sessionId, role, content });
  },

  async translateText(source: string): Promise<CommandResult> {
    return invokeOr<CommandResult>(
      "translate_text",
      { source },
      commandFallback("Translation failed before reaching the Tauri command bridge."),
    );
  },

  async getModelInventory(): Promise<ModelInventoryReport | null> {
    return invokeNullable<ModelInventoryReport>("get_model_inventory");
  },

  async verifyModels(): Promise<ModelSetupReport | null> {
    return invokeNullable<ModelSetupReport>("verify_models");
  },

  async setupModels(): Promise<ModelSetupReport | null> {
    return invokeNullable<ModelSetupReport>("setup_models");
  },

  async getGpuPolicy(): Promise<GpuPolicyReport | null> {
    return invokeNullable<GpuPolicyReport>("get_gpu_policy");
  },

  async getLatestAudioPipelineEvidence(): Promise<AudioStudioValidationEvidence | null> {
    return invokeNullable<AudioStudioValidationEvidence>("get_latest_audio_pipeline_evidence");
  },

  async getLatestAudioStudioValidationEvidence(): Promise<AudioStudioValidationEvidence | null> {
    return invokeNullable<AudioStudioValidationEvidence>("get_latest_audio_studio_validation_evidence");
  },
};
