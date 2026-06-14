import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

type EngineStatus = {
  app_version: string;
  runtime_stage: string;
  lifecycle_state: string;
  cuda_policy: string;
  asr_engine: string;
  translation_engine: string;
  tts_engine: string;
  notes: string[];
};

type NativeInferenceBackendSelection = {
  backend: string;
  device: string;
  compute_type: string;
  final_runtime_allows_python: boolean;
  selected: boolean;
  reason: string;
};

type CudaProbeReport = {
  nvidia_smi_available: boolean;
  gpu_summary: string | null;
  cuda_runtime_ready: boolean;
  blocker: string | null;
};

type AdapterPlan = {
  adapter_id: string;
  selected_backend: NativeInferenceBackendSelection;
  cuda_probe: CudaProbeReport;
  ready: boolean;
  blocker: string;
};

type AudioBufferStatus = {
  target_sample_rate_hz: number;
  target_channels: number;
  max_frames: number;
  current_frames: number;
  ready_for_calibration: boolean;
  ready_for_vad: boolean;
  note: string;
};

type CalibrationFlowStatus = {
  output_path: string;
  requires_quiet_sample: boolean;
  requires_speech_sample: boolean;
  ready_to_save_profile: boolean;
  note: string;
};

type NativeBackendFileCheck = {
  file_name: string;
  found: boolean;
  found_at: string | null;
};

type NativeRuntimeFileRequirement = {
  file_name: string;
  required: boolean;
  purpose: string;
};

type NativeRuntimeFileRequirementList = {
  backend_id: string;
  device: string;
  compute_type: string;
  final_runtime_allows_python: boolean;
  files: NativeRuntimeFileRequirement[];
  note: string;
};

type ModelDirectoryCheck = {
  label: string;
  path: string;
  exists: boolean;
};

type NativeCudaBackendValidationReport = {
  backend_id: string;
  device: string;
  compute_type: string;
  nvidia_smi_available: boolean;
  dependency_checks: NativeBackendFileCheck[];
  file_requirements: NativeRuntimeFileRequirementList;
  model_directories: ModelDirectoryCheck[];
  ready: boolean;
  blocker: string;
};

type SessionStoreStatus = {
  output_dir: string;
  ready: boolean;
  note: string;
};

type RuntimeDiagnostics = {
  project_paths: {
    project_root: string;
    user_cache_dir: string;
    user_log_dir: string;
    user_saved_dir: string;
    asr_model_dir: string;
    translation_model_dir: string;
    discovery_note: string;
  };
  rust_runtime_target: string;
  final_runtime_allows_python: boolean;
  audio_device_discovery: {
    backend_id: string;
    devices: Array<{
      id: string;
      name: string;
      is_default: boolean;
      max_input_channels: number;
      max_output_channels: number;
      supports_target_format: boolean;
    }>;
    blocker: string | null;
  };
  input_preparation_status: {
    backend_id: string;
    input_device_name: string | null;
    target_sample_rate_hz: number;
    target_channels: number;
    prepared: boolean;
    running: boolean;
    note: string;
  };
  calibration_profile_status: {
    path: string;
    present: boolean;
    profile: unknown | null;
    note: string;
  };
  session_store_status: SessionStoreStatus;
  cuda_probe: CudaProbeReport;
  backend_validation: NativeCudaBackendValidationReport;
  native_inference_candidates: NativeInferenceBackendSelection[];
  asr_adapter_plan: AdapterPlan;
  translation_adapter_plan: AdapterPlan;
  cuda_backend_candidates: string[];
  blockers: string[];
};

type RuntimeSettings = {
  schema_version: number;
  language_focus_mode: string;
  source_language: string;
  target_language: string;
  voice_actor_profile_id: string;
  audio: {
    input_device_id: string | null;
    output_device_id: string | null;
    sensitivity: number;
    allow_cpu_degraded_mode: boolean;
    auto_play_translation_voice: boolean;
  };
};

type CommandResult = {
  ok: boolean;
  state: string;
  message: string;
};

