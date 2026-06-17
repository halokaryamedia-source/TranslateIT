export type CommandResult = { ok: boolean; state: string; message: string };

export type RuntimeCommandError = {
  command: string;
  message: string;
  occurred_at: string;
};

export type EngineStatus = {
  app_version: string;
  runtime_stage: string;
  lifecycle_state: string;
  cuda_policy: string;
  asr_engine: string;
  translation_engine: string;
  tts_engine: string;
  notes: string[];
};

export type RuntimeDiagnostics = {
  cuda_probe: {
    nvidia_smi_available: boolean;
    gpu_summary: string | null;
    cuda_runtime_ready: boolean;
    blocker: string | null;
  };
  backend_validation: { ready: boolean; blocker: string };
  blockers: string[];
};

export type LocalWorkerManifestReport = {
  ok: boolean;
  runtime_manifest_exists: boolean;
  runtime_manifest_valid: boolean;
  asr_model_ready: boolean;
  asr_backup_model_ready: boolean;
  realtime_translation_model_ready: boolean;
  quality_translation_model_ready: boolean;
  piper_ready: boolean;
  sapi_ready: boolean;
  tts_default_ready: boolean;
  voice_actor_marcel_ready: boolean;
  voice_actor_path: string | null;
  torch_cuda_available: boolean;
  ctranslate2_cuda_available: boolean;
  blockers: string[];
  warnings: string[];
  tts_blockers: string[];
  note: string;
};

export type RuntimeStatusBundleReport = {
  engine_status: EngineStatus;
  readiness: { ready_for_user_facing_runtime: boolean; blockers: string[]; note: string };
  capture_gate: { ready_for_capture_start: boolean; blockers: string[]; note: string };
  live_capture: {
    stream_active: boolean;
    frames_received: number;
    device_name: string | null;
    blocker: string;
    note: string;
  };
  local_worker_manifest?: LocalWorkerManifestReport;
  internal_validation_gate?: {
    progress_percent: number;
    blockers: string[];
    note: string;
    local_worker_manifest?: LocalWorkerManifestReport;
  };
  live_pipeline_gate?: { progress_percent: number; blocker: string; note: string };
  next_action: string;
  summary: string;
};

export type RealtimeStatusPayload = {
  status: "idle" | "checking" | "ready" | "partial_ready" | "fallback" | "error" | string;
  language_direction: string;
  mode: "Realtime" | "Quality" | string;
  latency: {
    target_ms: number;
    last_total_ms: number | null;
    p50_ms: number | null;
    sample_count: number;
  };
  worker: {
    available: boolean;
    device: string | null;
    fallback_active: boolean;
    last_command: string | null;
  };
  assets: {
    asr_ready: boolean;
    translation_ready: boolean;
    tts_ready: boolean;
    missing: string[];
  };
  message: string;
  evidence_path: string | null;
};

export type RuntimeSettings = {
  schema_version: number;
  language_focus_mode: string;
  runtime_profile: string;
  source_language: string;
  target_language: string;
  audio: {
    input_device_id: string | null;
    output_device_id: string | null;
    sensitivity: number;
    input_sensitivity: string;
    show_advanced_devices: boolean;
    allow_low_but_usable_input: boolean;
    allow_cpu_degraded_mode: boolean;
    auto_play_translation_voice: boolean;
    auto_play_out_voice: boolean;
    use_custom_voice_actor: boolean;
    voice_actor_profiles_root: string;
  };
  voice_actor_profile_id: string;
};

export type InputPreparationStatus = {
  ready: boolean;
  selected_device_name?: string | null;
  device_count?: number;
  blocker?: string;
  note?: string;
};

export type LauncherChatSession = {
  session_id: string;
  title: string;
  kind: string;
  created_unix_ms: number;
  updated_unix_ms: number;
  messages: { role: string; content: string; created_unix_ms: number }[];
};

export type LauncherChatSummary = {
  session_id: string;
  title: string;
  kind: string;
  updated_unix_ms: number;
  message_count: number;
};

export type LauncherChatActionResult = {
  ok: boolean;
  session_id: string;
  message: string;
};

export type HardwareMetric = {
  label: string;
  percent: number | null;
  status: string;
  detail: string;
};

export type HardwareUsageReport = {
  cpu: HardwareMetric;
  ram: HardwareMetric;
  gpu: HardwareMetric;
  note: string;
};

export type SettingsTab = "general" | "audio" | "translate" | "developer";
export type ChatKind = "recent" | "unsaved" | "saved" | "local";
