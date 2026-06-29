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

export type HelperBridgeStatus = {
  state: string;
  message: string;
  cuda_ready: boolean;
  provider_ready: boolean;
  degraded_mode: boolean;
  active_task: string | null;
  generation_token: number;
  last_error: string | null;
  stderr_log_path?: string | null;
  updated_unix_ms: number;
  runtime_claim: string;
};

export type HelperBridgeActionResult = {
  ok: boolean;
  state: string;
  message: string;
  generation_token: number;
  runtime_claim: string;
};

export type HelperBridgeWorkerResponse = {
  ok: boolean;
  state: string;
  task: string;
  message: string;
  generation_token: number;
  runtime_claim: string;
  worker_response_json: string;
};

export type HelperBridgeRequest = {
  task: string;
  payload_json?: string | null;
};

export type CaptureHelperBridgeRequestPreview = {
  ok: boolean;
  state: string;
  message: string;
  command: string;
  helper_task: string;
  generation_token: number;
  provider_ready: boolean;
  cuda_ready: boolean;
  requires_provider_ready: boolean;
  migration_ready: boolean;
  preview_only: boolean;
  runtime_claim: string;
  payload_json: string;
};

export type CaptureHelperDispatchStatus = {
  attempted: boolean;
  command: string;
  ok: boolean;
  state: string;
  message: string;
  generation_token: number;
  runtime_claim: string;
  updated_unix_ms: number;
};

export type AudioStudioValidationEvidence = {
  ok: boolean;
  stage: string;
  blocker?: string;
  evidence_dir?: string;
  summary_path?: string;
  log_path?: string | null;
  evidence_unix_ms?: number;
  summary?: {
    schema?: string;
    status?: string;
    runtime_claim?: string;
    error_message?: string | null;
  };
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

export type AudioDeviceSummary = {
  id: string;
  name: string;
  is_default: boolean;
};

export type AudioDeviceListReport = {
  ok: boolean;
  input_devices: AudioDeviceSummary[];
  output_devices: AudioDeviceSummary[];
  blocker: string;
  note: string;
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

export type VoiceCapturePreparationReport = {
  ok: boolean;
  state: "ready" | "starting" | "blocked" | "missing_worker" | "missing_models" | "missing_microphone" | string;
  microphone_ready: boolean;
  helper_state: string;
  helper_ready: boolean;
  provider_ready: boolean;
  cuda_ready: boolean;
  missing: string[];
  next_actions: string[];
  message: string;
  input_status: InputPreparationStatus;
  helper_status: HelperBridgeStatus;
};

export type UserFlowTraceEvent = {
  event: string;
  occurred_at: string;
  detail: string;
};

export type ModelInventoryItem = {
  model_id: string;
  required: boolean;
  expected_path: string;
  found: boolean;
  file_count: number;
  size_bytes: number;
  gpu_capable: boolean | "unknown";
  cpu_fallback: boolean;
  download_url: string | null;
  status: "PASS" | "PARTIAL" | "BLOCKED" | "FAIL";
  blocker: string | null;
  next_action: string;
};

export type ModelInventoryReport = {
  ok: boolean;
  status: "PASS" | "PARTIAL" | "BLOCKED" | "FAIL" | string;
  created_at: string;
  items: ModelInventoryItem[];
  blockers: string[];
  note: string;
};

export type ModelSetupReport = {
  ok: boolean;
  status: "PASS" | "PARTIAL" | "BLOCKED" | "FAIL" | string;
  created_at: string;
  output_dir: string;
  items: ModelInventoryItem[];
  blockers: string[];
  note: string;
};
