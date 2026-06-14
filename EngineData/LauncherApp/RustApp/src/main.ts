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

type LocalWorkerManifestReport = {
  ok: boolean;
  worker_script_exists: boolean;
  asr_model_ready: boolean;
  realtime_translation_model_ready: boolean;
  quality_translation_model_ready: boolean;
  piper_ready: boolean;
  realtime_target_latency_ms?: number | null;
  quality_target_latency_ms?: number | null;
  worker_command_count?: number;
  blockers: string[];
  note: string;
};

type InternalValidationGateReport = {
  ready_for_owner_validation: boolean;
  ready_for_release_candidate: boolean;
  build_validation_passed: boolean;
  packaging_validation_passed: boolean;
  validation_evidence_loaded: boolean;
  blockers: string[];
  progress_percent: number;
  note: string;
  local_worker_manifest?: LocalWorkerManifestReport;
};

type RuntimeStatusBundleReport = {
  engine_status: EngineStatus;
  readiness: {
    ready_for_start_command: boolean;
    ready_for_user_facing_runtime: boolean;
    blockers: string[];
    note: string;
  };
  capture_gate: {
    ready_for_capture_start: boolean;
    blockers: string[];
    note: string;
  };
  live_capture: {
    stream_active: boolean;
    frames_received: number;
    device_name: string | null;
    blocker: string;
    note: string;
  };
  live_pipeline_gate?: {
    ready_for_user_runtime: boolean;
    progress_percent: number;
    blocker: string;
    note: string;
  };
  local_worker_manifest?: LocalWorkerManifestReport;
  internal_validation_gate?: InternalValidationGateReport;
  next_action: string;
  summary: string;
};

type RuntimeDiagnostics = {
  rust_runtime_target: string;
  final_runtime_allows_python: boolean;
  cuda_probe: {
    nvidia_smi_available: boolean;
    gpu_summary: string | null;
    cuda_runtime_ready: boolean;
    blocker: string | null;
  };
  backend_validation: {
    device: string;
    compute_type: string;
    ready: boolean;
    blocker: string;
  };
  blockers: string[];
};

type WarmupState = "pending" | "active" | "complete" | "warn";

type WarmupStep = {
  id: string;
  title: string;
  detail: string;
  progress: number;
  run: () => Promise<unknown>;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("TranslateIT app root was not found.");
}

const icons = {
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  clock: `<svg viewBox="0 0 24 24"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/></svg>`,
  file: `<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`,
  folder: `<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`,
  mic: `<svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/><path d="M8 21h8"/></svg>`,
  headphones: `<svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1z"/><path d="M20 14h-3v6h2a1 1 0 0 0 1-1z"/></svg>`,
  settings: `<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.06.07a2 2 0 0 1-3.88 0L10 20a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.07-.06a2 2 0 0 1 0-3.88L4 10a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.06-.07a2 2 0 0 1 3.88 0L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.4 9c.22.37.43.7.6 1l.07.06a2 2 0 0 1 0 3.88L20 14c-.17.3-.38.63-.6 1Z"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 9h.01M11 9h.01M15 9h.01M19 9h.01M7 13h.01M11 13h.01M15 13h.01M8 17h8"/></svg>`,
  arrowUp: `<svg viewBox="0 0 24 24"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`,
  back: `<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`,
};

function icon(name: keyof typeof icons): string {
  return `<span class="icon" aria-hidden="true">${icons[name]}</span>`;
}

