import { runtimeApi } from "../bridge/runtimeApi";
import { runtimeProductFacade, type ProductRuntimeSnapshot, type ProductSetupAction } from "../bridge/runtimeProductFacade";
import { defaultSettings, errorMessage } from "../shared/state";
import type { RuntimeSettings, SettingsTab } from "../shared/types";
import { translationResultView } from "../active-launcher/chatViews";
import { requireElement } from "../active-launcher/dom";
import { mountAppShell } from "../active-launcher/shell";
import { renderDeveloperSettingsView } from "../active-launcher/launcherDeveloperSettings";
import { renderAudioSettingsTab, renderGeneralSettingsTab, renderTranslateSettingsTab } from "../active-launcher/launcherSettingsRenderer";
import { isLanguageCode, nextLanguageCode, type LanguageSelectorRole } from "../active-launcher/launcherLanguageRules";
import { exceedsManualTranslationLimit, MAX_MANUAL_TRANSLATION_CHARS } from "../active-launcher/launcherTextRules";
import { attachmentSection, compactAttachmentText, isSupportedTextAttachment, safeAttachmentName, unsupportedAttachmentMessage, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_FILES } from "../active-launcher/launcherAttachmentRules";
import { setRuntimeProfile as applyRuntimeProfile, swapLanguages as applyLanguageSwap, toggleVoiceOutput as applyVoiceOutputToggle } from "../active-launcher/launcherSettingsActions";

const STARTUP_STEP_MS = 80;
type ProductWorkspace = "meeting" | "text" | "documents" | "history" | "saved";

const WORKSPACE_TITLES: Record<ProductWorkspace, string> = {
  meeting: "Meeting",
  text: "Text",
  documents: "Documents",
  history: "History",
  saved: "Saved",
};

type SimpleRefs = {
  warmupScreen: HTMLElement;
  warmupFill: HTMLDivElement;
  warmupPercent: HTMLSpanElement;
  warmupDetail: HTMLParagraphElement;
  warmupSteps: HTMLOListElement;
  mainApp: HTMLElement;
  homePage: HTMLElement;
  settingsPage: HTMLElement;
  settingsContent: HTMLElement;
  settingsButton: HTMLButtonElement;
  backHomeButton: HTMLButtonElement;
  workspaceTitle: HTMLHeadingElement;
  workspaceNavItems: HTMLButtonElement[];
  workspacePanels: HTMLElement[];
  messageInput: HTMLTextAreaElement;
  attachmentInput: HTMLInputElement;
  sendButton: HTMLButtonElement;
  assistantMessage: HTMLParagraphElement;
  retryReadinessButton: HTMLButtonElement;
  fixSetupButton: HTMLButtonElement;
  openDeveloperDiagnosticsButton: HTMLButtonElement;
  heroTitle: HTMLHeadingElement;
  heroSubtitle: HTMLParagraphElement;
  realtimeStatus: HTMLParagraphElement;
  qualityStatus: HTMLParagraphElement;
  gpuStatus: HTMLSpanElement;
  developerOutput: HTMLPreElement;
  userPresence: HTMLSpanElement;
  composerPlusButton: HTMLButtonElement;
  chatList: HTMLElement;
  directionPill: HTMLElement;
  recordStatusText: HTMLElement;
  settingsNavItems: HTMLButtonElement[];
};

