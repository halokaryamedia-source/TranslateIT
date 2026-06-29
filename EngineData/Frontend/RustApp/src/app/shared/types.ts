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

export type CaptureTranscriptBoundaryStatus = {
  capture_dispatch_attempted: boolean;
  capture_dispatch_ok: boolean;
  helper_capture_command: string;
  helper_capture_state: string;
  existing_capture_active: boolean;
  frames_received: number;
  buffered_duration_ms: number;
  ready_for_vad: boolean;
  ready_for_target_asr_frame: boolean;
  transcript_handoff_ready: boolean;
  blocker: string;
  next_action: string;
  runtime_claim: string;
  updated_unix_ms: number;
};

export type AsrHandoffRequestStatus = {
  boundary_ready: boolean;
  request_prepared: boolean;
  dispatch_attempted: boolean;
  dispatch_ok: boolean;
  task: string;
  state: string;
  message: string;
  blocker: string;
  next_action: string;
  frames_received: number;
  buffered_duration_ms: number;
  generation_token: number;
  runtime_claim: string;
  payload_json: string;
  updated_unix_ms: number;
};

export type PipelineHandoffRequestStatus = {
  stage: string;
  prerequisite_stage: string;
  prerequisite_ready: boolean;
  request_prepared: boolean;
  dispatch_attempted: boolean;
  dispatch_ok: boolean;
  state: string;
  message: string;
  blocker: string;
  next_action: string;
  generation_token: number;
  runtime_claim: string;
  payload_json: string;
  updated_unix_ms: number;
};

export type LivePipelineSessionSnapshot = {
  ok: boolean;
  state: string;
  progress_percent: number;
  stage_count: number;
  prepared_count: number;
  dispatch_ok_count: number;
  active_stage: string;
  active_blocker: string;
  next_action: string;
  summary: string;
  runtime_claim: string;
  stages: PipelineHandoffRequestStatus[];
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

export type GpuPolicyReport = {
  ok: boolean;
  status: string;
  cuda_available: boolean;
  gpu_primary: boolean;
  cpu_fallback_active: boolean;
  preferred_backend: string;
  notes: string[];
  blocker: string;
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
  readiness: { ready_for_user_facing_runtime: boolean; ready_for_start_command?: boolean; ready_for_stop_command?: boolean; blockers: string[]; note: string; session_state?: { has_active_session: boolean }; handoff_state?: { has_snapshot: boolean } };
  capture_gate: { ready_for_capture_start: boolean; blockers: string[]; note: string };
  live_capture: {
    stream_active: boolean;
    frames_received: number;
    device_name: string | null;
    blocker: string;
    note: string;
  };
  live_audio_buffer?: {
    ready_for_vad: boolean;
    ready_for_target_asr_frame: boolean;
    buffered_duration_ms: number;
    blocker: string;
  };
  live_target_segment?: { ready: boolean; blocker: string };
  live_asr_boundary?: { input_ready: boolean; model_ready: boolean; backend_ready: boolean; ready_for_decoder_call?: boolean; blocker: string };
  native_asr_decoder?: { decoder_connected: boolean; transcript_text?: string | null; blocker: string };
  live_translation_boundary?: { translated_text?: string | null; blocker: string };
  live_tts_boundary?: { output_audio_ready: boolean; playback_ready: boolean; blocker: string };
  local_worker_manifest?: LocalWorkerManifestReport;
  internal_validation_gate?: {
    progress_percent: number;
    blockers: string[];
    note: string;
    ready_for_owner_validation?: boolean;
    ready_for_release_candidate?: boolean;
    local_worker_manifest?: LocalWorkerManifestReport;
  };
  live_pipeline_gate?: { progress_percent: number; blocker: string; ready_for_user_runtime?: boolean; note?: string };
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
  gpu_capable: boolean | string;
  cpu_fallback: boolean;
  download_url: string | null;
  status: "PASS" | "PARTIAL" | "BLOCKED" | "FAIL" | string;
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

export type ChatKind = "local" | "saved" | "unsaved" | "private" | string;

export type SettingsTab = "general" | "audio" | "translate" | "developer";

export type LauncherChatMessage = {
  role: string;
  content: string;
  created_unix_ms: number;
};

export type LauncherChatSession = {
  schema_version: number;
  session_id: string;
  title: string;
  kind: string;
  created_unix_ms: number;
  updated_unix_ms: number;
  messages: LauncherChatMessage[];
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
