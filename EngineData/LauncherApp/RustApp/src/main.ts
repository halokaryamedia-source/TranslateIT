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

type CommandResult = {
  ok: boolean;
  state: string;
  message: string;
};

type RuntimeDiagnostics = {
  rust_runtime_target: string;
  final_runtime_allows_python: boolean;
  project_paths: {
    project_root: string;
    user_cache_dir: string;
    user_log_dir: string;
    user_saved_dir: string;
    asr_model_dir: string;
    translation_model_dir: string;
    discovery_note: string;
  };
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
  cuda_probe: {
    nvidia_smi_available: boolean;
    gpu_summary: string | null;
    cuda_runtime_ready: boolean;
    blocker: string | null;
  };
  backend_validation: {
    backend_id: string;
    device: string;
    compute_type: string;
    ready: boolean;
    blocker: string;
  };
  asr_adapter_plan: {
    adapter_id: string;
    ready: boolean;
    blocker: string;
  };
  translation_adapter_plan: {
    adapter_id: string;
    ready: boolean;
    blocker: string;
  };
  session_store_status: {
    output_dir: string;
    ready: boolean;
    note: string;
  };
  blockers: string[];
};

type LiveCaptureStatusReport = {
  stream_active: boolean;
  owner_id: string | null;
  session_id: string | null;
  device_name: string | null;
  sample_rate_hz: number | null;
  channels: number | null;
  sample_format: string | null;
  active_age_ms: number | null;
  frames_received: number;
  callback_error_count: number;
  latest_callback_error: string | null;
  blocker: string;
  note: string;
};

type RuntimeStatusBundleReport = {
  engine_status: EngineStatus;
  readiness: {
    ready_for_start_command: boolean;
    ready_for_stop_command: boolean;
    ready_for_capture_stream_creation: boolean;
    ready_for_live_capture_runtime: boolean;
    ready_for_native_inference_runtime: boolean;
    ready_for_transcript_persistence: boolean;
    ready_for_user_facing_runtime: boolean;
    blockers: string[];
    note: string;
    diagnostics: RuntimeDiagnostics;
  };
  capture_gate: {
    ready_for_capture_start: boolean;
    stream_open_requested: boolean;
    stream_open_performed: boolean;
    active_session_present: boolean;
    blockers: string[];
    note: string;
  };
  live_capture: LiveCaptureStatusReport;
  next_action: string;
  summary: string;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("TranslateIT app root was not found.");
}

app.innerHTML = `
  <main class="app-shell">
    <aside class="sidebar" aria-label="TranslateIT navigation">
      <section class="brand-row">
        <div class="brand-mark" aria-hidden="true">T</div>
        <div>
          <p class="eyebrow">Local AI Translator</p>
          <h1>TranslateIT</h1>
        </div>
      </section>

      <button class="sidebar-action" type="button">New Chat</button>

      <nav class="nav-stack" aria-label="Workspace">
        <p class="nav-heading">Recent Chat</p>
        <button type="button" class="nav-item active">Unsaved Chat</button>
        <p class="nav-heading">Workspace</p>
        <button type="button" class="nav-item">Saved Chat</button>
      </nav>

      <section class="sidebar-footer">
        <span id="versionText">Rust/Tauri</span>
        <span id="runtimeText">Pre-validation</span>
      </section>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">Speech to Speech</p>
          <h2>Realtime Translate Console</h2>
        </div>
        <div class="status-pills" aria-label="Runtime status">
          <span id="statusPill" class="pill neutral">Checking</span>
          <span id="capturePill" class="pill neutral">Capture Pending</span>
          <span id="runtimePill" class="pill neutral">Runtime Pending</span>
        </div>
      </header>

      <section class="translator-card" aria-label="TranslateIT translator">
        <div class="language-row" aria-label="Language direction">
          <button id="sourceLanguage" class="language-pill active" type="button">ID</button>
          <span class="direction" aria-hidden="true">→</span>
          <button id="targetLanguage" class="language-pill" type="button">EN</button>
        </div>

        <label class="input-label" for="sourceText">Input Text</label>
        <textarea id="sourceText" placeholder="Type text here while speech runtime is still being prepared."></textarea>

        <div class="action-row" aria-label="Primary controls">
          <button id="startButton" class="icon-button primary" type="button" aria-label="Start recording">🎙</button>
          <button id="translateButton" class="send-button" type="button" aria-label="Translate text">➜</button>
          <button id="stopButton" class="soft-button" type="button">Stop</button>
          <button id="refreshButton" class="soft-button" type="button">Refresh</button>
        </div>
      </section>

      <section class="output-grid" aria-label="Translation output">
        <article class="output-panel">
          <p class="panel-label">Original</p>
          <p id="originalOutput" class="panel-text muted-text">No input captured yet.</p>
        </article>
        <article class="output-panel">
          <p class="panel-label">Translation</p>
          <p id="translationOutput" class="panel-text muted-text">Translation engine is not connected yet.</p>
        </article>
      </section>

      <section class="runtime-card" aria-label="Runtime readiness">
        <div>
          <p class="panel-label">Runtime Status</p>
          <p id="messageText" class="runtime-message">Loading runtime status...</p>
        </div>
        <ul id="readinessList" class="readiness-list"></ul>
      </section>

      <details class="developer-panel">
        <summary>Developer diagnostics</summary>
        <div class="developer-actions">
          <button id="diagnosticsButton" class="soft-button" type="button">Load Diagnostics</button>
        </div>
        <pre id="developerOutput">Diagnostics are hidden from the normal user flow.</pre>
      </details>
    </section>
  </main>
`;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`${selector} was not found.`);
  }
  return element;
}