type TranscriptQualityMetrics = {
  input_quality: string;
  asr_confidence: number;
  status: string;
  no_speech_probability: number;
  average_log_probability: number;
  compression_ratio: number;
  language_ok: boolean;
  notes: string;
  raw_rms: number;
  raw_peak: number;
  speech_to_noise_gap: number;
  voiced_frame_ratio: number;
  tts_status: string;
  tts_error: string;
  output_device_name: string;
  replay_error: string;
  capture_buffer_ms: number;
  endpoint_wait_ms: number;
  silence_accumulation_ms: number;
  speech_confirmation_ms: number;
};

type TranscriptReplayPaths = {
  source_audio_path: string | null;
  translated_audio_path: string | null;
  source_replay_available: boolean;
  target_voice_available: boolean;
};

type TranscriptSegmentRecord = {
  segment_id: string;
  trace_id: string;
  session_id: string;
  input_language: string;
  output_language: string;
  start_time_ms: number;
  end_time_ms: number;
  input_text: string;
  translated_text: string;
  pipeline_mode: string;
  capture_mode: string;
  asr_model_used: string;
  asr_device_used: string;
  asr_compute_type_used: string;
  translation_engine_used: string;
  model_fallback_used: boolean;
  error_message: string;
  created_at_iso: string;
  quality: TranscriptQualityMetrics;
  replay: TranscriptReplayPaths;
};

type TranscriptSessionRecord = {
  session_id: string;
  input_language: string;
  output_language: string;
  asr_model: string;
  translation_engine: string;
  created_at_iso: string;
  segments: TranscriptSegmentRecord[];
};

type TranscriptSessionReadinessReport = {
  summary: {
    session_id: string;
    segment_count: number;
    source_language: string;
    target_language: string;
    source_chars: number;
    translated_chars: number;
    completed_segments: number;
    errored_segments: number;
  };
  ready_for_preview: boolean;
  blockers: string[];
};

type SegmentBuildRequest = {
  segment_id: string;
  session_id: string;
  input_language: string | null;
  output_language: string | null;
  start_time_ms: number;
  end_time_ms: number;
  input_text: string | null;
  translated_text: string | null;
  trace_id: string | null;
  source_audio_path: string | null;
  translated_audio_path: string | null;
  pipeline_mode: string | null;
  capture_mode: string | null;
  asr_model_used: string | null;
  asr_device_used: string | null;
  asr_compute_type_used: string | null;
  translation_engine_used: string | null;
  model_fallback_used: boolean | null;
  error_message: string | null;
};

type SegmentFlowRequest = {
  capture_ready: boolean;
  session_id: string;
  next_segment_id: string;
  segment: SegmentBuildRequest;
  vad_accepted: boolean;
  asr_ready: boolean;
  translation_ready: boolean;
};

type SegmentFlowReport = {
  session_id: string;
  segment_id: string;
  ready_for_runtime_plan: boolean;
  segment: {
    valid_duration: boolean;
    duration_ms: number;
    warning: string;
    segment: TranscriptSegmentRecord;
  };
  blockers: string[];
  message: string;
};

type NativeExecutionContractResult = {
  segment_id: string;
  stage: string;
  ready_to_execute: boolean;
  execution_status: string;
  selected_model: string;
  selected_device: string;
  selected_compute_type: string;
  input_kind: string;
  input_summary: string;
  output_target: string;
  queue_wait_ms: number;
  preprocess_ms: number;
  inference_ms: number;
  postprocess_ms: number;
  total_ms: number;
  error: string;
  blocker: string;
};

type NativeStageRunnerReport = {
  asr: NativeExecutionContractResult | null;
  translation: NativeExecutionContractResult | null;
  output: NativeExecutionContractResult | null;
  ready_stage_count: number;
  blocked_stage_count: number;
  blockers: string[];
};

type NativeExecutionBridgeRequest = {
  segment_id: string;
  source_text: string | null;
  source_audio_path: string | null;
  output_audio_path: string | null;
  asr_model_path: string | null;
  translation_model_path: string | null;
  output_model_path: string | null;
  asr_backend_ready: boolean;
  translation_backend_ready: boolean;
  output_backend_ready: boolean;
  allow_cpu_degraded_mode: boolean;
};

type NativeExecutionBridgeReport = {
  segment_id: string;
  ready_for_execution: boolean;
  runner_report: NativeStageRunnerReport;
  blockers: string[];
  note: string;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("TranslateIT app root was not found.");
}

