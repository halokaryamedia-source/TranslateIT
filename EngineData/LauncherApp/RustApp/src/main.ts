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

type CommandResult = { ok: boolean; state: string; message: string };

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
  readiness: { ready_for_start_command: boolean; ready_for_user_facing_runtime: boolean; blockers: string[]; note: string };
  capture_gate: { ready_for_capture_start: boolean; blockers: string[]; note: string };
  live_capture: { stream_active: boolean; frames_received: number; device_name: string | null; blocker: string; note: string };
  live_pipeline_gate?: { ready_for_user_runtime: boolean; progress_percent: number; blocker: string; note: string };
  local_worker_manifest?: LocalWorkerManifestReport;
  internal_validation_gate?: InternalValidationGateReport;
  next_action: string;
  summary: string;
};

type RuntimeDiagnostics = {
  rust_runtime_target: string;
  final_runtime_allows_python: boolean;
  cuda_probe: { nvidia_smi_available: boolean; gpu_summary: string | null; cuda_runtime_ready: boolean; blocker: string | null };
  backend_validation: { device: string; compute_type: string; ready: boolean; blocker: string };
  blockers: string[];
};

type WarmupState = "pending" | "active" | "complete" | "warn";
type WarmupStep = { id: string; title: string; detail: string; progress: number; run: () => Promise<unknown> };

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("TranslateIT app root was not found.");

const icons = {
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`,
  file: `<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/></svg>`,
  folder: `<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v9H3z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6z"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24"><path d="M8 10l4 4 4-4"/></svg>`,
  mic: `<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>`,
  micOff: `<svg viewBox="0 0 24 24"><path d="M9.5 4.5A3 3 0 0 1 15 6v4.5"/><path d="M9 9.5V12a3 3 0 0 0 4.2 2.75"/><path d="M5 11a7 7 0 0 0 10.4 6.1"/><path d="M19 11a7 7 0 0 1-1.2 3.9"/><path d="M12 18v3M9 21h6M4 4l16 16"/></svg>`,
  headphonesOff: `<svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 12.4-6.7"/><path d="M20 14v-2c0-1.1-.2-2.1-.6-3"/><path d="M4 14h4v6H6a2 2 0 0 1-2-2z"/><path d="M17 14h3v4"/><path d="M4 4l16 16"/></svg>`,
  settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.9-1.1L14.3 3h-4.6l-.4 2.9A7 7 0 0 0 7.5 7L5.1 6l-2 3.4 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.1l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.9 1.1l.4 2.9h4.6l.4-2.9a7 7 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.5A7 7 0 0 0 19 12z"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h.01M11 9h.01M15 9h.01M7 13h.01M11 13h.01M15 13h.01M8 17h8"/></svg>`,
  arrowUp: `<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>`,
  back: `<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a5 5 0 0 1 0 6M19 7a9 9 0 0 1 0 10"/></svg>`,
  sliders: `<svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>`,
  translate: `<svg viewBox="0 0 24 24"><path d="M4 5h9M9 5v14M5 9c1.2 3.8 4.1 6.4 8 8"/><path d="M14 19l4-9 4 9M15.5 16h5"/></svg>`,
  code: `<svg viewBox="0 0 24 24"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/></svg>`,
  swap: `<svg viewBox="0 0 24 24"><path d="M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>`,
};

function icon(name: keyof typeof icons): string {
  return `<span class="icon" aria-hidden="true">${icons[name]}</span>`;
}

