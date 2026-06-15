import "./styles.css";
import { runCommand } from "./app/tauriBridge";
import { bindUi, requireElement } from "./app/dom";
import { icon } from "./app/icons";
import { homeDefaultCards, mountAppShell } from "./app/shell";
import { defaultSettings, errorMessage, languageName, percentText } from "./app/state";
import type {
  ChatKind,
  CommandResult,
  HardwareUsageReport,
  InputPreparationStatus,
  LauncherChatActionResult,
  LauncherChatSession,
  LauncherChatSummary,
  RuntimeDiagnostics,
  RuntimeSettings,
  RuntimeStatusBundleReport,
  SettingsTab,
} from "./app/types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("TranslateIT app root was not found.");

mountAppShell(app);
const ui = bindUi();

let latestBundle: RuntimeStatusBundleReport | null = null;
let latestDiagnostics: RuntimeDiagnostics | null = null;
let latestHardware: HardwareUsageReport | null = null;
let currentSettings: RuntimeSettings | null = null;
let activeSettingsTab: SettingsTab = "developer";
let recording = false;
let currentSessionId: string | null = null;
let activeSessionTitle = "New Chat";
let logsExpanded = false;

function setAssistantNotice(message: string): void {
  ui.assistantMessage.textContent = message;
}

function updateWarmup(progress: number, detail: string): void {
  ui.warmupFill.style.width = `${progress}%`;
  ui.warmupPercent.textContent = `${progress}%`;
  ui.warmupDetail.textContent = detail;
}

function renderWarmupSteps(activeIndex = -1): void {
  const steps = ["Desktop shell", "User settings", "Audio devices", "GPU policy", "Model assets", "Local AI worker", "Interface"];
  ui.warmupSteps.innerHTML = steps
    .map((title, index) => `<li class="warmup-step ${index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending"}"><span></span><div><strong>${title}</strong><p>${index === activeIndex ? "Checking..." : "Ready for startup check."}</p></div></li>`)
    .join("");
}

function setActiveNav(activeButton: HTMLButtonElement | null): void {
  ui.navItems.forEach((button) => button.classList.toggle("active", button === activeButton));
}