app.innerHTML = `
  <main class="shell">
    <aside class="sidebar" aria-label="TranslateIT navigation">
      <section class="brand-block">
        <div class="brand-mark">T</div>
        <div>
          <p class="eyebrow">Local AI Translator</p>
          <h1>TranslateIT</h1>
        </div>
      </section>
      <button class="sidebar-action" type="button">New Session</button>
      <nav class="nav-section" aria-label="Workspace">
        <p>Workspace</p>
        <button type="button" class="nav-item active">Live Translate</button>
        <button type="button" class="nav-item">Saved Sessions</button>
        <button type="button" class="nav-item">Diagnostics</button>
      </nav>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">Rust/Tauri Conversion Branch</p>
          <h2>Realtime Translation Console</h2>
        </div>
        <div class="badge-row" aria-label="Runtime badges">
          <span id="stageBadge" class="badge">Stage: Loading</span>
          <span id="cudaBadge" class="badge muted">CUDA: Checking</span>
          <span id="lifecycleBadge" class="badge muted">State: Idle</span>
        </div>
      </header>

      <section class="translator-card" aria-label="Translator controls">
        <div class="language-row">
          <button class="language-pill active" type="button">ID</button>
          <span class="direction">→</span>
          <button class="language-pill" type="button">EN</button>
        </div>

        <label class="input-label" for="sourceText">Source text</label>
        <textarea id="sourceText" placeholder="Type Indonesian or English here while Rust engine capture is being converted."></textarea>

        <div class="action-row">
          <button id="startButton" class="primary" type="button">Start</button>
          <button id="stopButton" class="secondary" type="button">Stop</button>
          <button id="translateButton" class="secondary" type="button">Translate Text</button>
          <button id="sessionStateButton" class="secondary" type="button">Session Check</button>
          <button id="segmentFlowButton" class="secondary" type="button">Segment Flow</button>
          <button id="executionBridgeButton" class="secondary" type="button">Execution Bridge</button>
          <button id="diagnosticsButton" class="secondary" type="button">Diagnostics</button>
          <button id="saveSettingsButton" class="secondary" type="button">Save Settings</button>
        </div>
      </section>

      <section class="output-grid" aria-label="Translation output">
        <article class="panel">
          <p class="panel-label">Original</p>
          <p id="originalOutput" class="panel-text muted-text">No input captured yet.</p>
        </article>
        <article class="panel">
          <p class="panel-label">Translation</p>
          <p id="translationOutput" class="panel-text muted-text">Rust translation adapter is not connected yet.</p>
        </article>
      </section>

      <section class="status-panel" aria-label="Engine migration status">
        <div>
          <p class="panel-label">Engine Status</p>
          <p id="statusMessage">Loading Rust command bridge...</p>
        </div>
        <ul id="statusNotes"></ul>
      </section>
    </section>
  </main>
`;

const stageBadge = document.querySelector<HTMLSpanElement>("#stageBadge");
const cudaBadge = document.querySelector<HTMLSpanElement>("#cudaBadge");
const lifecycleBadge = document.querySelector<HTMLSpanElement>("#lifecycleBadge");
const statusMessage = document.querySelector<HTMLParagraphElement>("#statusMessage");
const statusNotes = document.querySelector<HTMLUListElement>("#statusNotes");
const sourceText = document.querySelector<HTMLTextAreaElement>("#sourceText");
const originalOutput = document.querySelector<HTMLParagraphElement>("#originalOutput");
const translationOutput = document.querySelector<HTMLParagraphElement>("#translationOutput");
const startButton = document.querySelector<HTMLButtonElement>("#startButton");
const stopButton = document.querySelector<HTMLButtonElement>("#stopButton");
const translateButton = document.querySelector<HTMLButtonElement>("#translateButton");
const sessionStateButton = document.querySelector<HTMLButtonElement>("#sessionStateButton");
const segmentFlowButton = document.querySelector<HTMLButtonElement>("#segmentFlowButton");
const executionBridgeButton = document.querySelector<HTMLButtonElement>("#executionBridgeButton");
const diagnosticsButton = document.querySelector<HTMLButtonElement>("#diagnosticsButton");
const saveSettingsButton = document.querySelector<HTMLButtonElement>("#saveSettingsButton");