function bindSimpleRefs(): SimpleRefs {
  return {
    warmupScreen: requireElement<HTMLElement>("#warmupScreen"),
    warmupFill: requireElement<HTMLDivElement>("#warmupFill"),
    warmupPercent: requireElement<HTMLSpanElement>("#warmupPercent"),
    warmupDetail: requireElement<HTMLParagraphElement>("#warmupDetail"),
    warmupSteps: requireElement<HTMLOListElement>("#warmupSteps"),
    mainApp: requireElement<HTMLElement>("#mainApp"),
    homePage: requireElement<HTMLElement>("#homePage"),
    settingsPage: requireElement<HTMLElement>("#settingsPage"),
    settingsContent: requireElement<HTMLElement>("#settingsContent"),
    settingsButton: requireElement<HTMLButtonElement>("#settingsButton"),
    backHomeButton: requireElement<HTMLButtonElement>("#backHomeButton"),
    workspaceTitle: requireElement<HTMLHeadingElement>("#workspaceTitle"),
    workspaceNavItems: Array.from(document.querySelectorAll<HTMLButtonElement>("[data-workspace-nav]")),
    workspacePanels: Array.from(document.querySelectorAll<HTMLElement>("[data-workspace-panel]")),
    messageInput: requireElement<HTMLTextAreaElement>("#messageInput"),
    attachmentInput: requireElement<HTMLInputElement>("#attachmentInput"),
    sendButton: requireElement<HTMLButtonElement>("#sendButton"),
    assistantMessage: requireElement<HTMLParagraphElement>("#assistantMessage"),
    retryReadinessButton: requireElement<HTMLButtonElement>("#retryReadinessButton"),
    fixSetupButton: requireElement<HTMLButtonElement>("#fixSetupButton"),
    openDeveloperDiagnosticsButton: requireElement<HTMLButtonElement>("#openDeveloperDiagnosticsButton"),
    heroTitle: requireElement<HTMLHeadingElement>("#heroTitle"),
    heroSubtitle: requireElement<HTMLParagraphElement>("#heroSubtitle"),
    realtimeStatus: requireElement<HTMLParagraphElement>("#realtimeStatus"),
    qualityStatus: requireElement<HTMLParagraphElement>("#qualityStatus"),
    gpuStatus: requireElement<HTMLSpanElement>("#gpuStatus"),
    developerOutput: requireElement<HTMLPreElement>("#developerOutput"),
    userPresence: requireElement<HTMLSpanElement>("#userPresence"),
    composerPlusButton: requireElement<HTMLButtonElement>("#composerPlusButton"),
    chatList: requireElement<HTMLElement>("#chatList"),
    directionPill: requireElement<HTMLElement>("#directionPill"),
    recordStatusText: requireElement<HTMLElement>("#recordStatusText"),
    settingsNavItems: Array.from(document.querySelectorAll<HTMLButtonElement>("[data-settings-tab]")),
  };
}