function workerManifest(bundle: RuntimeStatusBundleReport | null) {
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

function refreshDirectionPill(): void {
  const settings = currentSettings ?? defaultSettings();
  ui.directionPill.textContent = `${settings.source_language.toUpperCase()} > ${settings.target_language.toUpperCase()}`;
}

function renderRuntime(bundle: RuntimeStatusBundleReport | null, diagnostics: RuntimeDiagnostics | null): void {
  latestBundle = bundle;
  latestDiagnostics = diagnostics;
  setRecordingState(Boolean(bundle?.live_capture.stream_active));

  if (!bundle) {
    ui.userPresence.textContent = "Checking";
    setAssistantNotice("Runtime status is not available yet. Open Developer settings for diagnostics.");
    return;
  }

  const worker = workerManifest(bundle);
  const allModelsReady = Boolean(worker?.asr_model_ready && worker.realtime_translation_model_ready && worker.quality_translation_model_ready && worker.piper_ready);
  const appReady = Boolean(worker?.ok || bundle.readiness.ready_for_user_facing_runtime || allModelsReady);
  const blockers = [...bundle.readiness.blockers, ...bundle.capture_gate.blockers, ...(worker?.blockers ?? []), ...(bundle.internal_validation_gate?.blockers ?? [])].filter(Boolean);

  ui.userPresence.textContent = appReady ? "Ready" : "Setup needed";
  ui.heroTitle.textContent = recording ? "Listening locally..." : "How can I help translate today?";
  ui.heroSubtitle.textContent = recording ? "Speak now. The local capture runtime is active." : "Type a message, or press the microphone button on the right to record speech locally.";
  ui.realtimeStatus.textContent = worker ? modelReadyText(worker.asr_model_ready && worker.realtime_translation_model_ready && worker.piper_ready) : "Checking";
  ui.qualityStatus.textContent = worker ? modelReadyText(worker.asr_model_ready && worker.quality_translation_model_ready && worker.piper_ready) : "Checking";
  ui.gpuStatus.textContent = diagnostics?.cuda_probe.cuda_runtime_ready ? "CUDA ready" : diagnostics?.cuda_probe.gpu_summary ? "GPU detected" : "CPU fallback";
  ui.developerOutput.textContent = JSON.stringify({ app_version: bundle.engine_status.app_version, lifecycle: bundle.engine_status.lifecycle_state, hardware: latestHardware, local_worker: worker, recording_active: recording, cuda: diagnostics?.cuda_probe, next_action: bundle.next_action, blockers: blockers.slice(0, 12) }, null, 2);

  if (!currentSessionId) {
    setAssistantNotice(appReady ? "Local runtime warmup completed. You can start typing or record speech." : `Warmup completed, but setup is not fully ready yet. ${blockers[0] ? blockers[0].replaceAll("_", " ") : bundle.next_action}`);
  }
}

function showHome(): void {
  document.body.classList.remove("settings-open");
  ui.settingsPage.classList.add("is-hidden");
  ui.homePage.classList.remove("is-hidden");
}

function showSettings(): void {
  document.body.classList.add("settings-open");
  ui.homePage.classList.add("is-hidden");
  ui.settingsPage.classList.remove("is-hidden");
  renderSettingsTab(activeSettingsTab);
}

async function refreshHardwareUsage(): Promise<void> {
  latestHardware = await runCommand<HardwareUsageReport>("get_hardware_usage");
}

async function ensureChatSession(): Promise<string | null> {
  if (currentSessionId) return currentSessionId;
  const session = await runCommand<LauncherChatSession>("create_chat_session", { kind: "unsaved" });
  currentSessionId = session?.session_id ?? null;
  activeSessionTitle = session?.title ?? "New Chat";
  return currentSessionId;
}

async function createNewChat(): Promise<void> {
  const session = await runCommand<LauncherChatSession>("create_chat_session", { kind: "unsaved" });
  currentSessionId = session?.session_id ?? null;
  activeSessionTitle = session?.title ?? "New Chat";
  ui.messageInput.value = "";
  setActiveNav(null);
  renderHomeCards();
  showHome();
  setAssistantNotice(currentSessionId ? "New chat saved locally and ready." : "New chat is ready, but backend session creation failed.");
}

async function saveChatMessage(role: "user" | "assistant", content: string): Promise<void> {
  const sessionId = await ensureChatSession();
  if (!sessionId) return;
  const result = await runCommand<LauncherChatActionResult>("append_chat_message", { sessionId, role, content });
  if (result?.ok && role === "user" && activeSessionTitle === "New Chat") {
    activeSessionTitle = content.split(/\s+/).slice(0, 8).join(" ");
  }
}

async function showChatCollection(kind: ChatKind, button: HTMLButtonElement): Promise<void> {
  setActiveNav(button);
  showHome();
  const listKind = kind === "local" ? undefined : kind;
  const sessions = await runCommand<LauncherChatSummary[]>("list_chat_sessions", listKind ? { kind: listKind } : {});
  const rows = sessions ?? [];
  ui.chatList.innerHTML = rows.length
    ? rows.slice(0, 6).map((item) => `<article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon(kind === "saved" ? "folder" : "file")}</div><h4>${item.title}</h4></div><p>${item.kind} · ${item.message_count} message(s)</p></article>`).join("")
    : `<article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("file")}</div><h4>No ${kind} chat yet</h4></div><p>New chat sessions will appear here after you send a message.</p></article>`;
  setAssistantNotice(`${kind === "local" ? "Local Data" : kind} opened. ${rows.length} item(s) found.`);
}

function renderHomeCards(): void {
  ui.chatList.innerHTML = homeDefaultCards();
}

async function submitText(): Promise<void> {
  const source = ui.messageInput.value.trim();
  if (!source) return;
  ui.messageInput.value = "";
  await saveChatMessage("user", source);
  setAssistantNotice("Translating text locally...");
  const result = await runCommand<CommandResult>("translate_text", { source });
  const response = result?.message ?? "Translation command failed. Open Settings > Developer for diagnostics.";
  await saveChatMessage("assistant", response);
  setAssistantNotice(response);
}

async function startOrStopRecording(): Promise<void> {
  const result = recording ? await runCommand<CommandResult>("stop_capture") : await runCommand<CommandResult>("start_capture");
  setAssistantNotice(result?.message ?? (recording ? "Recording stopped." : "Recording started. Waiting for local capture status."));
  const bundle = await runCommand<RuntimeStatusBundleReport>("get_runtime_status_bundle");
  renderRuntime(bundle, latestDiagnostics);
}

async function checkAudioInput(): Promise<void> {
  const status = await runCommand<InputPreparationStatus>("get_input_status");
  const label = document.getElementById("audioInputLabel");
  if (label) label.textContent = status?.selected_device_name ?? "Default microphone";
  setAssistantNotice(status?.note ?? status?.blocker ?? "Audio input status checked.");
}

async function saveCurrentSettings(): Promise<void> {
  const result = await runCommand<CommandResult>("save_runtime_settings", { settings: currentSettings ?? defaultSettings() });
  setAssistantNotice(result?.message ?? "Save settings command failed.");
}

async function saveDefaultSettings(): Promise<void> {
  const result = await runCommand<CommandResult>("save_default_runtime_settings");
  currentSettings = await runCommand<RuntimeSettings>("load_runtime_settings") ?? currentSettings;
  refreshDirectionPill();
  setAssistantNotice(result?.message ?? "Default settings save command failed.");
}

async function runDeveloperDiagnostic(): Promise<void> {
  const [bundle, diagnostics] = await Promise.all([
    runCommand<RuntimeStatusBundleReport>("get_runtime_status_bundle"),
    runCommand<RuntimeDiagnostics>("get_runtime_diagnostics"),
  ]);
  await refreshHardwareUsage();
  renderRuntime(bundle, diagnostics);
  renderDeveloperSettings();
}

function openAudioSettings(): void {
  activeSettingsTab = "audio";
  showSettings();
}

function toggleVoiceOutput(): void {
  currentSettings = currentSettings ?? defaultSettings();
  currentSettings.audio.auto_play_out_voice = !currentSettings.audio.auto_play_out_voice;
  currentSettings.audio.auto_play_translation_voice = currentSettings.audio.auto_play_out_voice;
  setAssistantNotice(currentSettings.audio.auto_play_out_voice ? "Voice output enabled." : "Voice output disabled.");
}

function setRuntimeProfile(profile: "Realtime" | "Quality"): void {
  currentSettings = currentSettings ?? defaultSettings();
  currentSettings.runtime_profile = profile;
  currentSettings.audio.input_sensitivity = profile;
  setAssistantNotice(`Translate mode set to ${profile}.`);
}

function swapLanguages(): void {
  currentSettings = currentSettings ?? defaultSettings();
  const source = currentSettings.source_language;
  currentSettings.source_language = currentSettings.target_language;
  currentSettings.target_language = source;
  refreshDirectionPill();
  setAssistantNotice(`Language pair changed to ${currentSettings.source_language.toUpperCase()} > ${currentSettings.target_language.toUpperCase()}.`);
}

function renderSettingsTab(tab: SettingsTab): void {
  activeSettingsTab = tab;
  ui.settingsNavItems.forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === tab));
  if (tab === "general") renderGeneralSettings();
  if (tab === "audio") renderAudioSettings();
  if (tab === "translate") renderTranslateSettings();
  if (tab === "developer") renderDeveloperSettings();
}

