import { runtimeApi } from "../engineTranslate/runtimeApi";
import { defaultSettings, errorMessage, languageName, percentText } from "../shared/state";
import type {
  ChatKind,
  HardwareUsageReport,
  HelperBridgeStatus,
  RuntimeDiagnostics,
  RuntimeSettings,
  RuntimeStatusBundleReport,
  SettingsTab,
} from "../shared/types";
import { bindUi, requireElement, type UiRefs } from "./dom";
import { chatCollectionView, translationResultView } from "./chatViews";
import { homeDefaultCards, mountAppShell } from "./shell";
import { audioSettingsView, developerSettingsView, generalSettingsView, translateSettingsView } from "./settingsViews";
import { warmupProgressSteps, warmupStepsView } from "./warmupViews";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_FILES,
  attachmentSection,
  compactAttachmentText,
  isSupportedTextAttachment,
  safeAttachmentName,
  unsupportedAttachmentMessage,
} from "./launcherAttachmentRules";
import { bindLauncherEvents } from "./launcherEventBindings";
import { LANGUAGE_OPTIONS, isLanguageCode, nextLanguageCode, type LanguageSelectorRole } from "./launcherLanguageRules";
import { MAX_COMPOSER_TEXTAREA_HEIGHT, MAX_MANUAL_TRANSLATION_CHARS, MIN_COMPOSER_TEXTAREA_HEIGHT, exceedsManualTranslationLimit } from "./launcherTextRules";
import { buildDeveloperLogRows } from "./launcherDeveloperLog";

export class LauncherController {
  private readonly ui: UiRefs;
  private latestBundle: RuntimeStatusBundleReport | null = null;
  private latestDiagnostics: RuntimeDiagnostics | null = null;
  private latestHardware: HardwareUsageReport | null = null;
  private latestHelperBridgeStatus: HelperBridgeStatus | null = null;
  private currentSettings: RuntimeSettings | null = null;
  private activeSettingsTab: SettingsTab = "general";
  private activeLanguageSelector: LanguageSelectorRole | null = null;
  private recording = false;
  private currentSessionId: string | null = null;
  private activeSessionTitle = "New Chat";
  private logsExpanded = false;
  private textSubmitPending = false;
  private recordingTogglePending = false;
  private saveSettingsPending = false;
  private diagnosticPending = false;
  private audioCheckPending = false;
  private attachmentReadPending = false;

  constructor(root: HTMLElement) {
    mountAppShell(root);
    this.ui = bindUi();
  }

  start(): void {
    this.bindEvents();
    void this.runWarmup().catch((error: unknown) => {
      this.updateWarmup(100, `Warmup finished with warning: ${errorMessage(error)}`);
      this.ui.warmupScreen.classList.add("is-hidden");
      this.ui.mainApp.classList.remove("is-hidden");
    });
  }

  private setAssistantNotice(message: string): void { this.ui.assistantMessage.textContent = message; }
  private updateWarmup(progress: number, detail: string): void { this.ui.warmupFill.style.width = `${progress}%`; this.ui.warmupPercent.textContent = `${progress}%`; this.ui.warmupDetail.textContent = detail; }
  private setActiveNav(activeButton: HTMLButtonElement | null): void { this.ui.navItems.forEach((button) => button.classList.toggle("active", button === activeButton)); }
  private workerManifest(bundle: RuntimeStatusBundleReport | null) { return bundle?.local_worker_manifest ?? bundle?.internal_validation_gate?.local_worker_manifest ?? null; }
  private modelReadyText(value: boolean): string { return value ? "Ready" : "Needs setup"; }
  private refreshDirectionPill(): void { const settings = this.currentSettings ?? defaultSettings(); this.ui.directionPill.textContent = `${settings.source_language.toUpperCase()} > ${settings.target_language.toUpperCase()}`; }
  private renderWarmupSteps(activeIndex = -1): void { this.ui.warmupSteps.innerHTML = warmupStepsView(activeIndex); }

  private applyRuntimeSettings(settings: RuntimeSettings): void {
    this.currentSettings = settings;
    this.refreshDirectionPill();
  }

  private voiceOutputStatus(): string {
    const settings = this.currentSettings ?? defaultSettings();
    return settings.audio.auto_play_out_voice ? "Enabled" : "Transcript only";
  }

