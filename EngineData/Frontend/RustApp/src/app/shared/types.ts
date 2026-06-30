export type JsonObject = Record<string, unknown>;
export type LooseRecord = Record<string, any>;

export type CommandResult = { ok: boolean; state: string; message: string; [key: string]: any };

export type RuntimeCommandError = {
  command: string;
  message: string;
  occurred_at: string;
};

export type SettingsTab = "runtime" | "audio" | "translate" | "developer" | string;
export type ChatKind = "translation" | "developer" | "general" | string;

export type RuntimeSettings = {
  schema_version?: number;
  language_focus_mode?: string;
  runtime_profile: string;
  source_language: string;
  target_language: string;
  audio: {
    input_device_id: string | null;
    output_device_id: string | null;
    sensitivity?: number;
    input_sensitivity?: string;
    show_advanced_devices?: boolean;
    allow_low_but_usable_input?: boolean;
    allow_cpu_degraded_mode?: boolean;
    auto_play_translation_voice?: boolean;
    auto_play_out_voice?: boolean;
    use_custom_voice_actor?: boolean;
    voice_actor_profiles_root?: string;
    [key: string]: any;
  };
  voice_actor_profile_id?: string;
  [key: string]: any;
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
  [key: string]: any;
};

export type RuntimeDiagnostics = {
  cuda_probe: {
    nvidia_smi_available: boolean;
    gpu_summary: string | null;
    cuda_runtime_ready: boolean;
    blocker: string | null;
    [key: string]: any;
  };
  backend_validation: { ready: boolean; blocker: string; [key: string]: any };
  blockers: string[];
  [key: string]: any;
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
  [key: string]: any;
};

export type HelperBridgeActionResult = {
  ok: boolean;
  state: string;
  message: string;
  generation_token: number;
  runtime_claim: string;
  [key: string]: any;
};

export type HelperBridgeWorkerResponse = {
  ok: boolean;
  state: string;
  task: string;
  message: string;
  generation_token: number;
  runtime_claim: string;
  worker_response_json: string;
  [key: string]: any;
};

export type HelperBridgeRequest = {
  task: string;
  payload_json?: string | null;
  [key: string]: any;
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
  [key: string]: any;
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
  [key: string]: any;
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
  [key: string]: any;
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
  [key: string]: any;
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
  [key: string]: any;
};

export type PipelinePayloadState = {
  transcript_text?: string | null;
  translated_text?: string | null;
  tts_text?: string | null;
  transcript_available?: boolean;
  translation_available?: boolean;
  tts_text_available?: boolean;
  tts_audio_output_path?: string | null;
  audio_output_ready?: boolean;
  virtual_mic_ready?: boolean;
  virtual_mic_route_ready?: boolean;
  virtual_mic_output_device?: string | null;
  virtual_mic_input_device?: string | null;
  virtual_mic_blocker?: string;
  virtual_mic_route_claim?: string;
  virtual_mic_route_preference_path?: string | null;
  source?: string;
  updated_unix_ms?: number;
  [key: string]: any;
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
  evidence_path?: string | null;
  payload: PipelinePayloadState;
  stages: PipelineHandoffRequestStatus[];
  updated_unix_ms: number;
  [key: string]: any;
};

export type LiveMeetingRuntimeGateStatus = {
  ready: boolean;
  state: string;
  progress_percent: number;
  blockers: string[];
  next_action: string;
  summary: string;
  capture_ready: boolean;
  asr_ready: boolean;
  transcript_ready: boolean;
  translation_ready: boolean;
  tts_ready: boolean;
  audio_output_ready: boolean;
  virtual_mic_ready: boolean;
  virtual_mic_route_ready: boolean;
  virtual_mic_output_device: string | null;
  virtual_mic_input_device: string | null;
  evidence_path: string | null;
  runtime_claim: string;
  updated_unix_ms: number;
  [key: string]: any;
};

export type VirtualMicRouteContractStatus = {
  ok: boolean;
  route_ready: boolean;
  selected_output_device: string | null;
  selected_input_device: string | null;
  preferred_output_device: string | null;
  preferred_input_device: string | null;
  output_device_found: boolean;
  input_device_found: boolean;
  preference_persisted: boolean;
  preference_path: string | null;
  evidence_path: string | null;
  route_output_contract_json: string;
  available_output_devices: string[];
  available_input_devices: string[];
  blocker: string;
  next_action: string;
  runtime_claim: string;
  updated_unix_ms: number;
  [key: string]: any;
};

export type VirtualMicOutputRouteRuntimeStubStatus = {
  ok: boolean;
  route_stub_ready: boolean;
  source_audio_path: string | null;
  selected_output_device: string | null;
  selected_input_device: string | null;
  route_ready: boolean;
  source_audio_ready: boolean;
  blocker: string;
  next_action: string;
  runtime_claim: string;
  route_output_contract_json: string;
  evidence_path: string | null;
  updated_unix_ms: number;
  [key: string]: any;
};

export type ProfessionalRuntimeReadinessGateStatus = {
  ok: boolean;
  state: string;
  progress_percent: number;
  blockers: string[];
  next_action: string;
  summary: string;
  live_gate: LiveMeetingRuntimeGateStatus;
  route_stub: VirtualMicOutputRouteRuntimeStubStatus;
  source_audio_path_ready: boolean;
  route_stub_ready: boolean;
  route_stub_source_audio_path: string | null;
  route_stub_evidence_path: string | null;
  route_stub_blocker: string;
  runtime_claim: string;
  updated_unix_ms: number;
  [key: string]: any;
};