function renderGeneralSettings(): void {
  const settings = currentSettings ?? defaultSettings();
  ui.settingsContent.innerHTML = `<section class="settings-page-title"><h2>General</h2><p>Basic launcher and local runtime preferences.</p></section><article class="audio-card-v22"><div class="audio-grid-v22"><section class="audio-field-group"><h3>Runtime Profile</h3><button class="select-field-v22" type="button"><span>${settings.runtime_profile}</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Language Focus</h3><button class="select-field-v22" type="button"><span>${settings.language_focus_mode}</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Realtime Status</h3><button class="select-field-v22" type="button"><span>${ui.realtimeStatus.textContent}</span>${icon("pulse")}</button></section><section class="audio-field-group"><h3>GPU Status</h3><button class="select-field-v22" type="button"><span>${ui.gpuStatus.textContent}</span>${icon("monitor")}</button></section></div><button id="saveSettingsButton" class="mic-test-button-v22" type="button">Save Settings</button><button id="resetSettingsButton" class="mic-test-button-v22" type="button" style="margin-left:12px;">Save Default</button></article><section class="settings-page-title secondary"><h2>Advanced General Setting</h2><p>Reserved for future launcher preferences.</p></section><article class="advanced-empty-v22"></article>`;
  requireElement<HTMLButtonElement>("#saveSettingsButton").addEventListener("click", () => void saveCurrentSettings());
  requireElement<HTMLButtonElement>("#resetSettingsButton").addEventListener("click", () => void saveDefaultSettings());
}