app.innerHTML = `
  <section id="warmupScreen" class="warmup-screen" aria-label="TranslateIT startup warmup">
    <div class="warmup-card">
      <div class="warmup-brand"><div class="brand-orb">T</div><div><p>TRANSLATEIT</p><h1>Preparing local voice translation</h1></div></div>
      <p id="warmupDetail" class="warmup-detail">Starting desktop shell...</p>
      <div class="warmup-meter"><div id="warmupFill" class="warmup-fill"></div></div>
      <div class="warmup-meta"><span id="warmupPercent">0%</span><span id="warmupMode">Release-first startup</span></div>
      <ol id="warmupSteps" class="warmup-steps"></ol>
    </div>
  </section>

  <main id="mainApp" class="app-shell is-hidden">
    <aside class="sidebar" aria-label="TranslateIT navigation">
      <section class="brand-row"><div class="brand-mark">T</div><div><h1>TRANSLATEIT</h1><p>Local voice translation</p></div></section>
      <button id="newChatButton" class="new-chat-button" type="button">${icon("plus")}<span>New Chat</span></button>
      <nav class="nav-stack" aria-label="Workspace">
        <p class="nav-heading">Recent Chat</p>
        <button type="button" class="nav-item">${icon("clock")}<span>Recent Chat</span>${icon("chevron")}</button>
        <button type="button" class="nav-item">${icon("file")}<span>Unsaved Chat</span>${icon("chevron")}</button>
        <div class="nav-divider"></div>
        <p class="nav-heading">Workspace</p>
        <button type="button" class="nav-item">${icon("folder")}<span>Saved Chat</span>${icon("chevron")}</button>
        <button type="button" class="nav-item">${icon("shield")}<span>Local Data</span>${icon("chevron")}</button>
      </nav>
      <section class="account-card" aria-label="User and audio controls">
        <div class="avatar">HK</div><div class="account-text"><strong>Marcel Berc...</strong><span id="userPresence">Invisible</span></div>
        <div class="account-actions">
          <button id="quickMicButton" class="footer-icon danger" type="button" aria-label="Mute microphone">${icon("micOff")}</button>
          <button class="footer-dropdown danger" type="button" aria-label="Microphone options">${icon("chevron")}</button>
          <button class="footer-icon danger" type="button" aria-label="Disable voice output">${icon("headphonesOff")}</button>
          <button class="footer-dropdown danger" type="button" aria-label="Voice output options">${icon("chevron")}</button>
          <button id="settingsButton" class="footer-icon settings-action" type="button" aria-label="Settings">${icon("settings")}</button>
        </div>
      </section>
    </aside>

    <section id="homePage" class="workspace">
      <header class="topbar"><div><h2>Voice translation</h2><p>Speak Indonesian. Get translated English voice output.</p></div><div class="top-actions"><span class="direction-pill">ID &gt; EN</span><button id="recordStatusButton" class="record-pill" type="button"><span></span><strong id="recordStatusText">Ready</strong></button></div></header>
      <section class="hero-panel" aria-label="Main translation workspace">
        <span class="hero-kicker">Local-first voice translation</span>
        <h3 id="heroTitle">How can I help translate today?</h3>
        <p id="heroSubtitle">Type a message, or press the microphone button on the right to record speech locally.</p>
        <div class="feature-grid">
          <article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("keyboard")}</div><h4>Text input</h4></div><p>Type or paste Indonesian text and get an English translation in the conversation.</p></article>
          <article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("mic")}</div><h4>Voice input</h4></div><p>Press the microphone button. A recording indicator appears while voice capture is active.</p></article>
        </div>
        <article id="assistantCard" class="assistant-card"><div class="mini-brand">T</div><div><strong>TranslateIT</strong><p id="assistantMessage">Startup warmup completed. Local runtime status is being checked.</p></div></article>
      </section>
      <section class="composer-wrap" aria-label="Message composer"><div class="composer"><button class="composer-icon" type="button" aria-label="Add input">${icon("plus")}</button><input id="messageInput" type="text" placeholder="Ask anything..." autocomplete="off" /><button id="microphoneButton" class="composer-icon emphasis" type="button" aria-label="Start voice recording">${icon("mic")}</button><button id="sendButton" class="send-button" type="button" aria-label="Send message">${icon("arrowUp")}</button></div><p class="composer-help">Type a message, or press the microphone button on the right to record speech locally.</p></section>
    </section>

    <section id="settingsPage" class="settings-page is-hidden" aria-label="TranslateIT settings">
      <aside class="settings-sidebar" aria-label="Settings categories">
        <h2>Settings</h2>
        <nav class="settings-nav-v22">
          <button type="button" class="settings-nav-item">${icon("sliders")}<span>General</span></button>
          <button type="button" class="settings-nav-item">${icon("speaker")}<span>Audio</span></button>
          <button type="button" class="settings-nav-item active">${icon("translate")}<span>Translate</span></button>
          <button type="button" class="settings-nav-item">${icon("code")}<span>Developer</span></button>
        </nav>
      </aside>

      <section class="settings-workspace-v22">
        <header class="settings-topbar-v22"><button id="backHomeButton" class="settings-back-button" type="button">${icon("back")}<span>Back</span></button></header>
        <div class="settings-scroll-v22">
          <section class="settings-page-title"><h2>Translate</h2><p>Configure language direction, translation speed, and output behavior.</p></section>

          <article class="audio-card-v22" style="min-height:190px;margin-top:54px;padding:48px 74px;">
            <div style="display:grid;grid-template-columns:500px 72px 500px;align-items:end;column-gap:50px;">
              <div class="audio-field-group"><h3>Source Language</h3><button type="button" class="select-field-v22" style="grid-template-columns:minmax(0,1fr) 20px;"> <span>Indonesian</span>${icon("chevron")}</button></div>
              <button type="button" class="select-field-v22" style="width:72px;height:62px;grid-template-columns:1fr;place-items:center;padding:0;border-radius:18px;">${icon("swap")}</button>
              <div class="audio-field-group"><h3>Target Language</h3><button type="button" class="select-field-v22" style="grid-template-columns:minmax(0,1fr) 20px;"><span>English</span>${icon("chevron")}</button></div>
            </div>
          </article>

          <section class="settings-page-title secondary" style="margin-top:84px;"><h2>Realtime</h2><p>Choose how TranslateIT balances speed and translation quality.</p></section>
          <article class="voice-card-v22" style="min-height:166px;padding:50px 74px;">
            <div class="voice-grid-v22">
              <label class="radio-row-v22 active" style="margin-top:0;"><span></span><strong>Fast</strong><em>Prioritize low latency for live voice translation.</em></label>
              <label class="radio-row-v22" style="margin-top:0;"><span></span><strong>Quality</strong><em>Prefer better translation quality when response time is less critical.</em></label>
            </div>
          </article>

          <section class="settings-page-title secondary" style="margin-top:84px;"><h2>Translate Output</h2><p>Choose which output should appear after translation completes.</p></section>
          <article class="voice-card-v22" style="min-height:176px;padding:48px 74px;">
            <div class="voice-grid-v22">
              <section style="position:relative;display:grid;grid-template-columns:24px minmax(0,1fr) 72px;column-gap:22px;align-items:start;">
                ${icon("fileText")}
                <div><h3>Transcript</h3><p>Show translated text in the conversation.</p></div>
                <span style="display:block;width:72px;height:36px;border-radius:18px;background:#d6dbe3;position:relative;margin-top:4px;"><i style="position:absolute;right:4px;top:4px;width:28px;height:28px;border-radius:50%;background:#11141a;"></i></span>
              </section>
              <section style="position:relative;display:grid;grid-template-columns:24px minmax(0,1fr) 72px;column-gap:22px;align-items:start;">
                ${icon("speaker")}
                <div><h3>Voice</h3><p>Play translated English voice automatically.</p></div>
                <span style="display:block;width:72px;height:36px;border-radius:18px;background:#d6dbe3;position:relative;margin-top:4px;"><i style="position:absolute;right:4px;top:4px;width:28px;height:28px;border-radius:50%;background:#11141a;"></i></span>
              </section>
            </div>
          </article>

          <section class="settings-page-title secondary"><h2>Advanced Translate Setting</h2></section>
          <article class="advanced-empty-v22"></article>
          <div class="runtime-sinks" aria-hidden="true"><span id="realtimeStatus">Checking</span><span id="qualityStatus">Checking</span><span id="gpuStatus">Checking</span><pre id="developerOutput">Runtime status will appear here after warmup.</pre></div>
        </div>
      </section>
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

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  try { return args ? await invoke<T>(command, args) : await invoke<T>(command); }
  catch (error) { console.warn(`TranslateIT command failed: ${command}`, error); return null; }
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

function modelReadyText(value: boolean): string { return value ? "Ready" : "Needs setup"; }

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

  const allModelsReady = Boolean(worker?.asr_model_ready && worker.realtime_translation_model_ready && worker.quality_translation_model_ready && worker.piper_ready);
  const appReady = Boolean(worker?.ok || bundle.readiness.ready_for_user_facing_runtime || allModelsReady);
  const blockers = [...bundle.readiness.blockers, ...bundle.capture_gate.blockers, ...(worker?.blockers ?? []), ...(bundle.internal_validation_gate?.blockers ?? [])].filter(Boolean);

  ui.userPresence.textContent = appReady ? "Ready" : "Setup needed";
  ui.heroTitle.textContent = active ? "Listening locally..." : "How can I help translate today?";
  ui.heroSubtitle.textContent = active ? "Speak now. The local capture runtime is active." : "Type a message, or press the microphone button on the right to record speech locally.";
  ui.assistantMessage.textContent = appReady ? "Local runtime warmup completed. You can start typing or record speech." : `Warmup completed, but setup is not fully ready yet. ${blockers[0] ? blockers[0].replaceAll("_", " ") : bundle.next_action}`;
  ui.realtimeStatus.textContent = worker ? modelReadyText(worker.asr_model_ready && worker.realtime_translation_model_ready && worker.piper_ready) : "Checking";
  ui.qualityStatus.textContent = worker ? modelReadyText(worker.asr_model_ready && worker.quality_translation_model_ready && worker.piper_ready) : "Checking";
  ui.gpuStatus.textContent = diagnostics?.cuda_probe.cuda_runtime_ready ? "CUDA ready" : diagnostics?.cuda_probe.gpu_summary ? "GPU detected" : "CPU fallback";
  ui.developerOutput.textContent = JSON.stringify({ app_version: bundle.engine_status.app_version, lifecycle: bundle.engine_status.lifecycle_state, local_worker: worker, recording_active: active, cuda: diagnostics?.cuda_probe, next_action: bundle.next_action, blockers: blockers.slice(0, 12) }, null, 2);
}

function showSettings(): void {
  document.body.classList.add("settings-open");
  ui.homePage.classList.add("is-hidden");
  ui.settingsPage.classList.remove("is-hidden");
}

function showHome(): void {
  document.body.classList.remove("settings-open");
  ui.settingsPage.classList.add("is-hidden");
  ui.homePage.classList.remove("is-hidden");
}

async function startOrStopRecording(): Promise<void> {
  const result = recording ? await call<CommandResult>("stop_capture") : await call<CommandResult>("start_capture");
  ui.assistantMessage.textContent = result?.message ?? (recording ? "Recording stopped." : "Recording started. Waiting for local capture status.");
  const bundle = await call<RuntimeStatusBundleReport>("get_runtime_status_bundle");
  renderRuntime(bundle, latestDiagnostics);
}

async function submitText(): Promise<void> {
  const source = ui.messageInput.value.trim();
  if (!source) return;
  ui.messageInput.value = "";
  ui.assistantMessage.textContent = "Translating text locally...";
  const result = await call<CommandResult>("translate_text", { source });
  ui.assistantMessage.textContent = result?.message ?? "Translation command failed. Open Settings > Developer for diagnostics.";
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

  const [bundle, diagnostics] = await Promise.all([call<RuntimeStatusBundleReport>("get_runtime_status_bundle"), call<RuntimeDiagnostics>("get_runtime_diagnostics")]);
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
ui.messageInput.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitText(); } });

void runWarmup().catch((error: unknown) => {
  updateWarmup(100, `Warmup finished with warning: ${errorMessage(error)}`);
  ui.warmupScreen.classList.add("is-hidden");
  ui.mainApp.classList.remove("is-hidden");
});