function requireElement<T extends Element>(element: T | null, name: string): T {
  if (!element) {
    throw new Error(`${name} was not found.`);
  }
  return element;
}

const ui = {
  stageBadge: requireElement(stageBadge, "stage badge"),
  cudaBadge: requireElement(cudaBadge, "CUDA badge"),
  lifecycleBadge: requireElement(lifecycleBadge, "lifecycle badge"),
  statusMessage: requireElement(statusMessage, "status message"),
  statusNotes: requireElement(statusNotes, "status notes"),
  sourceText: requireElement(sourceText, "source text input"),
  originalOutput: requireElement(originalOutput, "original output"),
  translationOutput: requireElement(translationOutput, "translation output"),
  startButton: requireElement(startButton, "start button"),
  stopButton: requireElement(stopButton, "stop button"),
  translateButton: requireElement(translateButton, "translate button"),
  sessionStateButton: requireElement(sessionStateButton, "session state button"),
  segmentFlowButton: requireElement(segmentFlowButton, "segment flow button"),
  executionBridgeButton: requireElement(executionBridgeButton, "execution bridge button"),
  diagnosticsButton: requireElement(diagnosticsButton, "diagnostics button"),
  saveSettingsButton: requireElement(saveSettingsButton, "save settings button"),
};

function renderList(items: string[]): void {
  ui.statusNotes.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    ui.statusNotes.append(li);
  }
}

function renderStatus(status: EngineStatus): void {
  ui.stageBadge.textContent = `Stage: ${status.runtime_stage}`;
  ui.cudaBadge.textContent = `CUDA: ${status.cuda_policy}`;
  ui.lifecycleBadge.textContent = `State: ${status.lifecycle_state}`;
  ui.statusMessage.textContent = `${status.asr_engine} / ${status.translation_engine} / ${status.tts_engine}`;
  renderList(status.notes);
}

function renderCommandResult(result: CommandResult): void {
  ui.lifecycleBadge.textContent = `State: ${result.state}`;
  ui.statusMessage.textContent = result.message;
}

function backendSummary(label: string, plan: AdapterPlan): string {
  return `${label}: backend=${plan.selected_backend.backend}, device=${plan.selected_backend.device}, compute=${plan.selected_backend.compute_type}, ready=${plan.ready}`;
}

function defaultQuality(): TranscriptQualityMetrics {
  return {
    input_quality: "Unknown",
    asr_confidence: 0,
    status: "Planned",
    no_speech_probability: 0,
    average_log_probability: 0,
    compression_ratio: 0,
    language_ok: true,
    notes: "frontend readiness draft",
    raw_rms: 0,
    raw_peak: 0,
    speech_to_noise_gap: 0,
    voiced_frame_ratio: 0,
    tts_status: "",
    tts_error: "",
    output_device_name: "",
    replay_error: "",
    capture_buffer_ms: 0,
    endpoint_wait_ms: 0,
    silence_accumulation_ms: 0,
    speech_confirmation_ms: 0,
  };
}

function emptyReplay(): TranscriptReplayPaths {
  return {
    source_audio_path: null,
    translated_audio_path: null,
    source_replay_available: false,
    target_voice_available: false,
  };
}

function buildDraftTranscriptSession(source: string): TranscriptSessionRecord {
  const sessionId = `frontend_session_${Date.now()}`;
  const createdAt = new Date().toISOString();
  const segments: TranscriptSegmentRecord[] = source
    ? [
        {
          segment_id: `${sessionId}_segment_1`,
          trace_id: "frontend-readiness",
          session_id: sessionId,
          input_language: "id",
          output_language: "en",
          start_time_ms: 0,
          end_time_ms: Math.min(8000, Math.max(500, source.length * 40)),
          input_text: source,
          translated_text: "",
          pipeline_mode: "cascaded",
          capture_mode: "Frontend Session Readiness",
          asr_model_used: "",
          asr_device_used: "",
          asr_compute_type_used: "",
          translation_engine_used: "",
          model_fallback_used: false,
          error_message: "",
          created_at_iso: createdAt,
          quality: defaultQuality(),
          replay: emptyReplay(),
        },
      ]
    : [];

  return {
    session_id: sessionId,
    input_language: "id",
    output_language: "en",
    asr_model: "large-v3-turbo",
    translation_engine: "local-nllb-distilled",
    created_at_iso: createdAt,
    segments,
  };
}

