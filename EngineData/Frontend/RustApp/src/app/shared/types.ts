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

export type PipelinePayloadState = {
  transcript_text: string | null;
  translated_text: string | null;
  tts_text: string | null;
  transcript_available: boolean;
  translation_available: boolean;
  tts_text_available: boolean;
  tts_audio_output_path: string | null;
  audio_output_ready: boolean;
  virtual_mic_ready: boolean;
  virtual_mic_blocker: string;
  source: string;
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
  evidence_path: string | null;
  payload: PipelinePayloadState;
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
    ready_for_internal_validation: boolean;
    can_run_audio_studio_validation: boolean;
    can_run_local_worker_validation: boolean;
    blockers: string[];
    note: string;
  };
};