const ui = {
  statusPill: requireElement<HTMLSpanElement>("#statusPill"),
  capturePill: requireElement<HTMLSpanElement>("#capturePill"),
  runtimePill: requireElement<HTMLSpanElement>("#runtimePill"),
  versionText: requireElement<HTMLSpanElement>("#versionText"),
  runtimeText: requireElement<HTMLSpanElement>("#runtimeText"),
  sourceText: requireElement<HTMLTextAreaElement>("#sourceText"),
  originalOutput: requireElement<HTMLParagraphElement>("#originalOutput"),
  translationOutput: requireElement<HTMLParagraphElement>("#translationOutput"),
  messageText: requireElement<HTMLParagraphElement>("#messageText"),
  readinessList: requireElement<HTMLUListElement>("#readinessList"),
  startButton: requireElement<HTMLButtonElement>("#startButton"),
  stopButton: requireElement<HTMLButtonElement>("#stopButton"),
  translateButton: requireElement<HTMLButtonElement>("#translateButton"),
  refreshButton: requireElement<HTMLButtonElement>("#refreshButton"),
  diagnosticsButton: requireElement<HTMLButtonElement>("#diagnosticsButton"),
  developerOutput: requireElement<HTMLPreElement>("#developerOutput"),
};

function setBusy(isBusy: boolean): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>("button")) {
    button.disabled = isBusy;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  setBusy(true);
  try {
    return args ? await invoke<T>(command, args) : await invoke<T>(command);
  } catch (error: unknown) {
    renderRuntimeMessage("Runtime command failed.", [errorMessage(error)], "bad");
    return null;
  } finally {
    setBusy(false);
  }
}

function setPill(element: HTMLSpanElement, label: string, state: "good" | "warn" | "bad" | "neutral"): void {
  element.textContent = label;
  element.className = `pill ${state}`;
}

function renderList(items: string[]): void {
  ui.readinessList.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    ui.readinessList.append(li);
  }
}

function renderRuntimeMessage(message: string, items: string[] = [], state: "good" | "warn" | "bad" | "neutral" = "neutral"): void {
  ui.messageText.textContent = message;
  ui.messageText.dataset.state = state;
  renderList(items);
}

function userFriendlyBlocker(blocker: string): string {
  const cleaned = blocker.replaceAll("_", " ").replaceAll(":", " → ");
  return cleaned.length > 160 ? `${cleaned.slice(0, 157)}...` : cleaned;
}

function firstItems(items: string[], maxItems: number): string[] {
  return items.slice(0, maxItems).map(userFriendlyBlocker);
}

function renderCommandResult(result: CommandResult): void {
  const state = result.ok ? "good" : "warn";
  setPill(ui.statusPill, result.state, state);
  renderRuntimeMessage(result.message, [], state);
}