function buildSegmentRequest(session: TranscriptSessionRecord, source: string): SegmentBuildRequest {
  const segment = session.segments[0];
  return {
    segment_id: segment?.segment_id ?? `${session.session_id}_segment_1`,
    session_id: session.session_id,
    input_language: session.input_language,
    output_language: session.output_language,
    start_time_ms: segment?.start_time_ms ?? 0,
    end_time_ms: segment?.end_time_ms ?? Math.min(8000, Math.max(500, source.length * 40)),
    input_text: source || null,
    translated_text: null,
    trace_id: segment?.trace_id ?? "frontend-segment-flow",
    source_audio_path: null,
    translated_audio_path: null,
    pipeline_mode: "cascaded",
    capture_mode: "Frontend Segment Flow",
    asr_model_used: "",
    asr_device_used: "",
    asr_compute_type_used: "",
    translation_engine_used: "",
    model_fallback_used: false,
    error_message: null,
  };
}

function buildSegmentFlowRequest(
  source: string,
  diagnostics: RuntimeDiagnostics,
  bufferStatus: AudioBufferStatus,
): SegmentFlowRequest {
  const session = buildDraftTranscriptSession(source);
  const segment = buildSegmentRequest(session, source);
  const hasSource = Boolean(source);
  return {
    capture_ready: hasSource && diagnostics.input_preparation_status.prepared,
    session_id: session.session_id,
    next_segment_id: segment.segment_id,
    segment,
    vad_accepted: hasSource && bufferStatus.ready_for_vad,
    asr_ready: diagnostics.asr_adapter_plan.ready,
    translation_ready: diagnostics.translation_adapter_plan.ready,
  };
}

function buildNativeExecutionBridgeRequest(
  source: string,
  diagnostics: RuntimeDiagnostics,
  settings: RuntimeSettings,
): NativeExecutionBridgeRequest {
  const session = buildDraftTranscriptSession(source);
  const segment = session.segments[0];
  const segmentId = segment?.segment_id ?? `${session.session_id}_segment_1`;
  return {
    segment_id: segmentId,
    source_text: source || null,
    source_audio_path: null,
    output_audio_path: source ? `${diagnostics.project_paths.user_cache_dir}/frontend_bridge_output.wav` : null,
    asr_model_path: diagnostics.project_paths.asr_model_dir || null,
    translation_model_path: diagnostics.project_paths.translation_model_dir || null,
    output_model_path: null,
    asr_backend_ready: diagnostics.asr_adapter_plan.ready,
    translation_backend_ready: diagnostics.translation_adapter_plan.ready,
    output_backend_ready: false,
    allow_cpu_degraded_mode: settings.audio.allow_cpu_degraded_mode,
  };
}

function renderSessionReadiness(report: TranscriptSessionReadinessReport): void {
  ui.lifecycleBadge.textContent = report.ready_for_preview ? "State: session-ready" : "State: session-blocked";
  ui.statusMessage.textContent = `Transcript session readiness: ${report.ready_for_preview}`;
  renderList([
    `Session: ${report.summary.session_id}`,
    `Segments: ${report.summary.segment_count}`,
    `Language: ${report.summary.source_language} -> ${report.summary.target_language}`,
    `Source chars: ${report.summary.source_chars}`,
    `Translated chars: ${report.summary.translated_chars}`,
    `Completed segments: ${report.summary.completed_segments}`,
    `Errored segments: ${report.summary.errored_segments}`,
    ...report.blockers.map((blocker) => `Blocker: ${blocker}`),
  ]);
}

function renderSegmentFlow(report: SegmentFlowReport): void {
  ui.lifecycleBadge.textContent = report.ready_for_runtime_plan ? "State: segment-ready" : "State: segment-blocked";
  ui.statusMessage.textContent = report.message;
  renderList([
    `Session: ${report.session_id}`,
    `Segment: ${report.segment_id}`,
    `Duration: ${report.segment.duration_ms} ms`,
    `Valid duration: ${report.segment.valid_duration}`,
    `Ready for runtime plan: ${report.ready_for_runtime_plan}`,
    `Warning: ${report.segment.warning || "none"}`,
    ...report.blockers.map((blocker) => `Blocker: ${blocker}`),
  ]);
}

