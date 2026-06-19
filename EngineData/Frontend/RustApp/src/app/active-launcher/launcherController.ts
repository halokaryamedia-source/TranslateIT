import { runtimeApi } from "../bridge/runtimeApi";
import { defaultSettings, errorMessage } from "../shared/state";
import type {
  ChatKind,
  HardwareUsageReport,
  HelperBridgeStatus,
  GpuPolicyReport,
  ModelInventoryReport,
  RuntimeDiagnostics,
  RuntimeSettings,
  RuntimeStatusBundleReport,
  SettingsTab,
  VoiceCapturePreparationReport,
} from "../shared/types";
import { bindUi, requireElement, type UiRefs } from "./dom";
import { chatCollectionView, translationResultView } from "./chatViews";
import { homeDefaultCards, mountAppShell } from "./shell";
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
import { localPreviewTranslation } from "./launcherPreviewTranslation";
import { setRuntimeProfile as applyRuntimeProfile, swapLanguages as applyLanguageSwap, toggleVoiceOutput as applyVoiceOutputToggle } from "./launcherSettingsActions";
import { assertRouteVisible, showHomeRoute, showSettingsRoute } from "./launcherRouteState";
import { renderDeveloperSettingsView } from "./launcherDeveloperSettings";
import { renderAudioSettingsTab, renderGeneralSettingsTab, renderTranslateSettingsTab } from "./launcherSettingsRenderer";
import { startupTrace } from "./startupDiagnostics";
import { clearUserFlowTrace, traceUserFlow } from "./userFlowTrace";

const STARTUP_GATE_TIMEOUT_MS = 4_000;

export class LauncherController {
  private readonly ui: UiRefs;
  private latestBundle: RuntimeStatusBundleReport | null = null;
  private latestDiagnostics: RuntimeDiagnostics | null = null;
  private latestHardware: HardwareUsageReport | null = null;
  private latestHelperBridgeStatus: HelperBridgeStatus | null = null;
  private latestModelInventory: ModelInventoryReport | null = null;
  private latestGpuPolicy: GpuPolicyReport | null = null;
  private currentSettings: RuntimeSettings | null = null;
  private activeSettingsTab: SettingsTab = "general";
  private activeLanguageSelector: LanguageSelectorRole | null = null;
  private recording = false;
  private currentSessionId: string | null = null;
  private activeSessionTitle = "New Chat";
  private logsExpanded = false;
  private textSubmitPending = false;
  private recordingTogglePending = false;
  private voiceCapturePrepPending = false;
  private saveSettingsPending = false;
  private diagnosticPending = false;
  private audioCheckPending = false;
  private attachmentReadPending = false;
  private startupGateFallbackTimer: number | null = null;

  constructor(root: HTMLElement) {
    mountAppShell(root);
    this.ui = bindUi();
  }

  start(): void {
    clearUserFlowTrace();
    startupTrace("controller:start", {
      buildMarker: (globalThis as typeof globalThis & { __translateitStartupBuildMarker?: string }).__translateitStartupBuildMarker ?? "unknown",
    });
    traceUserFlow("app.boot", {
      buildMarker: (globalThis as typeof globalThis & { __translateitStartupBuildMarker?: string }).__translateitStartupBuildMarker ?? "unknown",
    });
    this.bindEvents();
    this.startupGateFallbackTimer = window.setTimeout(() => {
      const warmupVisible = !this.ui.warmupScreen.classList.contains("is-hidden") || window.getComputedStyle(this.ui.warmupScreen).display !== "none";
      if (!warmupVisible) return;
      startupTrace("startupGate:forced-reveal", {
        reason: "startup timeout reached before interface transition",
      });
      this.revealMainApp("startupGate:forced-reveal:after");
    }, 9_000);
    void this.runWarmup().catch((error: unknown) => {
      startupTrace("runWarmup:catch", { message: errorMessage(error) });
      this.updateWarmup(100, `Warmup finished with warning: ${errorMessage(error)}`);
      this.revealMainApp("runWarmup:catch:after");
    }).finally(() => {
      if (this.startupGateFallbackTimer !== null) {
        window.clearTimeout(this.startupGateFallbackTimer);
        this.startupGateFallbackTimer = null;
      }
    });
  }