function clampNotice(message: string): string {
  const clean = message.replace(/\s+/g, " ").trim();
  if (!clean) return "Status unavailable.";
  return clean.length > 220 ? `${clean.slice(0, 219).trimEnd()}…` : clean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isWorkspace(value: string | undefined): value is ProductWorkspace {
  return value === "meeting" || value === "text" || value === "documents" || value === "history" || value === "saved";
}

export class SimpleLauncherController {
  private readonly ui: SimpleRefs;
  private settings: RuntimeSettings = defaultSettings();
  private snapshot: ProductRuntimeSnapshot | null = null;
  private activeWorkspace: ProductWorkspace = "meeting";
  private activeSettingsTab: SettingsTab = "general";
  private activeLanguageSelector: LanguageSelectorRole | null = null;
  private translating = false;
  private setupRunning = false;
  private voiceRunning = false;
  private settingsSaving = false;
  private diagnosticsRunning = false;
  private attachmentReading = false;
  private logsExpanded = false;

  constructor(root: HTMLElement) {
    mountAppShell(root);
    this.ui = bindSimpleRefs();
  }

  start(): void {
    this.bindEvents();
    void this.boot();
  }

  private async boot(): Promise<void> {
    const steps = ["Loading interface", "Loading settings", "Checking local capabilities"];
    this.ui.warmupSteps.innerHTML = steps.map((label) => `<li>${label}</li>`).join("");
    for (let i = 0; i < steps.length; i += 1) {
      const progress = Math.round(((i + 1) / steps.length) * 100);
      this.ui.warmupFill.style.width = `${progress}%`;
      this.ui.warmupPercent.textContent = `${progress}%`;
      this.ui.warmupDetail.textContent = steps[i];
      await sleep(STARTUP_STEP_MS);
    }
    await this.refreshReadiness();
    this.revealMainApp();
  }

  private revealMainApp(): void {
    this.ui.warmupScreen.classList.add("is-hidden");
    this.ui.warmupScreen.hidden = true;
    this.ui.warmupScreen.style.display = "none";
    this.ui.mainApp.classList.remove("is-hidden");
    this.ui.mainApp.hidden = false;
    this.ui.mainApp.style.display = "grid";
    this.showWorkspace("meeting");
  }

  private notice(message: string): void {
    const safe = clampNotice(message);
    this.ui.assistantMessage.textContent = safe;
    this.ui.assistantMessage.title = safe;
  }

  private refreshDirectionPill(): void {
    this.ui.directionPill.textContent = `${this.settings.source_language.toUpperCase()} > ${this.settings.target_language.toUpperCase()}`;
  }

  private async refreshReadiness(preferredNotice?: string): Promise<void> {
    try {
      this.snapshot = await runtimeProductFacade.loadProductRuntimeSnapshot();
      this.settings = this.snapshot.settings ?? this.settings;
      this.refreshDirectionPill();
      const readiness = this.snapshot.readiness;
      this.ui.userPresence.textContent = readiness.meetingReady ? "Ready" : readiness.textReady ? "Degraded" : readiness.level === "blocked" ? "Setup Needed" : "Checking";
      this.ui.recordStatusText.textContent = readiness.recording ? "Recording" : readiness.meetingReady ? "Ready" : readiness.voiceReady ? "Route needed" : readiness.level === "checking" ? "Checking" : "Setup needed";
      this.ui.realtimeStatus.textContent = readiness.textStatus;
      this.ui.qualityStatus.textContent = readiness.meetingStatus;
      this.ui.gpuStatus.textContent = this.snapshot.gpuPolicy?.cuda_available ? "CUDA ready" : this.snapshot.gpuPolicy?.cpu_fallback_active ? "CPU fallback" : "Checking";
      this.ui.developerOutput.textContent = JSON.stringify({ readiness, commandErrors: runtimeApi.getCommandErrors().slice(0, 5) }, null, 2);
      this.ui.heroTitle.textContent = readiness.meetingReady ? "Meeting translation ready" : "Meeting translation setup";
      this.ui.heroSubtitle.textContent = readiness.meetingReady
        ? "Meeting Voice reports the required local runtime and meeting route as ready."
        : readiness.textReady
          ? "Text translation is available, but Meeting Voice still needs setup or route evidence."
          : "TranslateIT is checking the local capabilities required for Meeting Voice.";
      this.notice(preferredNotice ?? readiness.summary);
    } catch (error) {
      this.notice(`Runtime check failed: ${errorMessage(error)}`);
    }
  }

  private showWorkspace(workspace: ProductWorkspace): void {
    this.activeWorkspace = workspace;
    document.body.classList.remove("settings-open");
    this.ui.mainApp.dataset.route = workspace;
    this.ui.homePage.classList.remove("is-hidden");
    this.ui.homePage.hidden = false;
    this.ui.homePage.style.display = "grid";
    this.ui.settingsPage.classList.add("is-hidden");
    this.ui.settingsPage.hidden = true;
    this.ui.settingsPage.style.display = "none";
    this.ui.workspaceTitle.textContent = WORKSPACE_TITLES[workspace];
    this.ui.workspacePanels.forEach((panel) => {
      const active = panel.dataset.workspacePanel === workspace;
      panel.classList.toggle("is-hidden", !active);
      panel.hidden = !active;
    });
    this.ui.workspaceNavItems.forEach((button) => {
      const active = button.dataset.workspaceNav === workspace;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (workspace === "text") this.ui.messageInput.focus();
  }

  private showSettings(tab: SettingsTab = "general"): void {
    document.body.classList.add("settings-open");
    this.activeSettingsTab = tab;
    this.ui.mainApp.dataset.route = "settings";
    this.ui.homePage.classList.add("is-hidden");
    this.ui.homePage.hidden = true;
    this.ui.homePage.style.display = "none";
    this.ui.settingsPage.classList.remove("is-hidden");
    this.ui.settingsPage.hidden = false;
    this.ui.settingsPage.style.display = "grid";
    this.renderSettings(tab);
  }

  private async submitText(): Promise<void> {
    const source = this.ui.messageInput.value.trim();
    if (!source) {
      this.notice("Type text before translating.");
      this.ui.messageInput.focus();
      return;
    }
    if (exceedsManualTranslationLimit(source)) {
      this.notice(`Text is too long. Limit: ${MAX_MANUAL_TRANSLATION_CHARS} characters.`);
      return;
    }
    if (this.translating) return;
    this.translating = true;
    this.ui.sendButton.disabled = true;
    this.ui.sendButton.textContent = "Translating...";
    this.notice("Translating with local engine...");
    try {
      const result = await runtimeProductFacade.runProductTranslation(source);
      const status = result.ok ? "Native runtime" : "Runtime blocked";
      const translated = result.ok ? result.translated : result.message;
      this.ui.chatList.innerHTML = translationResultView(source, translated, status);
      this.notice(result.ok ? "Translation completed." : `Translation blocked: ${result.message}`);
      await this.refreshReadiness(result.ok ? "Translation completed." : undefined);
    } finally {
      this.translating = false;
      this.ui.sendButton.disabled = false;
      this.ui.sendButton.textContent = "Translate";
      this.ui.messageInput.focus();
    }
  }

  private async runSetup(action: ProductSetupAction): Promise<void> {
    if (this.setupRunning) return;
    this.setupRunning = true;
    const label = action === "verify-models" ? "Verifying models..." : action === "check-microphone" ? "Checking microphone..." : "Refreshing diagnostics...";
    this.notice(label);
    try {
      const message = await runtimeProductFacade.runProductSetupAction(action);
      await this.refreshReadiness(message);
    } finally {
      this.setupRunning = false;
    }
  }

  private setRecoveryDisabled(disabled: boolean): void {
    this.ui.retryReadinessButton.disabled = disabled;
    this.ui.fixSetupButton.disabled = disabled;
    this.ui.openDeveloperDiagnosticsButton.disabled = disabled;
  }

  private async fixSetup(): Promise<void> {
    if (this.setupRunning) return;
    this.setupRunning = true;
    this.setRecoveryDisabled(true);
    this.notice("Running setup checks...");
    try {
      const message = await runtimeProductFacade.runProductRecoveryAction("fix-setup");
      await this.refreshReadiness(message);
    } finally {
      this.setupRunning = false;
      this.setRecoveryDisabled(false);
    }
  }

  private async toggleVoice(): Promise<void> {
    if (this.voiceRunning) return;
    const readiness = this.snapshot?.readiness;
    if (!readiness?.voiceReady && !readiness?.recording) {
      this.notice(readiness?.nextAction ?? "Voice capture setup is not ready. Use Fix Setup or Open Diagnostics.");
      return;
    }
    this.voiceRunning = true;
    try {
      const result = readiness.recording ? await runtimeApi.stopCapture() : await runtimeApi.startCapture();
      await this.refreshReadiness(result.message);
    } catch (error) {
      this.notice(`Voice command failed: ${errorMessage(error)}`);
    } finally {
      this.voiceRunning = false;
    }
  }

  private async ingestAttachmentFiles(): Promise<void> {
    const files = Array.from(this.ui.attachmentInput.files ?? []).slice(0, MAX_ATTACHMENT_FILES);
    this.ui.attachmentInput.value = "";
    if (!files.length || this.attachmentReading) return;
    this.attachmentReading = true;
    this.ui.composerPlusButton.disabled = true;
    try {
      const unsupported = files.find((file) => !isSupportedTextAttachment(file));
      if (unsupported) {
        this.notice(unsupportedAttachmentMessage(unsupported));
        return;
      }
      const oversized = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
      if (oversized) {
        this.notice(`${safeAttachmentName(oversized)} is too large. Limit: 64 KB per file.`);
        return;
      }
      const sections: string[] = [];
      for (const file of files) {
        const text = compactAttachmentText(await file.text());
        if (text) sections.push(attachmentSection(file, text));
      }
      const combined = sections.join("\n\n");
      if (!combined) {
        this.notice("Attached files did not contain readable text.");
        return;
      }
      this.ui.messageInput.value = combined;
      this.notice(`Attached ${files.length} text file(s). Ready to translate.`);
    } catch (error) {
      this.notice(`Attachment read failed: ${errorMessage(error)}`);
    } finally {
      this.attachmentReading = false;
      this.ui.composerPlusButton.disabled = false;
      this.ui.messageInput.focus();
    }
  }

  private renderSettings(tab: SettingsTab): void {
    this.activeSettingsTab = tab;
    this.ui.settingsNavItems.forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === tab));
    if (tab === "audio") {
      renderAudioSettingsTab({
        ui: this.ui as any,
        settings: this.settings,
        onCheckAudioInput: () => void this.runSetup("check-microphone"),
        onStartOrStopRecording: () => void this.toggleVoice(),
        onToggleVoiceOutput: () => { this.toggleVoiceOutput(); this.renderSettings("audio"); },
        onToggleRuntimeProfile: () => { this.toggleRuntimeProfile(); this.renderSettings("audio"); },
      });
      return;
    }
    if (tab === "translate") {
      renderTranslateSettingsTab({
        ui: this.ui as any,
        settings: this.settings,
        activeLanguageSelector: this.activeLanguageSelector,
        onToggleLanguageSelector: (role) => { this.activeLanguageSelector = this.activeLanguageSelector === role ? null : role; this.renderSettings("translate"); },
        onSelectLanguage: (role, code) => this.selectLanguage(role, code),
        onSwapLanguages: () => { const result = applyLanguageSwap(this.settings); this.settings = result.settings; this.refreshDirectionPill(); this.notice(result.notice); this.renderSettings("translate"); },
        onSetRuntimeProfile: (profile) => { const result = applyRuntimeProfile(this.settings, profile); this.settings = result.settings; this.notice(result.notice); this.renderSettings("translate"); },
        onSaveSettings: () => void this.saveSettings(),
      });
      return;
    }
    if (tab === "developer") {
      this.ui.settingsContent.innerHTML = renderDeveloperSettingsView({
        latestBundle: this.snapshot?.bundle ?? null,
        latestDiagnostics: this.snapshot?.diagnostics ?? null,
        latestHardware: null,
        latestGpuPolicy: this.snapshot?.gpuPolicy ?? null,
        latestHelperBridgeStatus: this.snapshot?.helper ?? null,
        logsExpanded: this.logsExpanded,
        latestModelInventory: this.snapshot?.modelInventory ?? null,
        commandErrors: runtimeApi.getCommandErrors(),
      });
      const diagnosticButton = document.getElementById("runDiagnosticButton") as HTMLButtonElement | null;
      diagnosticButton?.addEventListener("click", () => void this.runDiagnostics());
      const logsButton = document.getElementById("seeAllLogsButton") as HTMLButtonElement | null;
      logsButton?.addEventListener("click", () => { this.logsExpanded = !this.logsExpanded; this.renderSettings("developer"); });
      const modelButton = document.getElementById("refreshModelInventoryButton") as HTMLButtonElement | null;
      modelButton?.addEventListener("click", () => void this.runSetup("verify-models"));
      return;
    }
    renderGeneralSettingsTab({
      ui: this.ui as any,
      settings: this.settings,
      realtimeStatusText: this.ui.realtimeStatus.textContent,
      gpuStatusText: this.ui.gpuStatus.textContent,
      onToggleRuntimeProfile: () => { this.toggleRuntimeProfile(); this.renderSettings("general"); },
      onToggleLanguageFocusMode: () => { this.settings.language_focus_mode = this.settings.language_focus_mode === "id-en-focus" ? "general-focus" : "id-en-focus"; this.notice(`Language focus: ${this.settings.language_focus_mode}`); this.renderSettings("general"); },
      onSaveSettings: () => void this.saveSettings(),
      onResetSettings: () => void this.resetSettings(),
    });
  }

  private selectLanguage(role: LanguageSelectorRole, code: string): void {
    if (!isLanguageCode(code)) {
      this.notice("Selected language is not supported yet.");
      return;
    }
    if (role === "source") {
      this.settings.source_language = code;
      if (this.settings.target_language.toLowerCase() === code) this.settings.target_language = nextLanguageCode(code);
    } else {
      this.settings.target_language = code;
      if (this.settings.source_language.toLowerCase() === code) this.settings.source_language = nextLanguageCode(code);
    }
    this.activeLanguageSelector = null;
    this.refreshDirectionPill();
    this.notice(`Language pair changed to ${this.settings.source_language.toUpperCase()} > ${this.settings.target_language.toUpperCase()}.`);
    this.renderSettings("translate");
  }

  private toggleRuntimeProfile(): void {
    const next = this.settings.runtime_profile === "Quality" ? "Realtime" : "Quality";
    const result = applyRuntimeProfile(this.settings, next);
    this.settings = result.settings;
    this.notice(result.notice);
  }

  private toggleVoiceOutput(): void {
    const result = applyVoiceOutputToggle(this.settings);
    this.settings = result.settings;
    this.notice(result.notice);
  }

  private async saveSettings(): Promise<void> {
    if (this.settingsSaving) return;
    this.settingsSaving = true;
    this.notice("Saving settings...");
    try {
      const result = await runtimeApi.saveSettings(this.settings);
      this.settings = await runtimeApi.loadSettings().catch(() => this.settings);
      this.refreshDirectionPill();
      this.notice(result.message);
    } finally {
      this.settingsSaving = false;
    }
  }

  private async resetSettings(): Promise<void> {
    if (this.settingsSaving) return;
    this.settingsSaving = true;
    this.notice("Restoring defaults...");
    try {
      const result = await runtimeApi.saveDefaultSettings();
      this.settings = await runtimeApi.loadSettings().catch(() => defaultSettings());
      this.refreshDirectionPill();
      this.notice(result.message);
      this.renderSettings(this.activeSettingsTab);
    } finally {
      this.settingsSaving = false;
    }
  }

  private async runDiagnostics(): Promise<void> {
    if (this.diagnosticsRunning) return;
    this.diagnosticsRunning = true;
    this.notice("Refreshing diagnostics...");
    try {
      await this.refreshReadiness("Diagnostics refreshed.");
      this.renderSettings("developer");
    } finally {
      this.diagnosticsRunning = false;
    }
  }

  private bindEvents(): void {
    this.ui.sendButton.addEventListener("click", () => void this.submitText());
    this.ui.messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void this.submitText();
      }
    });
    this.ui.composerPlusButton.addEventListener("click", () => this.ui.attachmentInput.click());
    this.ui.attachmentInput.addEventListener("change", () => void this.ingestAttachmentFiles());
    this.ui.workspaceNavItems.forEach((button) => button.addEventListener("click", () => {
      const workspace = button.dataset.workspaceNav;
      if (isWorkspace(workspace)) this.showWorkspace(workspace);
    }));
    this.ui.settingsButton.addEventListener("click", () => this.showSettings("general"));
    this.ui.backHomeButton.addEventListener("click", () => this.showWorkspace(this.activeWorkspace));
    this.ui.retryReadinessButton.addEventListener("click", () => void this.refreshReadiness("Readiness refreshed."));
    this.ui.fixSetupButton.addEventListener("click", () => void this.fixSetup());
    this.ui.openDeveloperDiagnosticsButton.addEventListener("click", () => this.showSettings("developer"));
    this.ui.settingsNavItems.forEach((button) => button.addEventListener("click", () => this.renderSettings((button.dataset.settingsTab as SettingsTab) ?? "general")));
  }
}