function formatBridgeStage(label: string, result: NativeExecutionContractResult | null): string[] {
  if (!result) {
    return [`${label}: not requested`];
  }
  return [
    `${label}: ${result.execution_status}`,
    `${label} ready: ${result.ready_to_execute}`,
    `${label} model: ${result.selected_model}`,
    `${label} device: ${result.selected_device}/${result.selected_compute_type}`,
    `${label} input: ${result.input_kind} ${result.input_summary}`,
    `${label} blocker: ${result.blocker || "none"}`,
  ];
}

function renderNativeExecutionBridge(report: NativeExecutionBridgeReport): void {
  ui.lifecycleBadge.textContent = report.ready_for_execution ? "State: execution-ready" : "State: execution-blocked";
  ui.statusMessage.textContent = report.note;
  renderList([
    `Segment: ${report.segment_id}`,
    `Ready for execution: ${report.ready_for_execution}`,
    `Ready stages: ${report.runner_report.ready_stage_count}`,
    `Blocked stages: ${report.runner_report.blocked_stage_count}`,
    ...formatBridgeStage("ASR", report.runner_report.asr),
    ...formatBridgeStage("Translation", report.runner_report.translation),
    ...formatBridgeStage("Output", report.runner_report.output),
    ...report.blockers.map((blocker) => `Blocker: ${blocker}`),
  ]);
}

function renderDiagnostics(
  diagnostics: RuntimeDiagnostics,
  settings: RuntimeSettings,
  bufferStatus: AudioBufferStatus,
  calibrationFlow: CalibrationFlowStatus,
): void {
  ui.lifecycleBadge.textContent = "State: diagnostics";
  ui.statusMessage.textContent = diagnostics.rust_runtime_target;
  renderList([
    `Project root: ${diagnostics.project_paths.project_root}`,
    `Cache: ${diagnostics.project_paths.user_cache_dir}`,
    `Logs: ${diagnostics.project_paths.user_log_dir}`,
    `Saved: ${diagnostics.project_paths.user_saved_dir}`,
    `Session store: ${diagnostics.session_store_status.output_dir} ready=${diagnostics.session_store_status.ready}`,
    `ASR models: ${diagnostics.project_paths.asr_model_dir}`,
    `Translation models: ${diagnostics.project_paths.translation_model_dir}`,
    `Audio backend: ${diagnostics.audio_device_discovery.backend_id}`,
    `Audio devices discovered: ${diagnostics.audio_device_discovery.devices.length}`,
    `Input prepared: ${diagnostics.input_preparation_status.prepared}`,
    `Input device: ${diagnostics.input_preparation_status.input_device_name ?? "not selected"}`,
    `Input note: ${diagnostics.input_preparation_status.note}`,
    `Audio buffer frames: ${bufferStatus.current_frames}/${bufferStatus.max_frames}`,
    `Audio buffer VAD ready: ${bufferStatus.ready_for_vad}`,
    `Audio buffer calibration ready: ${bufferStatus.ready_for_calibration}`,
    `Calibration flow output: ${calibrationFlow.output_path}`,
    `Calibration flow ready: ${calibrationFlow.ready_to_save_profile}`,
    `Calibration profile: ${diagnostics.calibration_profile_status.present} | ${diagnostics.calibration_profile_status.path}`,
    `CUDA nvidia-smi: ${diagnostics.cuda_probe.nvidia_smi_available}`,
    `CUDA GPU: ${diagnostics.cuda_probe.gpu_summary ?? "not detected"}`,
    `CUDA runtime ready: ${diagnostics.cuda_probe.cuda_runtime_ready}`,
    `Backend validation ready: ${diagnostics.backend_validation.ready}`,
    `Backend blocker: ${diagnostics.backend_validation.blocker}`,
    ...diagnostics.backend_validation.dependency_checks.map(
      (check) => `Dependency: ${check.file_name} found=${check.found} at=${check.found_at ?? "not found"}`,
    ),
    ...diagnostics.backend_validation.file_requirements.files.map(
      (file) => `Required native file: ${file.file_name} required=${file.required} purpose=${file.purpose}`,
    ),
    ...diagnostics.backend_validation.model_directories.map(
      (check) => `Model dir: ${check.label} exists=${check.exists} path=${check.path}`,
    ),
    `Final runtime allows Python: ${diagnostics.final_runtime_allows_python}`,
    `Settings: ${settings.source_language} -> ${settings.target_language}, voice=${settings.voice_actor_profile_id}`,
    backendSummary("ASR adapter plan", diagnostics.asr_adapter_plan),
    backendSummary("Translation adapter plan", diagnostics.translation_adapter_plan),
    ...diagnostics.native_inference_candidates.map(
      (candidate) => `Inference candidate: ${candidate.backend} | ${candidate.reason}`,
    ),
    ...diagnostics.cuda_backend_candidates,
    ...diagnostics.blockers,
    bufferStatus.note,
    calibrationFlow.note,
  ]);
}