function renderAudioSettings(): void {
  const settings = currentSettings ?? defaultSettings();
  const voiceEnabled = settings.audio.auto_play_out_voice;
  ui.settingsContent.innerHTML = `<section class="settings-page-title"><h2>Audio</h2><p>Configure microphone input, voice output, and local capture checks.</p></section><article class="audio-card-v22"><div class="audio-grid-v22"><section class="audio-field-group"><h3>Input Device</h3><button id="checkAudioInputButton" class="select-field-v22" type="button"><span id="audioInputLabel">Default microphone</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Input Sensitivity</h3><button id="audioSensitivityButton" class="select-field-v22" type="button"><span>${settings.audio.input_sensitivity}</span>${icon("chevron")}</button></section><section class="audio-field-group"><h3>Voice Output</h3><button id="audioVoiceToggleButton" class="select-field-v22" type="button"><span>${voiceEnabled ? "Enabled" : "Disabled"}</span>${icon("speaker")}</button></section><section class="mic-test-row-v22"><button id="micTestButton" class="mic-test-button-v22" type="button">Test Mic</button><div class="meter-v22"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></section></div></article><section class="settings-page-title secondary"><h2>Advanced Audio Setting</h2><p>Reserved for future audio device options.</p></section><article class="advanced-empty-v22"></article>`;
  requireElement<HTMLButtonElement>("#checkAudioInputButton").addEventListener("click", () => void checkAudioInput());
  requireElement<HTMLButtonElement>("#micTestButton").addEventListener("click", () => void startOrStopRecording());
  requireElement<HTMLButtonElement>("#audioVoiceToggleButton").addEventListener("click", () => { toggleVoiceOutput(); renderAudioSettings(); });
  requireElement<HTMLButtonElement>("#audioSensitivityButton").addEventListener("click", () => { setRuntimeProfile((currentSettings ?? defaultSettings()).runtime_profile === "Quality" ? "Realtime" : "Quality"); renderAudioSettings(); });
}