function renderStatusBundle(bundle: RuntimeStatusBundleReport): void {
  const { engine_status, readiness, capture_gate, live_capture } = bundle;
  const runtimeReady = readiness.ready_for_user_facing_runtime;
  const liveCaptureActive = live_capture.stream_active;
  const captureReady = liveCaptureActive || capture_gate.ready_for_capture_start;
  const startReady = readiness.ready_for_start_command;
  const liveBlockers = live_capture.blocker ? [live_capture.blocker] : [];

  ui.versionText.textContent = `v${engine_status.app_version}`;
  ui.runtimeText.textContent = runtimeReady ? "Runtime ready" : liveCaptureActive ? "Listening" : "Pre-validation";

  setPill(ui.statusPill, engine_status.lifecycle_state, runtimeReady ? "good" : liveCaptureActive ? "good" : startReady ? "warn" : "neutral");
  setPill(ui.capturePill, liveCaptureActive ? "Mic Active" : captureReady ? "Capture Ready" : "Capture Pending", liveCaptureActive || captureReady ? "good" : "warn");
  setPill(ui.runtimePill, runtimeReady ? "Runtime Ready" : "Runtime Pending", runtimeReady ? "good" : "warn");

  const blockers = [...readiness.blockers, ...capture_gate.blockers, ...liveBlockers];
  const notes = [
    `Next action: ${bundle.next_action}`,
    `ASR: ${engine_status.asr_engine}`,
    `Translation: ${engine_status.translation_engine}`,
    `TTS: ${engine_status.tts_engine}`,
    `Microphone active: ${live_capture.stream_active}`,
    `Frames received: ${live_capture.frames_received}`,
    `Input device: ${live_capture.device_name ?? "not active"}`,
    ...firstItems(blockers, 8).map((item) => `Blocker: ${item}`),
  ];

  const message = liveCaptureActive ? live_capture.note : readiness.note || bundle.summary;
  renderRuntimeMessage(message, notes, runtimeReady || liveCaptureActive ? "good" : blockers.length ? "warn" : "neutral");
}

async function refreshStatus(): Promise<void> {
  const bundle = await safeInvoke<RuntimeStatusBundleReport>("get_runtime_status_bundle");
  if (bundle) {
    renderStatusBundle(bundle);
  }
}

async function startRuntime(): Promise<void> {
  const result = await safeInvoke<CommandResult>("start_capture");
  if (result) {
    renderCommandResult(result);
    await refreshStatus();
  }
}

async function stopRuntime(): Promise<void> {
  const result = await safeInvoke<CommandResult>("stop_capture");
  if (result) {
    renderCommandResult(result);
    await refreshStatus();
  }
}

async function translateText(): Promise<void> {
  const source = ui.sourceText.value.trim();
  const result = await safeInvoke<CommandResult>("translate_text", { source });
  ui.originalOutput.textContent = source || "No source text provided.";
  ui.originalOutput.classList.toggle("muted-text", !source);

  if (!result) {
    return;
  }

  ui.translationOutput.textContent = result.message;
  ui.translationOutput.classList.remove("muted-text");
  renderCommandResult(result);
}

async function loadDiagnostics(): Promise<void> {
  const [diagnostics, liveCapture] = await Promise.all([
    safeInvoke<RuntimeDiagnostics>("get_runtime_diagnostics"),
    safeInvoke<LiveCaptureStatusReport>("get_live_capture_status"),
  ]);
  if (!diagnostics) {
    return;
  }

  ui.developerOutput.textContent = JSON.stringify(
    {
      runtime_target: diagnostics.rust_runtime_target,
      final_runtime_allows_python: diagnostics.final_runtime_allows_python,
      project_paths: diagnostics.project_paths,
      audio_device: diagnostics.input_preparation_status,
      live_capture: liveCapture,
      cuda_probe: diagnostics.cuda_probe,
      backend_validation: diagnostics.backend_validation,
      asr_adapter_plan: diagnostics.asr_adapter_plan,
      translation_adapter_plan: diagnostics.translation_adapter_plan,
      session_store_status: diagnostics.session_store_status,
      blocker_count: diagnostics.blockers.length,
      blockers: diagnostics.blockers.slice(0, 20),
    },
    null,
    2,
  );
}

ui.startButton.addEventListener("click", () => {
  void startRuntime();
});

ui.stopButton.addEventListener("click", () => {
  void stopRuntime();
});

ui.translateButton.addEventListener("click", () => {
  void translateText();
});

ui.refreshButton.addEventListener("click", () => {
  void refreshStatus();
});

ui.diagnosticsButton.addEventListener("click", () => {
  void loadDiagnostics();
});

ui.sourceText.addEventListener("keydown", (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    void translateText();
  }
});

void refreshStatus();