async function refreshStatus(): Promise<void> {
  const status = await invoke<EngineStatus>("get_engine_status");
  renderStatus(status);
}

ui.startButton.addEventListener("click", async () => {
  const result = await invoke<CommandResult>("start_capture");
  renderCommandResult(result);
});

ui.stopButton.addEventListener("click", async () => {
  const result = await invoke<CommandResult>("stop_capture");
  renderCommandResult(result);
});

ui.translateButton.addEventListener("click", async () => {
  const source = ui.sourceText.value.trim();
  const result = await invoke<CommandResult>("translate_text", { source });
  ui.originalOutput.textContent = source || "No source text provided.";
  ui.originalOutput.classList.toggle("muted-text", !source);
  ui.translationOutput.textContent = result.message;
  ui.translationOutput.classList.remove("muted-text");
  renderCommandResult(result);
});

ui.sessionStateButton.addEventListener("click", async () => {
  const source = ui.sourceText.value.trim();
  const session = buildDraftTranscriptSession(source);
  const report = await invoke<TranscriptSessionReadinessReport>("analyze_transcript_session_state", { session });
  renderSessionReadiness(report);
});

ui.segmentFlowButton.addEventListener("click", async () => {
  const source = ui.sourceText.value.trim();
  const [diagnostics, bufferStatus] = await Promise.all([
    invoke<RuntimeDiagnostics>("get_runtime_diagnostics"),
    invoke<AudioBufferStatus>("get_audio_buffer_status"),
  ]);
  const request = buildSegmentFlowRequest(source, diagnostics, bufferStatus);
  const report = await invoke<SegmentFlowReport>("analyze_segment_flow_state", { request });
  renderSegmentFlow(report);
});

ui.executionBridgeButton.addEventListener("click", async () => {
  const source = ui.sourceText.value.trim();
  const [diagnostics, settings] = await Promise.all([
    invoke<RuntimeDiagnostics>("get_runtime_diagnostics"),
    invoke<RuntimeSettings>("load_runtime_settings"),
  ]);
  const request = buildNativeExecutionBridgeRequest(source, diagnostics, settings);
  const report = await invoke<NativeExecutionBridgeReport>("analyze_native_execution_bridge", { request });
  renderNativeExecutionBridge(report);
});

ui.diagnosticsButton.addEventListener("click", async () => {
  const [diagnostics, settings, bufferStatus, calibrationFlow] = await Promise.all([
    invoke<RuntimeDiagnostics>("get_runtime_diagnostics"),
    invoke<RuntimeSettings>("load_runtime_settings"),
    invoke<AudioBufferStatus>("get_audio_buffer_status"),
    invoke<CalibrationFlowStatus>("get_calibration_flow_status"),
  ]);
  renderDiagnostics(diagnostics, settings, bufferStatus, calibrationFlow);
});

ui.saveSettingsButton.addEventListener("click", async () => {
  const result = await invoke<CommandResult>("save_default_runtime_settings");
  renderCommandResult(result);
});

refreshStatus().catch((error: unknown) => {
  ui.statusMessage.textContent = `Rust command bridge failed: ${String(error)}`;
});