function renderTranslateSettings(): void {
  const settings = currentSettings ?? defaultSettings();
  const realtimeActive = settings.runtime_profile !== "Quality";
  ui.settingsContent.innerHTML = `<section class="settings-page-title"><h2>Translate</h2><p>Configure language pair, realtime mode, and output style.</p></section><article class="audio-card-v22"><div class="audio-grid-v22"><section class="audio-field-group"><h3>Source Language</h3><button class="select-field-v22" type="button"><span>${languageName(settings.source_language)}</span>${icon("translate")}</button></section><section class="audio-field-group"><h3>Target Language</h3><button class="select-field-v22" type="button"><span>${languageName(settings.target_language)}</span>${icon("translate")}</button></section></div><button id="swapLanguageButton" class="mic-test-button-v22" type="button">Swap</button><button id="saveTranslateButton" class="mic-test-button-v22" type="button" style="margin-left:12px;">Save</button></article><section class="settings-page-title secondary"><h2>Realtime</h2><p>Choose faster response or higher quality translation planning.</p></section><article class="voice-card-v22"><div class="voice-grid-v22"><section><h3>Mode</h3><div id="realtimeModeButton" class="radio-row-v22 ${realtimeActive ? "active" : ""}" role="button"><span></span><strong>Fast</strong><em>Prioritize realtime latency.</em></div><div id="qualityModeButton" class="radio-row-v22 ${!realtimeActive ? "active" : ""}" role="button"><span></span><strong>Quality</strong><em>Prioritize careful translation planning.</em></div></section><section><h3>Translate Output</h3><div class="radio-row-v22 active"><span></span><strong>Transcript</strong><em>Always show translated text.</em></div><div class="radio-row-v22 ${settings.audio.auto_play_out_voice ? "active" : ""}"><span></span><strong>Voice</strong><em>Play translated voice when local TTS is available.</em></div></section></div></article><section class="settings-page-title secondary"><h2>Advanced Translate Setting</h2><p>Reserved for future translation preferences.</p></section><article class="advanced-empty-v22"></article>`;
  requireElement<HTMLButtonElement>("#swapLanguageButton").addEventListener("click", () => { swapLanguages(); renderTranslateSettings(); });
  requireElement<HTMLButtonElement>("#saveTranslateButton").addEventListener("click", () => void saveCurrentSettings());
  requireElement<HTMLElement>("#realtimeModeButton").addEventListener("click", () => { setRuntimeProfile("Realtime"); renderTranslateSettings(); });
  requireElement<HTMLElement>("#qualityModeButton").addEventListener("click", () => { setRuntimeProfile("Quality"); renderTranslateSettings(); });
}