export type ProfessionalSourceOrchestrationStep = {
  name: string;
  ready: boolean;
  blocker: string;
  next_action: string;
  [key: string]: any;
};

export type ProfessionalSourceReadinessOrchestrationStatus = {
  ok: boolean;
  state: string;
  development_progress_percent_excluding_ci_local: number;
  remaining_development_gaps: string[];
  steps: ProfessionalSourceOrchestrationStep[];
  pipeline_snapshot: LivePipelineSessionSnapshot;
  route_status: VirtualMicRouteContractStatus;
  route_stub: VirtualMicOutputRouteRuntimeStubStatus;
  professional_gate: ProfessionalRuntimeReadinessGateStatus;
  next_action: string;
  summary: string;
  runtime_claim: string;
  updated_unix_ms: number;
  [key: string]: any;
};

export type AudioStudioValidationEvidence = {
  ok: boolean;
  stage: string;
  blocker?: string;
  evidence_dir?: string;
  summary_path?: string;
  log_path?: string | null;
  evidence_unix_ms?: number;
  summary?: LooseRecord;
  [key: string]: any;
};

export type AudioDeviceSummary = {
  name: string;
  is_default?: boolean;
  [key: string]: any;
};

export type AudioDeviceListReport = {
  ok: boolean;
  input_devices: AudioDeviceSummary[];
  output_devices: AudioDeviceSummary[];
  blocker?: string;
  note?: string;
  [key: string]: any;
};

export type InputPreparationStatus = {
  ready?: boolean;
  prepared?: boolean;
  selected_device_name?: string | null;
  input_device_name?: string | null;
  device_count?: number;
  blocker?: string;
  note?: string;
  [key: string]: any;
};

export type HardwareMetric = {
  label: string;
  percent: number | null;
  status: string;
  detail: string;
  [key: string]: any;
};

export type HardwareUsageReport = {
  cpu: HardwareMetric;
  ram: HardwareMetric;
  gpu: HardwareMetric;
  note: string;
  [key: string]: any;
};

export type GpuPolicyReport = {
  ok: boolean;
  status: string;
  cuda_available: boolean;
  gpu_primary: boolean;
  cpu_fallback_active: boolean;
  preferred_backend: string;
  notes: string[];
  note?: string;
  fallback_label?: string;
  blocker: string;
  blockers?: string[];
  [key: string]: any;
};

export type LocalWorkerManifestReport = {
  ok: boolean;
  runtime_manifest_exists?: boolean;
  runtime_manifest_valid?: boolean;
  asr_model_ready?: boolean;
  asr_backup_model_ready?: boolean;
  realtime_translation_model_ready?: boolean;
  quality_translation_model_ready?: boolean;
  piper_ready?: boolean;
  sapi_ready?: boolean;
  tts_default_ready?: boolean;
  voice_actor_marcel_ready?: boolean;
  voice_actor_path?: string | null;
  torch_cuda_available?: boolean;
  ctranslate2_cuda_available?: boolean;
  blockers: string[];
  warnings?: string[];
  tts_blockers?: string[];
  note: string;
  [key: string]: any;
};

export type RuntimeStatusBundleReport = {
  engine_status: EngineStatus;
  readiness: LooseRecord;
  capture_gate: LooseRecord;
  live_capture: LooseRecord;
  next_action?: string;
  live_pipeline_gate?: LooseRecord;
  live_meeting_runtime_gate?: LiveMeetingRuntimeGateStatus;
  live_audio_buffer?: LooseRecord;
  live_target_segment?: LooseRecord;
  live_asr_boundary?: LooseRecord;
  native_asr_decoder?: LooseRecord;
  live_translation_boundary?: LooseRecord;
  live_tts_boundary?: LooseRecord;
  local_worker_manifest?: LocalWorkerManifestReport;
  internal_validation_gate?: LooseRecord & {
    ready_for_internal_validation?: boolean;
    can_run_audio_studio_validation?: boolean;
    can_run_local_worker_validation?: boolean;
    blockers?: string[];
    note?: string;
    progress_percent?: number;
    local_worker_manifest?: LocalWorkerManifestReport;
  };
  [key: string]: any;
};

export type RealtimeStatusPayload = LooseRecord & {
  ok?: boolean;
  state?: string;
  summary?: string;
  runtime_status?: RuntimeStatusBundleReport;
  gpu_policy?: GpuPolicyReport;
  updated_unix_ms?: number;
};

export type ModelInventoryReport = LooseRecord & {
  ok?: boolean;
  blockers?: string[];
  warnings?: string[];
  note?: string;
};

export type ModelSetupReport = LooseRecord & {
  ok?: boolean;
  blockers?: string[];
  warnings?: string[];
  note?: string;
};

export type VoiceCapturePreparationReport = {
  ok: boolean;
  state: string;
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
  [key: string]: any;
};

export type LauncherChatMessage = {
  id?: string;
  role: "user" | "assistant" | string;
  content: string;
  created_at?: string;
  [key: string]: any;
};

export type LauncherChatSession = {
  id: string;
  kind: ChatKind;
  title?: string;
  messages?: LauncherChatMessage[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type LauncherChatSummary = {
  id: string;
  kind: ChatKind;
  title?: string;
  message_count?: number;
  updated_at?: string;
  [key: string]: any;
};

export type LauncherChatActionResult = {
  ok: boolean;
  state: string;
  message: string;
  session?: LauncherChatSession | null;
  [key: string]: any;
};

export type UserFlowTraceEvent = {
  name?: string;
  label?: string;
  detail?: LooseRecord;
  at?: string;
  [key: string]: any;
};
