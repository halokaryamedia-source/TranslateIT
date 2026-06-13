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
  calibration_profile_status: {
    path: string;
    present: boolean;
    profile: unknown | null;
    note: string;
  };
  cuda_probe: CudaProbeReport;
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

function renderDiagnostics(diagnostics: RuntimeDiagnostics, settings: RuntimeSettings): void {
  ui.lifecycleBadge.textContent = "State: diagnostics";
  ui.statusMessage.textContent = diagnostics.rust_runtime_target;
  renderList([
    `Project root: ${diagnostics.project_paths.project_root}`,
    `Cache: ${diagnostics.project_paths.user_cache_dir}`,
    `Logs: ${diagnostics.project_paths.user_log_dir}`,
    `Saved: ${diagnostics.project_paths.user_saved_dir}`,
    `ASR models: ${diagnostics.project_paths.asr_model_dir}`,
    `Translation models: ${diagnostics.project_paths.translation_model_dir}`,
    `Audio backend: ${diagnostics.audio_device_discovery.backend_id}`,
    `Audio devices discovered: ${diagnostics.audio_device_discovery.devices.length}`,
    `Calibration profile: ${diagnostics.calibration_profile_status.present} | ${diagnostics.calibration_profile_status.path}`,
    `CUDA nvidia-smi: ${diagnostics.cuda_probe.nvidia_smi_available}`,
    `CUDA GPU: ${diagnostics.cuda_probe.gpu_summary ?? "not detected"}`,
    `CUDA runtime ready: ${diagnostics.cuda_probe.cuda_runtime_ready}`,
    `Final runtime allows Python: ${diagnostics.final_runtime_allows_python}`,
    `Settings: ${settings.source_language} -> ${settings.target_language}, voice=${settings.voice_actor_profile_id}`,
    backendSummary("ASR adapter plan", diagnostics.asr_adapter_plan),
    backendSummary("Translation adapter plan", diagnostics.translation_adapter_plan),
    ...diagnostics.native_inference_candidates.map(
      (candidate) => `Inference candidate: ${candidate.backend} | ${candidate.reason}`,
    ),
    ...diagnostics.cuda_backend_candidates,
    ...diagnostics.blockers,
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

ui.diagnosticsButton.addEventListener("click", async () => {
  const [diagnostics, settings] = await Promise.all([
    invoke<RuntimeDiagnostics>("get_runtime_diagnostics"),
    invoke<RuntimeSettings>("load_runtime_settings"),
  ]);
  renderDiagnostics(diagnostics, settings);
});

ui.saveSettingsButton.addEventListener("click", async () => {
  const result = await invoke<CommandResult>("save_default_runtime_settings");
  renderCommandResult(result);
});

refreshStatus().catch((error: unknown) => {
  ui.statusMessage.textContent = `Rust command bridge failed: ${String(error)}`;
});