  private userFacingNotice(message: string): string {
    const normalized = message.toLowerCase();
    const technicalMarkers = [
      "rust start gate checked",
      "lifecycle_preflight",
      "handoff:no_snapshot",
      "conversion_pending",
      "no realtime handoff snapshot",
    ];
    if (technicalMarkers.some((marker) => normalized.includes(marker))) {
      return "Microphone capture is active in a limited mode while the full translation handoff is still preparing. Open Developer Diagnostics for details.";
    }
    const compact = message.replace(/\s+/g, " ").trim();
    if (!compact) return "Status unavailable.";
    return compact.length > 220 ? `${compact.slice(0, 219).trimEnd()}…` : compact;
  }
  private setAssistantNotice(message: string): void {
    const safeMessage = this.userFacingNotice(message);
    this.ui.assistantMessage.textContent = safeMessage;
    this.ui.assistantMessage.title = safeMessage;
    startupTrace("assistant.notice", { safeMessage, rawMessage: message });
  }
  private updateWarmup(progress: number, detail: string): void { this.ui.warmupFill.style.width = `${progress}%`; this.ui.warmupPercent.textContent = `${progress}%`; this.ui.warmupDetail.textContent = detail; }
  private setActiveNav(activeButton: HTMLButtonElement | null): void { this.ui.navItems.forEach((button) => button.classList.toggle("active", button === activeButton)); }
  private workerManifest(bundle: RuntimeStatusBundleReport | null) { return bundle?.local_worker_manifest ?? bundle?.internal_validation_gate?.local_worker_manifest ?? null; }
  private modelReadyText(value: boolean): string { return value ? "Model ready" : "Needs setup"; }
  private refreshDirectionPill(): void { const settings = this.currentSettings ?? defaultSettings(); this.ui.directionPill.textContent = `${settings.source_language.toUpperCase()} > ${settings.target_language.toUpperCase()}`; }
  private renderWarmupSteps(activeIndex = -1): void { this.ui.warmupSteps.innerHTML = warmupStepsView(activeIndex); }
  private traceUiState(label: string): void {
    const describe = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      return {
        hiddenClass: element.classList.contains("is-hidden"),
        classes: Array.from(element.classList),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
      };
    };
    startupTrace(label, {
      warmupScreen: describe(this.ui.warmupScreen),
      mainApp: describe(this.ui.mainApp),
      bodyClasses: Array.from(document.body.classList),
      route: this.ui.mainApp.dataset.route ?? "unknown",
    });
  }
  private revealMainApp(reason: string): void {
    this.ui.warmupScreen.classList.add("is-hidden");
    this.ui.warmupScreen.style.display = "none";
    this.ui.warmupScreen.hidden = true;
    this.ui.mainApp.classList.remove("is-hidden");
    this.ui.mainApp.style.display = "grid";
    this.ui.mainApp.hidden = false;
    this.ui.mainApp.dataset.route = "home";
    this.ui.homePage.classList.remove("is-hidden");
    this.ui.homePage.hidden = false;
    this.ui.homePage.style.display = "grid";
    this.ui.settingsPage.classList.add("is-hidden");
    this.ui.settingsPage.hidden = true;
    this.ui.settingsPage.style.display = "none";
    this.traceUiState(reason);
  }
  private async withTimeout<T>(task: Promise<T | null>, timeoutMs: number, fallback: T | null): Promise<T | null> {
    let timer: number | undefined;
    const timeout = new Promise<T | null>((resolve) => { timer = window.setTimeout(() => resolve(fallback), timeoutMs); });
    return Promise.race([task.catch(() => fallback), timeout]).finally(() => { if (timer !== undefined) window.clearTimeout(timer); });
  }
  private async traceStartupCall<T>(label: string, task: () => Promise<T | null>, timeoutMs: number, fallback: T | null): Promise<T | null> {
    const startedAt = performance.now();
    startupTrace(`${label}:start`, {
      timeoutMs,
      bridge: {
        hasWindowTauri: Boolean((window as typeof window & { __TAURI__?: unknown }).__TAURI__),
        hasWindowTauriInternals: Boolean((window as typeof window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__),
      },
    });
    const tracedTask = task()
      .then((value) => {
        startupTrace(`${label}:resolved`, {
          durationMs: Math.round(performance.now() - startedAt),
          valueType: value === null ? "null" : typeof value,
        });
        return value;
      })
      .catch((error: unknown) => {
        startupTrace(`${label}:error`, {
          durationMs: Math.round(performance.now() - startedAt),
          message: errorMessage(error),
        });
        return fallback;
      });
    let timeoutFired = false;
    const timeout = new Promise<T | null>((resolve) => {
      window.setTimeout(() => {
        timeoutFired = true;
        startupTrace(`${label}:timeout`, {
          timeoutMs,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
        resolve(fallback);
      }, timeoutMs);
    });
    const value = await Promise.race([tracedTask, timeout]);
    startupTrace(`${label}:complete`, {
      durationMs: Math.round(performance.now() - startedAt),
      timedOut: timeoutFired,
      returnedFallback: value === fallback,
    });
    return value;
  }

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
    this.ui.recordStatusText.textContent = active ? "Recording" : "Idle";
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
    const textRuntimeReady = Boolean(worker?.ok || bundle.readiness.ready_for_user_facing_runtime || allModelsReady);
    const helperProviderReady = Boolean(this.latestHelperBridgeStatus?.provider_ready);
    const helperRunning = this.latestHelperBridgeStatus?.state === "ready";
    const voicePipelineReady = Boolean(helperProviderReady && (bundle.capture_gate.ready_for_capture_start || allModelsReady));
    const blockers = [...bundle.readiness.blockers, ...bundle.capture_gate.blockers, ...(worker?.blockers ?? []), ...(worker?.tts_blockers ?? []), ...(worker?.warnings ?? []), ...(bundle.internal_validation_gate?.blockers ?? [])].filter(Boolean);
    const ttsLabel = worker?.piper_ready ? "Piper" : worker?.sapi_ready ? "SAPI" : "unavailable";

    const micOnlyActive = this.recording && !voicePipelineReady;
    this.ui.userPresence.textContent = micOnlyActive ? "Mic only" : voicePipelineReady ? worker?.voice_actor_marcel_ready ? "Voice ready" : `Voice ready (${ttsLabel})` : textRuntimeReady ? "Text ready" : "Setup needed";
    this.ui.heroTitle.textContent = this.recording ? "Listening locally..." : "How can I help translate today?";
    this.ui.heroSubtitle.textContent = this.recording
      ? micOnlyActive
        ? "Microphone capture is active, but the full translation handoff is still preparing."
        : "Microphone capture is active. ASR, translation, and TTS still depend on local worker evidence."
      : voicePipelineReady
        ? "Type a message, or press the microphone button on the right to record speech locally."
        : helperRunning
          ? "Text translation may be available. Voice provider readiness is still incomplete."
          : "Type text to translate. Voice capture requires helper/provider setup first.";
    this.ui.realtimeStatus.textContent = helperProviderReady && worker?.asr_model_ready && worker.realtime_translation_model_ready && worker.tts_default_ready ? "Voice ready" : worker ? "Provider pending" : "Checking";
    this.ui.qualityStatus.textContent = helperProviderReady && worker?.asr_model_ready && worker.quality_translation_model_ready && worker.tts_default_ready ? "Quality ready" : worker ? "Provider pending" : "Checking";
    this.ui.gpuStatus.textContent = diagnostics?.cuda_probe.cuda_runtime_ready ? "CUDA ready" : diagnostics?.cuda_probe.gpu_summary ? "GPU detected" : "CPU fallback";
    this.ui.developerOutput.textContent = `startup=${(globalThis as typeof globalThis & { __translateitStartupBuildMarker?: string }).__translateitStartupBuildMarker ?? "unknown"}; lifecycle=${bundle.engine_status.lifecycle_state}; recording=${this.recording}; helper_provider=${helperProviderReady}; blockers=${blockers.length}; next=${bundle.next_action}`;

    if (!this.currentSessionId) {
      const firstBlocker = blockers[0] ? blockers[0].replaceAll("_", " ") : bundle.next_action;
      this.setAssistantNotice(voicePipelineReady
        ? "Local voice runtime appears ready from current helper evidence. You can type or record speech."
        : textRuntimeReady
          ? `Text runtime warmup completed. Voice pipeline still needs helper/provider evidence. ${firstBlocker}`
          : `Warmup completed, but setup is not fully ready yet. ${firstBlocker}`);
    }
  }

  private showHome(): void {
    showHomeRoute(this.ui, this.activeSettingsTab);
    assertRouteVisible(this.ui, "home");
  }

  private showSettings(tab: SettingsTab = "general"): void {
    this.activeSettingsTab = tab;
    showSettingsRoute(this.ui, tab);
    this.renderSettingsTab(tab);
    assertRouteVisible(this.ui, "settings", tab);
    this.ui.settingsNavItems.find((button) => button.dataset.settingsTab === tab)?.focus();
  }

  private openGeneralSettings(): void {
    traceUserFlow("settings.click", { tab: "general" });
    this.showSettings("general");
  }

  private async refreshHardwareUsage(): Promise<void> { this.latestHardware = await runtimeApi.getHardwareUsage(); }

  private async refreshDeveloperHardwareUsage(): Promise<void> {
    if (this.latestHardware) return;
    await this.refreshHardwareUsage();
    if (this.activeSettingsTab === "developer") this.renderDeveloperSettings();
  }

  private async ensureChatSession(): Promise<string | null> {
    if (this.currentSessionId) return this.currentSessionId;
    const session = await runtimeApi.createChatSession("unsaved").catch(() => null);
    this.currentSessionId = session?.session_id ?? null;
    this.activeSessionTitle = session?.title ?? "New Chat";
    return this.currentSessionId;
  }

  private async createNewChat(): Promise<void> {
    const session = await runtimeApi.createChatSession("unsaved").catch(() => null);
    this.currentSessionId = session?.session_id ?? null;
    this.activeSessionTitle = session?.title ?? "New Chat";
    this.setMessageInputValue("");
    this.setActiveNav(null);
    this.renderHomeCards();
    this.showHome();
    this.setAssistantNotice(this.currentSessionId ? "New chat saved locally and ready." : "New chat is ready, but backend session creation failed.");
  }

  private async saveChatMessage(role: "user" | "assistant", content: string): Promise<void> {
    const sessionId = await this.ensureChatSession().catch(() => null);
    if (!sessionId) return;
    const result = await runtimeApi.appendChatMessage(sessionId, role, content).catch(() => null);
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
    if (!source) {
      this.setAssistantNotice("Type some text to translate first.");
      traceUserFlow("error.user_visible", { reason: "empty_text_submit" });
      return;
    }
    if (exceedsManualTranslationLimit(source)) {
      this.setAssistantNotice(`Text is too long. Limit: ${MAX_MANUAL_TRANSLATION_CHARS} characters.`);
      return;
    }
    if (this.textSubmitPending) {
      this.setAssistantNotice("Translation is already running. Please wait.");
      return;
    }
    this.textSubmitPending = true;
    traceUserFlow("text.submit", {
      length: source.length,
      sourceLanguage: (this.currentSettings ?? defaultSettings()).source_language,
      targetLanguage: (this.currentSettings ?? defaultSettings()).target_language,
    });
    this.ui.sendButton.disabled = true;
    this.ui.messageInput.disabled = true;
    this.setMessageInputValue("");
    try {
      await this.saveChatMessage("user", source);
      this.setAssistantNotice("Translating text locally...");
      const result = await runtimeApi.translateText(source).catch(() => null);
      const fallback = result?.ok ? null : localPreviewTranslation(source, (this.currentSettings ?? defaultSettings()).source_language, (this.currentSettings ?? defaultSettings()).target_language);
      const response = result?.ok ? result.message : fallback ?? result?.message ?? "Translation command failed. Open Settings > Developer for diagnostics.";
      const voiceStatus = result?.ok ? this.voiceOutputStatus() : fallback ? "Local preview" : "Error";
      if (!result?.ok) {
        if (fallback) {
          this.setAssistantNotice("Local preview translation shown because the native worker/model is not configured yet.");
        }
        traceUserFlow("error.user_visible", { reason: "translation_failed", message: result?.message ?? "unknown" });
      }
      if (!result?.ok && !fallback) {
        this.ui.chatList.innerHTML = translationResultView(source, response, voiceStatus);
        this.setAssistantNotice(`Translation failed. ${response}`);
        traceUserFlow("text.translation.result", { status: "failed", response });
        return;
      }
      await this.saveChatMessage("assistant", response);
      this.ui.chatList.innerHTML = translationResultView(source, response, voiceStatus);
      this.setAssistantNotice(result?.ok ? "Translation completed. Result is shown above." : "Local preview translation shown because the native worker/model is not configured yet.");
      traceUserFlow("text.translation.result", {
        status: result?.ok ? "pass" : "local-preview",
        voiceStatus,
      });
    } finally {
      this.textSubmitPending = false;
      this.ui.sendButton.disabled = false;
      this.ui.messageInput.disabled = false;
      this.ui.messageInput.focus();
      this.resizeMessageInput();
    }
  }

  private summarizeVoiceCapturePreparation(report: VoiceCapturePreparationReport): string {
    if (report.ok) return report.message;
    if (report.state === "missing_microphone") return `${report.message} Open Check Microphone or Windows sound settings.`;
    if (report.state === "missing_worker") return `${report.message} Open Developer Diagnostics to view the worker blocker.`;
    if (report.state === "missing_models") return `${report.message} Open Developer Diagnostics or Check Worker Status for setup details.`;
    return report.message;
  }

  private async prepareAndStartVoiceCapture(): Promise<void> {
    if (this.voiceCapturePrepPending) {
      this.setAssistantNotice("Voice capture is already updating. Please wait.");
      return;
    }
    traceUserFlow("mic.click", { recording: this.recording });
    this.voiceCapturePrepPending = true;
    this.ui.microphoneButton.disabled = true;
    this.ui.quickMicButton.disabled = true;
    this.ui.recordStatusButton.disabled = true;
    this.ui.checkMicButton.disabled = true;
    this.ui.startHelperButton.disabled = true;
    this.ui.checkWorkerStatusButton.disabled = true;
    this.ui.openDeveloperDiagnosticsButton.disabled = true;
    try {
      if (this.recording) {
        this.setAssistantNotice("Stopping voice capture...");
        traceUserFlow("voice.capture.stopped", { reason: "user-toggle" });
        const stopResult = await runtimeApi.stopCapture().catch(() => null);
        this.recording = false;
        const [bundle, helperStatus] = await Promise.all([runtimeApi.getStatusBundle(), runtimeApi.getHelperBridgeStatus()]);
        this.latestHelperBridgeStatus = helperStatus;
        this.renderRuntime(bundle, this.latestDiagnostics);
        this.setAssistantNotice(stopResult?.message ?? "Voice capture stopped.");
        return;
      }
      this.setAssistantNotice("Checking microphone device...");
      traceUserFlow("mic.device_check.start", {});
      const preparation = await runtimeApi.prepareVoiceCapture(true).catch(() => null);
      if (!preparation) {
        this.setAssistantNotice("Voice capture preparation failed. Open Developer diagnostics.");
        traceUserFlow("voice.capture.blocked", { reason: "preparation_failed" });
        return;
      }
      traceUserFlow("mic.device_check.result", {
        microphoneReady: preparation.microphone_ready,
        helperState: preparation.helper_state,
      });
      this.latestHelperBridgeStatus = preparation.helper_status;
      this.renderRuntime(this.latestBundle, this.latestDiagnostics);
      if (!preparation.microphone_ready) {
        this.setAssistantNotice(this.summarizeVoiceCapturePreparation(preparation));
        traceUserFlow("voice.capture.blocked", { reason: "missing_microphone", nextActions: preparation.next_actions });
        return;
      }
      if (!preparation.helper_ready || !preparation.provider_ready) {
        this.setAssistantNotice("Checking local voice helper...");
        traceUserFlow("helper.status.check", { state: preparation.helper_state });
        if (preparation.helper_state === "not_started" || preparation.helper_state === "stopped" || preparation.helper_state === "error" || preparation.helper_state === "blocked") {
          traceUserFlow("helper.start.request", { state: preparation.helper_state });
        }
        const startedAt = Date.now();
        let current = preparation;
        while (Date.now() - startedAt < 15_000) {
          await new Promise((resolve) => window.setTimeout(resolve, 750));
          const refreshed = await runtimeApi.prepareVoiceCapture(false).catch(() => null);
          if (!refreshed) break;
          current = refreshed;
          this.latestHelperBridgeStatus = refreshed.helper_status;
          this.renderRuntime(this.latestBundle, this.latestDiagnostics);
          traceUserFlow("worker.status.result", {
            helperState: refreshed.helper_state,
            providerReady: refreshed.provider_ready,
            cudaReady: refreshed.cuda_ready,
          });
          if (refreshed.provider_ready && refreshed.microphone_ready) break;
          if (refreshed.state === "missing_worker" || refreshed.state === "missing_models" || refreshed.state === "missing_microphone") break;
        }
        if (!current.provider_ready || !current.microphone_ready) {
          this.setAssistantNotice(this.summarizeVoiceCapturePreparation(current));
          traceUserFlow("voice.capture.blocked", {
            reason: current.state,
            nextActions: current.next_actions,
          });
          return;
        }
      }
      this.setAssistantNotice("Voice provider ready. Starting capture...");
      traceUserFlow("voice.capture.prepare", { providerReady: true, microphoneReady: true });
      const result = await runtimeApi.startCapture().catch(() => null);
      const captureMessage = result?.message ?? "Recording started.";
      this.recording = Boolean(result?.ok);
      this.setAssistantNotice(captureMessage);
      traceUserFlow(result?.ok ? "voice.capture.started" : "voice.capture.blocked", {
        result: result?.state ?? "unknown",
        message: captureMessage,
      });
      traceUserFlow("asr.result", { status: result?.ok ? "pending" : "blocked" });
      traceUserFlow("translation.voice.result", { status: result?.ok ? "pending" : "blocked" });
      traceUserFlow("tts.result", { status: result?.ok ? "pending" : "blocked" });
      const [bundle, helperStatus] = await Promise.all([runtimeApi.getStatusBundle(), runtimeApi.getHelperBridgeStatus()]);
      this.latestHelperBridgeStatus = helperStatus;
      this.renderRuntime(bundle, this.latestDiagnostics);
      this.setAssistantNotice(captureMessage);
    } finally {
      this.voiceCapturePrepPending = false;
      this.ui.microphoneButton.disabled = false;
      this.ui.quickMicButton.disabled = false;
      this.ui.recordStatusButton.disabled = false;
      this.ui.checkMicButton.disabled = false;
      this.ui.startHelperButton.disabled = false;
      this.ui.checkWorkerStatusButton.disabled = false;
      this.ui.openDeveloperDiagnosticsButton.disabled = false;
    }
  }

  private async startOrStopRecording(): Promise<void> {
    await this.prepareAndStartVoiceCapture();
  }

  private async startHelperBridge(): Promise<void> {
    this.setAssistantNotice("Starting local helper...");
    traceUserFlow("helper.start.request", { source: "manual" });
    const result = await runtimeApi.startHelperBridge().catch(() => null);
    this.latestHelperBridgeStatus = await runtimeApi.getHelperBridgeStatus().catch(() => this.latestHelperBridgeStatus);
    this.renderRuntime(this.latestBundle, this.latestDiagnostics);
    this.setAssistantNotice(result?.message ?? "Start Helper command finished.");
    traceUserFlow("helper.start.result", { state: result?.state ?? "unknown", ok: result?.ok ?? false });
  }

  private async checkWorkerStatus(): Promise<void> {
    this.setAssistantNotice("Checking worker status...");
    traceUserFlow("helper.status.check", { source: "manual" });
    const status = await runtimeApi.getHelperBridgeStatus().catch(() => null);
    if (status) this.latestHelperBridgeStatus = status;
    this.renderRuntime(this.latestBundle, this.latestDiagnostics);
    this.setAssistantNotice(status?.message ?? "Worker status checked.");
    traceUserFlow("worker.status.result", { state: status?.state ?? "unknown", providerReady: status?.provider_ready ?? false });
  }

  private async openDeveloperDiagnostics(): Promise<void> {
    traceUserFlow("settings.click", { tab: "developer" });
    this.showSettings("developer");
    await this.runDeveloperDiagnostic();
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

  private toggleRuntimeProfile(): void {
    this.currentSettings = this.currentSettings ?? defaultSettings();
    const nextProfile = this.currentSettings.runtime_profile === "Quality" ? "Realtime" : "Quality";
    const result = applyRuntimeProfile(this.currentSettings, nextProfile);
    this.currentSettings = result.settings;
    this.renderGeneralSettings();
    this.resetSettingsScroll();
    this.setAssistantNotice(result.notice);
  }

  private cycleLanguageFocusMode(): void {
    this.currentSettings = this.currentSettings ?? defaultSettings();
    const current = this.currentSettings.language_focus_mode;
    const next = current === "id-en-focus" ? "general-focus" : "id-en-focus";
    this.currentSettings.language_focus_mode = next;
    this.setAssistantNotice(next === "id-en-focus" ? "Language focus set to ID/EN Focus." : "Language focus set to General Focus.");
    this.renderGeneralSettings();
    this.resetSettingsScroll();
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
      const [bundle, diagnostics, helperStatus, modelInventory, gpuPolicy] = await Promise.all([
        runtimeApi.getStatusBundle(),
        runtimeApi.getDiagnostics(),
        runtimeApi.getHelperBridgeStatus(),
        runtimeApi.getModelInventory(),
        runtimeApi.getGpuPolicy(),
      ]);
      this.latestHelperBridgeStatus = helperStatus;
      this.latestModelInventory = modelInventory;
      this.latestGpuPolicy = gpuPolicy;
      traceUserFlow("model.inventory.result", {
        status: modelInventory?.status ?? "unknown",
        blockers: modelInventory?.blockers ?? [],
      });
      await this.refreshHardwareUsage();
      this.renderRuntime(bundle, diagnostics);
      this.renderDeveloperSettings();
    } finally {
      this.diagnosticPending = false;
      if (button) button.disabled = false;
    }
  }

  private openAudioSettings(): void {
    traceUserFlow("settings.click", { tab: "audio" });
    this.showSettings("audio");
  }
  private toggleVoiceOutput(): void { const result = applyVoiceOutputToggle(this.currentSettings); this.currentSettings = result.settings; this.setAssistantNotice(result.notice); }
  private setRuntimeProfile(profile: "Realtime" | "Quality"): void { const result = applyRuntimeProfile(this.currentSettings, profile); this.currentSettings = result.settings; this.activeLanguageSelector = null; this.setAssistantNotice(result.notice); }
  private swapLanguages(): void { const result = applyLanguageSwap(this.currentSettings); this.currentSettings = result.settings; this.activeLanguageSelector = null; this.refreshDirectionPill(); this.setAssistantNotice(result.notice); }

  private renderSettingsTab(tab: SettingsTab): void {
    this.activeSettingsTab = tab;
    if (tab === "general") traceUserFlow("settings.tab.general", { tab });
    if (tab === "audio") traceUserFlow("settings.tab.audio", { tab });
    if (tab === "translate") traceUserFlow("settings.tab.translate", { tab });
    if (tab === "developer") traceUserFlow("settings.tab.developer", { tab });
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
    renderGeneralSettingsTab({
      ui: this.ui,
      settings: this.currentSettings ?? defaultSettings(),
      realtimeStatusText: this.ui.realtimeStatus.textContent,
      gpuStatusText: this.ui.gpuStatus.textContent,
      onToggleRuntimeProfile: () => this.toggleRuntimeProfile(),
      onToggleLanguageFocusMode: () => this.cycleLanguageFocusMode(),
      onSaveSettings: () => void this.saveCurrentSettings(),
      onResetSettings: () => void this.saveDefaultSettings(),
    });
  }

  private renderAudioSettings(): void {
    renderAudioSettingsTab({
      ui: this.ui,
      settings: this.currentSettings ?? defaultSettings(),
      onCheckAudioInput: () => void this.checkAudioInput(),
      onStartOrStopRecording: () => void this.startOrStopRecording(),
      onToggleVoiceOutput: () => { this.toggleVoiceOutput(); this.renderAudioSettings(); this.resetSettingsScroll(); },
      onToggleRuntimeProfile: () => { this.setRuntimeProfile((this.currentSettings ?? defaultSettings()).runtime_profile === "Quality" ? "Realtime" : "Quality"); this.renderAudioSettings(); this.resetSettingsScroll(); },
    });
  }

  private renderTranslateSettings(): void {
    renderTranslateSettingsTab({
      ui: this.ui,
      settings: this.currentSettings ?? defaultSettings(),
      activeLanguageSelector: this.activeLanguageSelector,
      onToggleLanguageSelector: (role) => this.toggleLanguageSelector(role),
      onSelectLanguage: (role, code) => this.selectLanguage(role, code),
      onSwapLanguages: () => { this.swapLanguages(); this.renderTranslateSettings(); this.resetSettingsScroll(); },
      onSetRuntimeProfile: (profile) => { this.setRuntimeProfile(profile); this.renderTranslateSettings(); this.resetSettingsScroll(); },
      onSaveSettings: () => void this.saveCurrentSettings(),
    });
  }

  private renderDeveloperSettings(): void {
    this.ui.settingsContent.innerHTML = renderDeveloperSettingsView({
      latestBundle: this.latestBundle,
      latestDiagnostics: this.latestDiagnostics,
      latestHardware: this.latestHardware,
      latestGpuPolicy: this.latestGpuPolicy,
      latestHelperBridgeStatus: this.latestHelperBridgeStatus,
      logsExpanded: this.logsExpanded,
      latestModelInventory: this.latestModelInventory,
      commandErrors: runtimeApi.getCommandErrors(),
    });
    const modelInventoryButton = document.getElementById("refreshModelInventoryButton") as HTMLButtonElement | null;
    if (modelInventoryButton) modelInventoryButton.addEventListener("click", () => void this.refreshModelInventory());
    requireElement<HTMLButtonElement>("#runDiagnosticButton").addEventListener("click", () => void this.runDeveloperDiagnostic());
    requireElement<HTMLButtonElement>("#seeAllLogsButton").addEventListener("click", () => { this.logsExpanded = !this.logsExpanded; this.renderDeveloperSettings(); });
  }

  private async refreshModelInventory(): Promise<void> {
    this.latestModelInventory = await runtimeApi.getModelInventory().catch(() => this.latestModelInventory);
    this.latestGpuPolicy = await runtimeApi.getGpuPolicy().catch(() => this.latestGpuPolicy);
    traceUserFlow("model.inventory.result", {
      status: this.latestModelInventory?.status ?? "unknown",
      blockers: this.latestModelInventory?.blockers ?? [],
    });
    this.renderDeveloperSettings();
  }

  private async refreshStartupRuntimeSnapshot(): Promise<void> {
    startupTrace("startupSnapshot:begin", {});
    const [bundle, diagnostics] = await Promise.all([
      this.traceStartupCall("runtimeApi.getStatusBundle", () => runtimeApi.getStatusBundle(), STARTUP_GATE_TIMEOUT_MS, null),
      this.traceStartupCall("runtimeApi.getDiagnostics", () => runtimeApi.getDiagnostics(), STARTUP_GATE_TIMEOUT_MS, null),
    ]);
    startupTrace("startupSnapshot:complete", {
      bundle: Boolean(bundle),
      diagnostics: Boolean(diagnostics),
    });
    this.renderRuntime(bundle, diagnostics);
    traceUserFlow("startup.complete", {
      bundle: Boolean(bundle),
      diagnostics: Boolean(diagnostics),
    });
    if (this.activeSettingsTab === "developer") this.renderDeveloperSettings();
  }

  private async runWarmup(): Promise<void> {
    startupTrace("runWarmup:start", {
      steps: warmupProgressSteps.length,
      marker: (globalThis as typeof globalThis & { __translateitStartupBuildMarker?: string }).__translateitStartupBuildMarker ?? "unknown",
    });
    for (let i = 0; i < warmupProgressSteps.length; i += 1) {
      startupTrace("runWarmup:step:start", { index: i, progress: warmupProgressSteps[i] });
      this.renderWarmupSteps(i);
      this.updateWarmup(warmupProgressSteps[i], "Checking local runtime...");
      startupTrace("runWarmup:step:complete", { index: i, progress: warmupProgressSteps[i] });
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    startupTrace("runWarmup:loadSettings:before", {});
    this.currentSettings = await this.traceStartupCall("runtimeApi.loadSettings", () => runtimeApi.loadSettings(), STARTUP_GATE_TIMEOUT_MS, defaultSettings()) ?? defaultSettings();
    this.refreshDirectionPill();
    startupTrace("runWarmup:background-refresh:queued", {});
    void this.refreshStartupRuntimeSnapshot();
    this.latestHelperBridgeStatus = null;
    startupTrace("runWarmup:renderHomeCards:before", {});
    this.renderHomeCards();
    startupTrace("runWarmup:renderHomeCards:after", {});
    startupTrace("runWarmup:renderRuntime:before", {});
    this.renderRuntime(null, null);
    startupTrace("runWarmup:renderRuntime:after", {});
    startupTrace("runWarmup:renderSettingsTab:before", {});
    this.renderSettingsTab("general");
    startupTrace("runWarmup:renderSettingsTab:after", {});
    this.setAssistantNotice("Local validation mode is active. The interface is ready while runtime data finishes loading.");
    startupTrace("runWarmup:ui:before-hide", {
      warmupDetail: this.ui.warmupDetail.textContent,
      warmupVisible: !this.ui.warmupScreen.classList.contains("is-hidden"),
      mainVisible: !this.ui.mainApp.classList.contains("is-hidden"),
    });
    this.revealMainApp("runWarmup:ui:after-hide");
    window.setTimeout(() => {
      const warmupVisible = !this.ui.warmupScreen.classList.contains("is-hidden") || window.getComputedStyle(this.ui.warmupScreen).display !== "none";
      if (!warmupVisible) return;
      startupTrace("ui.transition:forced-after-visibility-check", {
        warmupVisible,
        mainVisible: !this.ui.mainApp.classList.contains("is-hidden"),
      });
      this.ui.warmupScreen.classList.add("is-hidden");
      this.ui.mainApp.classList.remove("is-hidden");
      this.traceUiState("ui.transition:forced-after-visibility-check:after");
    }, 1000);
    this.resizeMessageInput();
    startupTrace("runWarmup:complete", {
      assistantNotice: this.ui.assistantMessage.textContent,
    });
  }

  private bindEvents(): void {
    bindLauncherEvents(this.ui, {
      showSettings: () => this.openGeneralSettings(),
      openGeneralSettings: () => this.openGeneralSettings(),
      showHome: () => this.showHome(),
      startOrStopRecording: () => this.prepareAndStartVoiceCapture(),
      prepareAndStartVoiceCapture: () => this.prepareAndStartVoiceCapture(),
      startHelperBridge: () => this.startHelperBridge(),
      checkWorkerStatus: () => this.checkWorkerStatus(),
      openDeveloperDiagnostics: () => this.openDeveloperDiagnostics(),
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