app.innerHTML = `
  <section id="warmupScreen" class="warmup-screen" aria-label="TranslateIT startup warmup">
    <div class="warmup-card">
      <div class="warmup-brand">
        <div class="brand-orb">T</div>
        <div>
          <p>TRANSLATEIT</p>
          <h1>Preparing local voice translation</h1>
        </div>
      </div>
      <p id="warmupDetail" class="warmup-detail">Starting desktop shell...</p>
      <div class="warmup-meter" aria-label="Startup progress">
        <div id="warmupFill" class="warmup-fill"></div>
      </div>
      <div class="warmup-meta">
        <span id="warmupPercent">0%</span>
        <span id="warmupMode">Release-first startup</span>
      </div>
      <ol id="warmupSteps" class="warmup-steps"></ol>
    </div>
  </section>

  <main id="mainApp" class="app-shell is-hidden">
    <aside class="sidebar" aria-label="TranslateIT navigation">
      <section class="brand-row">
        <div class="brand-mark" aria-hidden="true">T</div>
        <div>
          <h1>TRANSLATEIT</h1>
          <p>Local voice translation</p>
        </div>
      </section>

      <button id="newChatButton" class="new-chat-button" type="button">${icon("plus")}<span>New Chat</span></button>

      <nav class="nav-stack" aria-label="Workspace">
        <p class="nav-heading">Recent Chat</p>
        <button type="button" class="nav-item">${icon("clock")}<span>Recent Chat</span>${icon("chevron")}</button>
        <button type="button" class="nav-item">${icon("file")}<span>Unsaved Chat</span>${icon("chevron")}</button>
        <div class="nav-divider"></div>
        <p class="nav-heading">Workspace</p>
        <button type="button" class="nav-item">${icon("folder")}<span>Saved Chat</span>${icon("chevron")}</button>
      </nav>

      <section class="account-card">
        <div class="avatar">MB</div>
        <div class="account-text">
          <strong>Local User</strong>
          <span id="userPresence">Ready</span>
        </div>
        <button id="quickMicButton" class="footer-icon" type="button" aria-label="Microphone">${icon("mic")}</button>
        <button class="footer-icon" type="button" aria-label="Voice output">${icon("headphones")}</button>
        <button id="settingsButton" class="footer-icon" type="button" aria-label="Settings">${icon("settings")}</button>
      </section>
    </aside>

    <section id="homePage" class="workspace">
      <header class="topbar">
        <div>
          <h2>Voice translation</h2>
          <p>Speak Indonesian. Get translated English voice output.</p>
        </div>
        <div class="top-actions">
          <span class="direction-pill">ID &gt; EN</span>
          <button id="recordStatusButton" class="record-pill" type="button"><span></span><strong id="recordStatusText">Ready</strong></button>
        </div>
      </header>

      <section class="hero-panel" aria-label="Main translation workspace">
        <span class="hero-kicker">Local-first voice translation</span>
        <h3 id="heroTitle">How can I help translate today?</h3>
        <p id="heroSubtitle">Type a message, or press the microphone button on the right to record speech locally.</p>

        <div class="feature-grid">
          <article class="feature-card">
            <div class="feature-icon">${icon("keyboard")}</div>
            <h4>Text input</h4>
            <p>Type or paste Indonesian text and get an English translation in the conversation.</p>
          </article>
          <article class="feature-card">
            <div class="feature-icon">${icon("mic")}</div>
            <h4>Voice input</h4>
            <p>Press the microphone button. Recording status appears while local capture is active.</p>
          </article>
        </div>

        <article id="assistantCard" class="assistant-card">
          <div class="mini-brand">T</div>
          <div>
            <strong>TranslateIT</strong>
            <p id="assistantMessage">Startup warmup completed. Local runtime status is being checked.</p>
          </div>
        </article>
      </section>

      <section class="composer-wrap" aria-label="Message composer">
        <div class="composer">
          <button class="composer-icon" type="button" aria-label="Add input">${icon("plus")}</button>
          <input id="messageInput" type="text" placeholder="Ask anything..." autocomplete="off" />
          <button id="microphoneButton" class="composer-icon emphasis" type="button" aria-label="Start voice recording">${icon("mic")}</button>
          <button id="sendButton" class="send-button" type="button" aria-label="Send message">${icon("arrowUp")}</button>
        </div>
        <p class="composer-help">Type a message, or press the microphone button on the right to record speech locally.</p>
      </section>
    </section>

    <section id="settingsPage" class="settings-page is-hidden" aria-label="TranslateIT settings">
      <header class="settings-header">
        <button id="backHomeButton" class="back-button" type="button">${icon("back")}<span>Back</span></button>
        <div>
          <h2>Settings</h2>
          <p>Simple controls for local engine, recording, voice output, and performance.</p>
        </div>
      </header>

      <div class="settings-layout">
        <nav class="settings-nav" aria-label="Settings categories">
          <button class="settings-tab active" type="button">General</button>
          <button class="settings-tab" type="button">Audio</button>
          <button class="settings-tab" type="button">AI Engine</button>
          <button class="settings-tab" type="button">Voice Output</button>
          <button class="settings-tab" type="button">Developer</button>
        </nav>

        <section class="settings-content">
          <article class="setting-section">
            <h3>Startup</h3>
            <div class="setting-row">
              <div><strong>Warmup before entering app</strong><span>Check shell, settings, audio, GPU, worker, and model manifest.</span></div>
              <span class="setting-value">Enabled</span>
            </div>
            <div class="setting-row">
              <div><strong>Engine preload strategy</strong><span>Balanced warmup keeps memory lower and loads heavy models only when needed.</span></div>
              <span class="setting-value">Balanced</span>
            </div>
          </article>

          <article class="setting-section">
            <h3>Local AI Runtime</h3>
            <div class="setting-row"><div><strong>Realtime profile</strong><span>Faster Whisper + MarianMT + Piper.</span></div><span id="realtimeStatus" class="setting-value">Checking</span></div>
            <div class="setting-row"><div><strong>Quality profile</strong><span>Faster Whisper + NLLB + Piper.</span></div><span id="qualityStatus" class="setting-value">Checking</span></div>
            <div class="setting-row"><div><strong>GPU acceleration</strong><span>CUDA is used only when detected and available.</span></div><span id="gpuStatus" class="setting-value">Checking</span></div>
          </article>

          <article class="setting-section developer-summary">
            <h3>Developer Status</h3>
            <pre id="developerOutput">Runtime status will appear here after warmup.</pre>
          </article>
        </section>
      </div>
    </section>
  </main>
`;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} was not found.`);
  return element;
}

const ui = {
  warmupScreen: requireElement<HTMLElement>("#warmupScreen"),
  warmupFill: requireElement<HTMLDivElement>("#warmupFill"),
  warmupPercent: requireElement<HTMLSpanElement>("#warmupPercent"),
  warmupDetail: requireElement<HTMLParagraphElement>("#warmupDetail"),
  warmupSteps: requireElement<HTMLOListElement>("#warmupSteps"),
  mainApp: requireElement<HTMLElement>("#mainApp"),
  homePage: requireElement<HTMLElement>("#homePage"),
  settingsPage: requireElement<HTMLElement>("#settingsPage"),
  settingsButton: requireElement<HTMLButtonElement>("#settingsButton"),
  backHomeButton: requireElement<HTMLButtonElement>("#backHomeButton"),
  messageInput: requireElement<HTMLInputElement>("#messageInput"),
  sendButton: requireElement<HTMLButtonElement>("#sendButton"),
  microphoneButton: requireElement<HTMLButtonElement>("#microphoneButton"),
  quickMicButton: requireElement<HTMLButtonElement>("#quickMicButton"),
  recordStatusButton: requireElement<HTMLButtonElement>("#recordStatusButton"),
  recordStatusText: requireElement<HTMLElement>("#recordStatusText"),
  assistantMessage: requireElement<HTMLParagraphElement>("#assistantMessage"),
  heroTitle: requireElement<HTMLHeadingElement>("#heroTitle"),
  heroSubtitle: requireElement<HTMLParagraphElement>("#heroSubtitle"),
  realtimeStatus: requireElement<HTMLSpanElement>("#realtimeStatus"),
  qualityStatus: requireElement<HTMLSpanElement>("#qualityStatus"),
  gpuStatus: requireElement<HTMLSpanElement>("#gpuStatus"),
  developerOutput: requireElement<HTMLPreElement>("#developerOutput"),
  userPresence: requireElement<HTMLSpanElement>("#userPresence"),
};

let latestBundle: RuntimeStatusBundleReport | null = null;
let latestDiagnostics: RuntimeDiagnostics | null = null;
let recording = false;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    return args ? await invoke<T>(command, args) : await invoke<T>(command);
  } catch (error) {
    console.warn(`TranslateIT command failed: ${command}`, error);
    return null;
  }
}

function updateWarmup(progress: number, detail: string): void {
  ui.warmupFill.style.width = `${progress}%`;
  ui.warmupPercent.textContent = `${progress}%`;
  ui.warmupDetail.textContent = detail;
}

function renderWarmupSteps(steps: WarmupStep[], activeIndex = -1, states = new Map<string, WarmupState>()): void {
  ui.warmupSteps.innerHTML = "";
  steps.forEach((step, index) => {
    const li = document.createElement("li");
    const state = states.get(step.id) ?? (index === activeIndex ? "active" : "pending");
    li.className = `warmup-step ${state}`;
    li.innerHTML = `<span></span><div><strong>${step.title}</strong><p>${step.detail}</p></div>`;
    ui.warmupSteps.append(li);
  });
}

function workerManifest(bundle: RuntimeStatusBundleReport | null): LocalWorkerManifestReport | null {
  return bundle?.local_worker_manifest ?? bundle?.internal_validation_gate?.local_worker_manifest ?? null;
}

function modelReadyText(value: boolean): string {
  return value ? "Ready" : "Needs setup";
}

function setRecordingState(active: boolean): void {
  recording = active;
  document.body.classList.toggle("is-recording", active);
  ui.recordStatusText.textContent = active ? "Recording" : "Ready";
  ui.microphoneButton.setAttribute("aria-label", active ? "Stop recording" : "Start voice recording");
}

function renderRuntime(bundle: RuntimeStatusBundleReport | null, diagnostics: RuntimeDiagnostics | null): void {
  latestBundle = bundle;
  latestDiagnostics = diagnostics;
  const worker = workerManifest(bundle);
  const active = Boolean(bundle?.live_capture.stream_active);
  setRecordingState(active);

  if (!bundle) {
    ui.assistantMessage.textContent = "Runtime status is not available yet. Open Settings for diagnostics after build validation.";
    ui.userPresence.textContent = "Checking";
    return;
  }

  const readiness = bundle.internal_validation_gate?.progress_percent ?? bundle.live_pipeline_gate?.progress_percent ?? 0;
  const allModelsReady = Boolean(worker?.asr_model_ready && worker.realtime_translation_model_ready && worker.quality_translation_model_ready && worker.piper_ready);
  const appReady = Boolean(worker?.ok || bundle.readiness.ready_for_user_facing_runtime || allModelsReady);
  const blockers = [
    ...bundle.readiness.blockers,
    ...bundle.capture_gate.blockers,
    ...(worker?.blockers ?? []),
    ...(bundle.internal_validation_gate?.blockers ?? []),
  ].filter(Boolean);

  ui.userPresence.textContent = appReady ? "Ready" : "Setup needed";
  ui.heroTitle.textContent = active ? "Listening locally..." : "How can I help translate today?";
  ui.heroSubtitle.textContent = active
    ? "Speak now. The local capture runtime is active. Translation output will appear when the pipeline is ready."
    : "Type a message, or press the microphone button on the right to record speech locally.";

  ui.assistantMessage.textContent = appReady
    ? "Local runtime warmup completed. You can start typing or record speech."
    : `Warmup completed, but setup is not fully ready yet. ${blockers[0] ? blockers[0].replaceAll("_", " ") : bundle.next_action}`;

  ui.realtimeStatus.textContent = worker ? modelReadyText(worker.asr_model_ready && worker.realtime_translation_model_ready && worker.piper_ready) : "Checking";
  ui.qualityStatus.textContent = worker ? modelReadyText(worker.asr_model_ready && worker.quality_translation_model_ready && worker.piper_ready) : "Checking";
  ui.gpuStatus.textContent = diagnostics?.cuda_probe.cuda_runtime_ready ? "CUDA ready" : diagnostics?.cuda_probe.gpu_summary ? "GPU detected" : "CPU fallback";

  ui.developerOutput.textContent = JSON.stringify(
    {
      app_version: bundle.engine_status.app_version,
      lifecycle: bundle.engine_status.lifecycle_state,
      warmup_progress: readiness,
      local_worker: worker,
      recording_active: active,
      frames_received: bundle.live_capture.frames_received,
      input_device: bundle.live_capture.device_name,
      cuda: diagnostics?.cuda_probe,
      next_action: bundle.next_action,
      blockers: blockers.slice(0, 12),
    },
    null,
    2,
  );
}

function showSettings(): void {
  ui.homePage.classList.add("is-hidden");
  ui.settingsPage.classList.remove("is-hidden");
}

function showHome(): void {
  ui.settingsPage.classList.add("is-hidden");
  ui.homePage.classList.remove("is-hidden");
}

async function startOrStopRecording(): Promise<void> {
  if (recording) {
    const result = await call<CommandResult>("stop_capture");
    ui.assistantMessage.textContent = result?.message ?? "Recording stopped.";
  } else {
    const result = await call<CommandResult>("start_capture");
    ui.assistantMessage.textContent = result?.message ?? "Recording started. Waiting for local capture status.";
  }
  const bundle = await call<RuntimeStatusBundleReport>("get_runtime_status_bundle");
  renderRuntime(bundle, latestDiagnostics);
}

async function submitText(): Promise<void> {
  const source = ui.messageInput.value.trim();
  if (!source) return;
  ui.messageInput.value = "";
  ui.assistantMessage.textContent = "Translating text locally...";
  const result = await call<CommandResult>("translate_text", { source });
  if (!result) {
    ui.assistantMessage.textContent = "Translation command failed. Open Settings > Developer for diagnostics.";
    return;
  }
  ui.assistantMessage.textContent = result.ok ? result.message : result.message;
}

async function runWarmup(): Promise<void> {
  const states = new Map<string, WarmupState>();
  const steps: WarmupStep[] = [
    { id: "shell", title: "Desktop shell", detail: "Starting Rust/Tauri window and local app route.", progress: 12, run: () => call<EngineStatus>("get_engine_status") },
    { id: "settings", title: "User settings", detail: "Loading local runtime settings without starting heavy engines.", progress: 24, run: () => call("load_runtime_settings") },
    { id: "audio", title: "Audio devices", detail: "Scanning microphone and playback readiness.", progress: 38, run: () => call("get_runtime_diagnostics") },
    { id: "gpu", title: "GPU policy", detail: "Checking CUDA availability and safe CPU fallback.", progress: 52, run: () => call("validate_native_cuda_backend") },
    { id: "assets", title: "Model assets", detail: "Checking ASR, translation, and Piper asset manifests.", progress: 68, run: () => call("get_runtime_status_bundle") },
    { id: "worker", title: "Local AI worker", detail: "Verifying worker manifest and supported commands without forcing recording.", progress: 84, run: () => call("get_runtime_status_bundle") },
    { id: "ui", title: "Interface", detail: "Preparing main workspace and settings page.", progress: 100, run: async () => Promise.resolve(true) },
  ];

  renderWarmupSteps(steps, 0, states);

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    states.set(step.id, "active");
    renderWarmupSteps(steps, index, states);
    updateWarmup(step.progress, step.detail);
    const result = await step.run();
    states.set(step.id, result === null ? "warn" : "complete");
    renderWarmupSteps(steps, index, states);
    await new Promise((resolve) => window.setTimeout(resolve, 180));
  }

  const [bundle, diagnostics] = await Promise.all([
    call<RuntimeStatusBundleReport>("get_runtime_status_bundle"),
    call<RuntimeDiagnostics>("get_runtime_diagnostics"),
  ]);
  renderRuntime(bundle, diagnostics);

  ui.warmupScreen.classList.add("is-hidden");
  ui.mainApp.classList.remove("is-hidden");
}

ui.settingsButton.addEventListener("click", showSettings);
ui.backHomeButton.addEventListener("click", showHome);
ui.microphoneButton.addEventListener("click", () => void startOrStopRecording());
ui.quickMicButton.addEventListener("click", () => void startOrStopRecording());
ui.recordStatusButton.addEventListener("click", () => void startOrStopRecording());
ui.sendButton.addEventListener("click", () => void submitText());
ui.messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void submitText();
  }
});

void runWarmup().catch((error: unknown) => {
  updateWarmup(100, `Warmup finished with warning: ${errorMessage(error)}`);
  ui.warmupScreen.classList.add("is-hidden");
  ui.mainApp.classList.remove("is-hidden");
});