  private resizeMessageInput(): void {
    const input = this.ui.messageInput;
    input.style.height = "auto";
    const height = Math.max(MIN_COMPOSER_TEXTAREA_HEIGHT, Math.min(input.scrollHeight, MAX_COMPOSER_TEXTAREA_HEIGHT));
    input.style.height = `${height}px`;
    input.style.overflowY = input.scrollHeight > MAX_COMPOSER_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }

  private setMessageInputValue(value: string): void {
    this.ui.messageInput.value = value;
    this.resizeMessageInput();
  }

  private toggleLanguageSelector(role: LanguageSelectorRole): void {
    this.activeLanguageSelector = this.activeLanguageSelector === role ? null : role;
    this.renderTranslateSettings();
    this.resetSettingsScroll();
  }

  private selectLanguage(role: LanguageSelectorRole, code: string): void {
    if (!isLanguageCode(code)) {
      this.setAssistantNotice("Selected language is not supported yet.");
      return;
    }
    this.currentSettings = this.currentSettings ?? defaultSettings();
    const settings = this.currentSettings;
    if (role === "source") {
      settings.source_language = code;
      if (settings.target_language.toLowerCase() === code) settings.target_language = nextLanguageCode(code);
    } else {
      settings.target_language = code;
      if (settings.source_language.toLowerCase() === code) settings.source_language = nextLanguageCode(code);
    }
    this.activeLanguageSelector = null;
    this.refreshDirectionPill();
    this.setAssistantNotice(`Language pair changed to ${settings.source_language.toUpperCase()} > ${settings.target_language.toUpperCase()}.`);
    this.renderTranslateSettings();
    this.resetSettingsScroll();
  }

  private cycleLanguage(role: "source" | "target"): void {
    this.currentSettings = this.currentSettings ?? defaultSettings();
    const settings = this.currentSettings;
    if (role === "source") {
      settings.source_language = nextLanguageCode(settings.source_language);
      if (settings.target_language.toLowerCase() === settings.source_language) settings.target_language = nextLanguageCode(settings.source_language);
    } else {
      settings.target_language = nextLanguageCode(settings.target_language);
      if (settings.source_language.toLowerCase() === settings.target_language) settings.source_language = nextLanguageCode(settings.target_language);
    }
    this.refreshDirectionPill();
    this.setAssistantNotice(`Language pair changed to ${this.currentSettings.source_language.toUpperCase()} > ${this.currentSettings.target_language.toUpperCase()}.`);
  }

  private async ingestAttachmentFiles(filesInput?: FileList | File[]): Promise<void> {
    const files = Array.from(filesInput ?? this.ui.attachmentInput.files ?? []).slice(0, MAX_ATTACHMENT_FILES);
    this.ui.attachmentInput.value = "";
    if (files.length === 0) return;
    if (this.attachmentReadPending) {
      this.setAssistantNotice("Attachment read is already running. Please wait.");
      return;
    }
    const unsupported = files.find((file) => !isSupportedTextAttachment(file));
    if (unsupported) {
      this.setAssistantNotice(unsupportedAttachmentMessage(unsupported));
      return;
    }
    const oversized = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (oversized) {
      this.setAssistantNotice(`${safeAttachmentName(oversized)} is too large. Limit: 64 KB per text file.`);
      return;
    }
    this.attachmentReadPending = true;
    this.ui.composerPlusButton.disabled = true;
    try {
      const sections = [] as string[];
      for (const file of files) {
        const text = compactAttachmentText(await file.text());
        if (!text) {
          this.setAssistantNotice(`${safeAttachmentName(file)} is empty.`);
          return;
        }
        sections.push(attachmentSection(file, text));
      }
      const combinedText = sections.join("\n\n");
      if (exceedsManualTranslationLimit(combinedText)) {
        this.setAssistantNotice(`Combined attachment text is too long. Limit: ${MAX_MANUAL_TRANSLATION_CHARS} characters after cleanup.`);
        return;
      }
      this.setMessageInputValue(combinedText);
      this.ui.messageInput.focus();
      const names = files.map((file) => safeAttachmentName(file)).join(", ");
      this.setAssistantNotice(`Attached ${files.length} file(s): ${names}. Text is ready for translation.`);
    } catch (_error) {
      this.setAssistantNotice("Attachment could not be read as text.");
    } finally {
      this.attachmentReadPending = false;
      this.ui.composerPlusButton.disabled = false;
    }
  }