function renderDeveloperSettings(): void {
  const progress = latestBundle?.internal_validation_gate?.progress_percent ?? latestBundle?.live_pipeline_gate?.progress_percent ?? 0;
  const cpu = percentText(latestHardware?.cpu);
  const ram = percentText(latestHardware?.ram);
  const gpu = percentText(latestHardware?.gpu);
  const gpuStatus = latestDiagnostics?.cuda_probe.gpu_summary ?? latestHardware?.gpu.detail ?? "GPU status unavailable";
  const logRows = [`<p><strong>[OK]</strong>${latestBundle ? "Runtime status loaded." : "Waiting for diagnostic check."}</p>`, `<p><strong>[HW]</strong>CPU ${cpu} · RAM ${ram} · GPU ${gpu}</p>`, `<p><strong>[GPU]</strong>${gpuStatus}</p>`, `<p><strong>[WAIT]</strong>${latestBundle?.next_action ?? "Waiting for next diagnostic result."}</p>`].join("");
  ui.settingsContent.innerHTML = `<section class="settings-page-title"><h2>Developer</h2><p>Simple tools for monitoring runtime health and fixing common issues.</p></section><section class="settings-page-title secondary"><h2>Monitoring</h2><p>Melacak usage hardware dan health engine.</p></section><article class="audio-card-v22"><div class="audio-grid-v22"><section class="audio-field-group"><h3>CPU Usage</h3><button class="select-field-v22" type="button"><span>${cpu}</span>${icon("monitor")}</button></section><section class="audio-field-group"><h3>RAM Usage</h3><button class="select-field-v22" type="button"><span>${ram}</span>${icon("monitor")}</button></section><section class="audio-field-group"><h3>GPU Usage</h3><button class="select-field-v22" type="button"><span>${gpu}</span>${icon("monitor")}</button></section><section class="audio-field-group"><h3>Health Engine</h3><button class="select-field-v22" type="button"><span>${latestBundle ? "Good" : "Check"}</span>${icon("pulse")}</button></section></div><p style="margin:26px 0 0;color:var(--muted);font-size:13px;">${latestHardware?.note ?? "Run diagnostic to refresh hardware usage."}</p></article><section class="settings-page-title secondary"><h2>Diagnostic</h2><p>Run checking and review diagnostic logs.</p></section><article class="audio-card-v22"><button id="runDiagnosticButton" class="mic-test-button-v22" type="button">Run Checking</button><span style="margin-left:16px;color:var(--muted);font-weight:800;">${Math.round(progress)}%</span><section id="diagnosticLogPanel" class="developer-log-body" style="height:${logsExpanded ? 320 : 176}px;margin-top:28px;border:1px solid var(--border-strong);border-radius:18px;background:#080b11;padding:26px;overflow:hidden;">${logRows}</section><button id="seeAllLogsButton" class="mic-test-button-v22" type="button" style="margin-top:18px;">${logsExpanded ? "Show Less" : "See All Logs"}</button></article><section class="settings-page-title secondary"><h2>Advanced Developer Setting</h2><p>Reserved for future developer options.</p></section><article class="advanced-empty-v22"></article>`;
  requireElement<HTMLButtonElement>("#runDiagnosticButton").addEventListener("click", () => void runDeveloperDiagnostic());
  requireElement<HTMLButtonElement>("#seeAllLogsButton").addEventListener("click", () => { logsExpanded = !logsExpanded; renderDeveloperSettings(); });
}

async function runWarmup(): Promise<void> {
  const steps = [12, 24, 38, 52, 68, 84, 100];
  for (let i = 0; i < steps.length; i += 1) {
    renderWarmupSteps(i);
    updateWarmup(steps[i], "Checking local runtime...");
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
  currentSettings = await runCommand<RuntimeSettings>("load_runtime_settings") ?? defaultSettings();
  refreshDirectionPill();
  await refreshHardwareUsage();
  const [bundle, diagnostics] = await Promise.all([
    runCommand<RuntimeStatusBundleReport>("get_runtime_status_bundle"),
    runCommand<RuntimeDiagnostics>("get_runtime_diagnostics"),
  ]);
  renderHomeCards();
  renderRuntime(bundle, diagnostics);
  renderSettingsTab("developer");
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
ui.newChatButton.addEventListener("click", () => void createNewChat());
ui.composerPlusButton.addEventListener("click", () => { ui.messageInput.focus(); setAssistantNotice("Input is ready. File attachment backend is not connected yet."); });
ui.recentChatButton.addEventListener("click", () => void showChatCollection("recent", ui.recentChatButton));
ui.unsavedChatButton.addEventListener("click", () => void showChatCollection("unsaved", ui.unsavedChatButton));
ui.savedChatButton.addEventListener("click", () => void showChatCollection("saved", ui.savedChatButton));
ui.localDataButton.addEventListener("click", () => void showChatCollection("local", ui.localDataButton));
ui.micOptionsButton.addEventListener("click", openAudioSettings);
ui.voiceOutputButton.addEventListener("click", () => { toggleVoiceOutput(); });
ui.voiceOptionsButton.addEventListener("click", openAudioSettings);
ui.settingsNavItems.forEach((button) => button.addEventListener("click", () => renderSettingsTab(button.dataset.settingsTab as SettingsTab)));

void runWarmup().catch((error: unknown) => {
  updateWarmup(100, `Warmup finished with warning: ${errorMessage(error)}`);
  ui.warmupScreen.classList.add("is-hidden");
  ui.mainApp.classList.remove("is-hidden");
});