  private bindAttachmentDropZone(): void {
    const dropZone = this.ui.messageInput.closest(".composer-wrap") as HTMLElement | null;
    if (!dropZone) return;
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("is-attachment-dragover");
    });
    dropZone.addEventListener("dragleave", (event) => {
      if (!dropZone.contains(event.relatedTarget as Node | null)) dropZone.classList.remove("is-attachment-dragover");
    });
    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-attachment-dragover");
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) void this.ingestAttachmentFiles(files);
    });
  }

  private resetSettingsScroll(): void {
    this.ui.settingsContent.scrollTop = 0;
    this.ui.settingsContent.scrollLeft = 0;
  }

  private setRecordingState(active: boolean): void {
    this.recording = active;
    document.body.classList.toggle("is-recording", active);
    this.ui.recordStatusText.textContent = active ? "Recording" : "Ready";
    this.ui.microphoneButton.setAttribute("aria-label", active ? "Stop recording" : "Start voice recording");
  }

  private renderRuntime(bundle: RuntimeStatusBundleReport | null, diagnostics: RuntimeDiagnostics | null): void {
    this.latestBundle = bundle;
    this.latestDiagnostics = diagnostics;
    this.setRecordingState(Boolean(bundle?.live_capture.stream_active));
    if (!bundle) {
      this.ui.userPresence.textContent = "Checking";
      this.setAssistantNotice("Runtime status is not available yet. Open Developer settings for diagnostics.");
      return;
    }

    const worker = this.workerManifest(bundle);
    const allModelsReady = Boolean(worker?.asr_model_ready && worker.asr_backup_model_ready && worker.realtime_translation_model_ready && worker.quality_translation_model_ready && worker.tts_default_ready);
    const appReady = Boolean(worker?.ok || bundle.readiness.ready_for_user_facing_runtime || allModelsReady);
    const blockers = [...bundle.readiness.blockers, ...bundle.capture_gate.blockers, ...(worker?.blockers ?? []), ...(worker?.tts_blockers ?? []), ...(worker?.warnings ?? []), ...(bundle.internal_validation_gate?.blockers ?? [])].filter(Boolean);
    const ttsLabel = worker?.piper_ready ? "Piper" : worker?.sapi_ready ? "SAPI" : "unavailable";

    this.ui.userPresence.textContent = appReady ? worker?.voice_actor_marcel_ready ? "Ready" : `Ready (${ttsLabel})` : "Setup needed";
    this.ui.heroTitle.textContent = this.recording ? "Listening locally..." : "How can I help translate today?";
    this.ui.heroSubtitle.textContent = this.recording ? "Speak now. The local capture runtime is active." : "Type a message, or press the microphone button on the right to record speech locally.";
    this.ui.realtimeStatus.textContent = worker ? this.modelReadyText(worker.asr_model_ready && worker.realtime_translation_model_ready && worker.tts_default_ready) : "Checking";
    this.ui.qualityStatus.textContent = worker ? this.modelReadyText(worker.asr_model_ready && worker.quality_translation_model_ready && worker.tts_default_ready) : "Checking";
    this.ui.gpuStatus.textContent = diagnostics?.cuda_probe.cuda_runtime_ready ? "CUDA ready" : diagnostics?.cuda_probe.gpu_summary ? "GPU detected" : "CPU fallback";
    this.ui.developerOutput.textContent = `lifecycle=${bundle.engine_status.lifecycle_state}; recording=${this.recording}; blockers=${blockers.length}; next=${bundle.next_action}`;

    if (!this.currentSessionId) {
      this.setAssistantNotice(appReady ? "Local runtime warmup completed. You can start typing or record speech." : `Warmup completed, but setup is not fully ready yet. ${blockers[0] ? blockers[0].replaceAll("_", " ") : bundle.next_action}`);
    }
  }

  private showHome(): void { document.body.classList.remove("settings-open"); this.ui.settingsPage.classList.add("is-hidden"); this.ui.homePage.classList.remove("is-hidden"); }
  private showSettings(): void { document.body.classList.add("settings-open"); this.ui.homePage.classList.add("is-hidden"); this.ui.settingsPage.classList.remove("is-hidden"); this.renderSettingsTab(this.activeSettingsTab); }

  private async refreshHardwareUsage(): Promise<void> { this.latestHardware = await runtimeApi.getHardwareUsage(); }

  private async refreshDeveloperHardwareUsage(): Promise<void> {
    if (this.latestHardware) return;
    await this.refreshHardwareUsage();
    if (this.activeSettingsTab === "developer") this.renderDeveloperSettings();
  }

  private async ensureChatSession(): Promise<string | null> {
    if (this.currentSessionId) return this.currentSessionId;
    const session = await runtimeApi.createChatSession("unsaved");
    this.currentSessionId = session?.session_id ?? null;
    this.activeSessionTitle = session?.title ?? "New Chat";
    return this.currentSessionId;
  }

  private async createNewChat(): Promise<void> {
    const session = await runtimeApi.createChatSession("unsaved");
    this.currentSessionId = session?.session_id ?? null;
    this.activeSessionTitle = session?.title ?? "New Chat";
    this.setMessageInputValue("");
    this.setActiveNav(null);
    this.renderHomeCards();
    this.showHome();
    this.setAssistantNotice(this.currentSessionId ? "New chat saved locally and ready." : "New chat is ready, but backend session creation failed.");
  }

  private async saveChatMessage(role: "user" | "assistant", content: string): Promise<void> {
    const sessionId = await this.ensureChatSession();
    if (!sessionId) return;
    const result = await runtimeApi.appendChatMessage(sessionId, role, content);
    if (result?.ok && role === "user" && this.activeSessionTitle === "New Chat") this.activeSessionTitle = content.split(/\s+/).slice(0, 8).join(" ");
  }

  private async showChatCollection(kind: ChatKind, button: HTMLButtonElement): Promise<void> {
    this.setActiveNav(button);
    this.showHome();
    const rows = await runtimeApi.listChatSessions(kind === "local" ? undefined : kind) ?? [];
    this.ui.chatList.innerHTML = chatCollectionView(kind, rows);
    this.setAssistantNotice(`${kind === "local" ? "Local Data" : kind} opened. ${rows.length} item(s) found.`);
  }

  private renderHomeCards(): void { this.ui.chatList.innerHTML = homeDefaultCards(); }

  private async submitText(): Promise<void> {
    const source = this.ui.messageInput.value.trim();
    if (!source) return;
    if (exceedsManualTranslationLimit(source)) {
      this.setAssistantNotice(`Text is too long. Limit: ${MAX_MANUAL_TRANSLATION_CHARS} characters.`);
      return;
    }
    if (this.textSubmitPending) {
      this.setAssistantNotice("Translation is already running. Please wait.");
      return;
    }
    this.textSubmitPending = true;
    this.ui.sendButton.disabled = true;
    this.ui.messageInput.disabled = true;
    this.setMessageInputValue("");
    try {
      await this.saveChatMessage("user", source);
      this.setAssistantNotice("Translating text locally...");
      const result = await runtimeApi.translateText(source);
      const response = result?.message ?? "Translation command failed. Open Settings > Developer for diagnostics.";
      await this.saveChatMessage("assistant", response);
      this.ui.chatList.innerHTML = translationResultView(source, response, this.voiceOutputStatus());
      this.setAssistantNotice("Translation completed. Result is shown above.");
    } finally {
      this.textSubmitPending = false;
      this.ui.sendButton.disabled = false;
      this.ui.messageInput.disabled = false;
      this.ui.messageInput.focus();
      this.resizeMessageInput();
    }
  }

  private async startOrStopRecording(): Promise<void> {
    if (this.recordingTogglePending) {
      this.setAssistantNotice("Voice capture is already updating. Please wait.");
      return;
    }
    this.recordingTogglePending = true;
    this.ui.microphoneButton.disabled = true;
    this.ui.quickMicButton.disabled = true;
    this.ui.recordStatusButton.disabled = true;
    try {
      const result = this.recording ? await runtimeApi.stopCapture() : await runtimeApi.startCapture();
      const captureMessage = result?.message ?? (this.recording ? "Recording stopped." : "Recording started. Waiting for local capture status.");
      this.setAssistantNotice(captureMessage);
      const [bundle, helperStatus] = await Promise.all([runtimeApi.getStatusBundle(), runtimeApi.getHelperBridgeStatus()]);
      this.latestHelperBridgeStatus = helperStatus;
      this.renderRuntime(bundle, this.latestDiagnostics);
      this.setAssistantNotice(captureMessage);
    } finally {
      this.recordingTogglePending = false;
      this.ui.microphoneButton.disabled = false;
      this.ui.quickMicButton.disabled = false;
      this.ui.recordStatusButton.disabled = false;
    }
  }

  private async checkAudioInput(): Promise<void> {
    if (this.audioCheckPending) {
      this.setAssistantNotice("Audio input check is already running. Please wait.");
      return;
    }
    this.audioCheckPending = true;
    const button = document.getElementById("checkAudioInputButton") as HTMLButtonElement | null;
    if (button) button.disabled = true;
    try {
      const status = await runtimeApi.getInputStatus();
      const label = document.getElementById("audioInputLabel") ?? button?.querySelector("span:not(.icon)");
      if (label) label.textContent = status?.selected_device_name ?? "Default microphone";
      this.setAssistantNotice(status?.note ?? status?.blocker ?? "Audio input status checked.");
    } finally {
      this.audioCheckPending = false;
      if (button) button.disabled = false;
    }
  }

  private async saveCurrentSettings(): Promise<void> {
    if (this.saveSettingsPending) {
      this.setAssistantNotice("Settings save is already running. Please wait.");
      return;
    }
    this.saveSettingsPending = true;
    this.setAssistantNotice("Saving settings...");
    try {
      const result = await runtimeApi.saveSettings(this.currentSettings ?? defaultSettings());
      this.currentSettings = await runtimeApi.loadSettings() ?? this.currentSettings;
      this.refreshDirectionPill();
      this.setAssistantNotice(result?.message ?? "Save settings command failed.");
      this.renderSettingsTab(this.activeSettingsTab);
    } finally {
      this.saveSettingsPending = false;
    }
  }

  private async saveDefaultSettings(): Promise<void> {
    if (this.saveSettingsPending) {
      this.setAssistantNotice("Settings save is already running. Please wait.");
      return;
    }
    this.saveSettingsPending = true;
    this.setAssistantNotice("Restoring default settings...");
    try {
      const result = await runtimeApi.saveDefaultSettings();
      this.currentSettings = await runtimeApi.loadSettings() ?? this.currentSettings;
      this.refreshDirectionPill();
      this.setAssistantNotice(result?.message ?? "Default settings save command failed.");
      this.renderSettingsTab(this.activeSettingsTab);
    } finally {
      this.saveSettingsPending = false;
    }
  }

  private async runDeveloperDiagnostic(): Promise<void> {
    if (this.diagnosticPending) {
      this.setAssistantNotice("Diagnostic is already running. Please wait.");
      return;
    }
    this.diagnosticPending = true;
    const button = document.getElementById("runDiagnosticButton") as HTMLButtonElement | null;
    if (button) button.disabled = true;
    this.setAssistantNotice("Running diagnostic...");
    try {
      const [bundle, diagnostics, helperStatus] = await Promise.all([runtimeApi.getStatusBundle(), runtimeApi.getDiagnostics(), runtimeApi.getHelperBridgeStatus()]);
      this.latestHelperBridgeStatus = helperStatus;
      await this.refreshHardwareUsage();
      this.renderRuntime(bundle, diagnostics);
      this.renderDeveloperSettings();
    } finally {
      this.diagnosticPending = false;
      if (button) button.disabled = false;
    }
  }

  private openAudioSettings(): void { this.activeSettingsTab = "audio"; this.showSettings(); }
  private toggleVoiceOutput(): void { this.currentSettings = this.currentSettings ?? defaultSettings(); this.currentSettings.audio.auto_play_out_voice = !this.currentSettings.audio.auto_play_out_voice; this.currentSettings.audio.auto_play_translation_voice = this.currentSettings.audio.auto_play_out_voice; this.setAssistantNotice(this.currentSettings.audio.auto_play_out_voice ? "Voice output enabled." : "Voice output disabled."); }
  private setRuntimeProfile(profile: "Realtime" | "Quality"): void { this.currentSettings = this.currentSettings ?? defaultSettings(); this.currentSettings.runtime_profile = profile; this.currentSettings.audio.input_sensitivity = profile; this.activeLanguageSelector = null; this.setAssistantNotice(`Translate mode set to ${profile}.`); }
  private swapLanguages(): void { this.currentSettings = this.currentSettings ?? defaultSettings(); const source = this.currentSettings.source_language; this.currentSettings.source_language = this.currentSettings.target_language; this.currentSettings.target_language = source; this.activeLanguageSelector = null; this.refreshDirectionPill(); this.setAssistantNotice(`Language pair changed to ${this.currentSettings.source_language.toUpperCase()} > ${this.currentSettings.target_language.toUpperCase()}.`); }

  private renderSettingsTab(tab: SettingsTab): void {
    this.activeSettingsTab = tab;
    if (tab !== "translate") this.activeLanguageSelector = null;
    this.ui.settingsNavItems.forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === tab));
    if (tab === "general") this.renderGeneralSettings();
    if (tab === "audio") this.renderAudioSettings();
    if (tab === "translate") this.renderTranslateSettings();
    if (tab === "developer") {
      this.renderDeveloperSettings();
      void this.refreshDeveloperHardwareUsage();
      void runtimeApi.getHelperBridgeStatus().then((status) => {
        this.latestHelperBridgeStatus = status;
        if (this.activeSettingsTab === "developer") this.renderDeveloperSettings();
      });
    }
    this.resetSettingsScroll();
  }

  private renderGeneralSettings(): void {
    this.ui.settingsContent.innerHTML = generalSettingsView(this.currentSettings ?? defaultSettings(), this.ui.realtimeStatus.textContent, this.ui.gpuStatus.textContent);
    requireElement<HTMLButtonElement>("#saveSettingsButton").addEventListener("click", () => void this.saveCurrentSettings());
    requireElement<HTMLButtonElement>("#resetSettingsButton").addEventListener("click", () => void this.saveDefaultSettings());
  }

  private renderAudioSettings(): void {
    this.ui.settingsContent.innerHTML = audioSettingsView(this.currentSettings ?? defaultSettings());
    requireElement<HTMLButtonElement>("#checkAudioInputButton").addEventListener("click", () => void this.checkAudioInput());
    requireElement<HTMLButtonElement>("#micTestButton").addEventListener("click", () => void this.startOrStopRecording());
    requireElement<HTMLButtonElement>("#audioVoiceToggleButton").addEventListener("click", () => { this.toggleVoiceOutput(); this.renderAudioSettings(); this.resetSettingsScroll(); });
    requireElement<HTMLButtonElement>("#audioSensitivityButton").addEventListener("click", () => { this.setRuntimeProfile((this.currentSettings ?? defaultSettings()).runtime_profile === "Quality" ? "Realtime" : "Quality"); this.renderAudioSettings(); this.resetSettingsScroll(); });
  }

  private renderTranslateSettings(): void {
    const settings = this.currentSettings ?? defaultSettings();
    this.ui.settingsContent.innerHTML = translateSettingsView(settings, languageName(settings.source_language), languageName(settings.target_language), this.activeLanguageSelector, LANGUAGE_OPTIONS);
    requireElement<HTMLButtonElement>("#sourceLanguageButton").addEventListener("click", () => this.toggleLanguageSelector("source"));
    requireElement<HTMLButtonElement>("#targetLanguageButton").addEventListener("click", () => this.toggleLanguageSelector("target"));
    requireElement<HTMLButtonElement>("#swapLanguageButton").addEventListener("click", () => { this.swapLanguages(); this.renderTranslateSettings(); this.resetSettingsScroll(); });
    document.querySelectorAll<HTMLButtonElement>("[data-language-role]").forEach((button) => button.addEventListener("click", () => this.selectLanguage(button.dataset.languageRole as LanguageSelectorRole, button.dataset.languageCode ?? "")));
    requireElement<HTMLButtonElement>("#realtimeModeButton").addEventListener("click", () => { this.setRuntimeProfile("Realtime"); this.renderTranslateSettings(); this.resetSettingsScroll(); });
    requireElement<HTMLButtonElement>("#qualityModeButton").addEventListener("click", () => { this.setRuntimeProfile("Quality"); this.renderTranslateSettings(); this.resetSettingsScroll(); });
  }

  private renderDeveloperSettings(): void {
    const worker = this.workerManifest(this.latestBundle);
    const progress = this.latestBundle?.live_pipeline_gate?.progress_percent ?? this.latestBundle?.internal_validation_gate?.progress_percent ?? 0;
    const cpu = percentText(this.latestHardware?.cpu);
    const ram = percentText(this.latestHardware?.ram);
    const gpu = percentText(this.latestHardware?.gpu);
    const gpuStatus = this.latestDiagnostics?.cuda_probe.gpu_summary ?? this.latestHardware?.gpu.detail ?? "GPU status unavailable";
    const logRows = buildDeveloperLogRows({
      runtimeLoaded: Boolean(this.latestBundle),
      worker,
      cpu,
      ram,
      gpu,
      gpuStatus,
      nextAction: this.latestBundle?.next_action ?? "Waiting for next diagnostic result.",
      commandErrors: runtimeApi.getCommandErrors(),
    });
    this.ui.settingsContent.innerHTML = developerSettingsView({ progress, cpu, ram, gpu, gpuStatus, logRows, note: this.latestHardware?.note ?? "Run diagnostic to refresh hardware usage.", logsExpanded: this.logsExpanded, engineGood: Boolean(this.latestBundle), helperStatus: this.latestHelperBridgeStatus });
    requireElement<HTMLButtonElement>("#runDiagnosticButton").addEventListener("click", () => void this.runDeveloperDiagnostic());
    requireElement<HTMLButtonElement>("#seeAllLogsButton").addEventListener("click", () => { this.logsExpanded = !this.logsExpanded; this.renderDeveloperSettings(); });
  }

  private async runWarmup(): Promise<void> {
    for (let i = 0; i < warmupProgressSteps.length; i += 1) {
      this.renderWarmupSteps(i);
      this.updateWarmup(warmupProgressSteps[i], "Checking local runtime...");
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    this.currentSettings = await runtimeApi.loadSettings() ?? defaultSettings();
    this.refreshDirectionPill();
    const [bundle, diagnostics, helperStatus] = await Promise.all([runtimeApi.getStatusBundle(), runtimeApi.getDiagnostics(), runtimeApi.getHelperBridgeStatus()]);
    this.latestHelperBridgeStatus = helperStatus;
    this.renderHomeCards();
    this.renderRuntime(bundle, diagnostics);
    this.renderSettingsTab("general");
    this.ui.warmupScreen.classList.add("is-hidden");
    this.ui.mainApp.classList.remove("is-hidden");
    this.resizeMessageInput();
  }

  private bindEvents(): void {
    bindLauncherEvents(this.ui, {
      showSettings: () => this.showSettings(),
      showHome: () => this.showHome(),
      startOrStopRecording: () => this.startOrStopRecording(),
      submitText: () => this.submitText(),
      resizeMessageInput: () => this.resizeMessageInput(),
      createNewChat: () => this.createNewChat(),
      openAttachmentInput: () => { this.ui.attachmentInput.click(); },
      ingestAttachmentFiles: () => this.ingestAttachmentFiles(),
      bindAttachmentDropZone: () => this.bindAttachmentDropZone(),
      showRecentChat: () => this.showChatCollection("recent", this.ui.recentChatButton),
      showUnsavedChat: () => this.showChatCollection("unsaved", this.ui.unsavedChatButton),
      showSavedChat: () => this.showChatCollection("saved", this.ui.savedChatButton),
      showLocalData: () => this.showChatCollection("local", this.ui.localDataButton),
      openAudioSettings: () => this.openAudioSettings(),
      toggleVoiceOutput: () => this.toggleVoiceOutput(),
      renderSettingsTab: (tab) => this.renderSettingsTab(tab),
      applyRuntimeSettings: (settings) => this.applyRuntimeSettings(settings),
    });
  }
}
