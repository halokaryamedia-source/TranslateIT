import { runtimeApi } from "../bridge/runtimeApi";
import {
  runtimeProductFacade,
  type ProductRuntimeSnapshot,
  type ProductSetupAction,
} from "../bridge/runtimeProductFacade";
import { defaultSettings, errorMessage, languageName } from "../shared/state";
import type { RuntimeSettings } from "../shared/types";
import { requireElement } from "../active-launcher/dom";
import { mountAppShell } from "../active-launcher/shell";
import { renderDeveloperSettingsView } from "../active-launcher/launcherDeveloperSettings";
import { renderAdvancedSettingsTab, renderMeetingSettingsTab } from "../active-launcher/launcherSettingsRenderer";
import { exceedsManualTranslationLimit, MAX_MANUAL_TRANSLATION_CHARS } from "../active-launcher/launcherTextRules";
import { swapLanguages as applyLanguageSwap } from "../active-launcher/launcherSettingsActions";

const STARTUP_STEP_MS = 80;
type ProductWorkspace = "meeting" | "text";
type ProductSettingsTab = "meeting" | "advanced";
type StatusTone = "neutral" | "good" | "warning";
type TextResultState = "idle" | "translating" | "success" | "stale" | "error";

const WORKSPACE_TITLES: Record<ProductWorkspace, string> = {
  meeting: "Meeting",
  text: "Text",
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
  textTargetOutput: HTMLTextAreaElement;
  textResultStatus: HTMLElement;
  textResultMessage: HTMLElement;
  textModeValue: HTMLElement;
  sendButton: HTMLButtonElement;
  assistantMessage: HTMLParagraphElement;
  retryReadinessButton: HTMLButtonElement;
  fixSetupButton: HTMLButtonElement;
  realtimeStatus: HTMLParagraphElement;
  gpuStatus: HTMLSpanElement;
  developerOutput: HTMLPreElement;
  userPresence: HTMLSpanElement;
  directionPill: HTMLElement;
  recordStatusText: HTMLElement;
  textSourceLanguage: HTMLElement;
  textTargetLanguage: HTMLElement;
  textSwapLanguageButton: HTMLButtonElement;
  meetingReadinessStatus: HTMLElement;
  meetingInputDeviceValue: HTMLElement;
  meetingInputDeviceStatus: HTMLElement;
  meetingSoundDeviceValue: HTMLElement;
  meetingRouteStatus: HTMLElement;
  startTranslationButton: HTMLButtonElement;
  startTranslationHint: HTMLElement;
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
    textTargetOutput: requireElement<HTMLTextAreaElement>("#textTargetOutput"),
    textResultStatus: requireElement<HTMLElement>("#textResultStatus"),
    textResultMessage: requireElement<HTMLElement>("#textResultMessage"),
    textModeValue: requireElement<HTMLElement>("#textModeValue"),
    sendButton: requireElement<HTMLButtonElement>("#sendButton"),
    assistantMessage: requireElement<HTMLParagraphElement>("#assistantMessage"),
    retryReadinessButton: requireElement<HTMLButtonElement>("#retryReadinessButton"),
    fixSetupButton: requireElement<HTMLButtonElement>("#fixSetupButton"),
    realtimeStatus: requireElement<HTMLParagraphElement>("#realtimeStatus"),
    gpuStatus: requireElement<HTMLSpanElement>("#gpuStatus"),
    developerOutput: requireElement<HTMLPreElement>("#developerOutput"),
    userPresence: requireElement<HTMLSpanElement>("#userPresence"),
    directionPill: requireElement<HTMLElement>("#directionPill"),
    recordStatusText: requireElement<HTMLElement>("#recordStatusText"),
    textSourceLanguage: requireElement<HTMLElement>("#textSourceLanguage"),
    textTargetLanguage: requireElement<HTMLElement>("#textTargetLanguage"),
    textSwapLanguageButton: requireElement<HTMLButtonElement>("#textSwapLanguageButton"),
    meetingReadinessStatus: requireElement<HTMLElement>("#meetingReadinessStatus"),
    meetingInputDeviceValue: requireElement<HTMLElement>("#meetingInputDeviceValue"),
    meetingInputDeviceStatus: requireElement<HTMLElement>("#meetingInputDeviceStatus"),
    meetingSoundDeviceValue: requireElement<HTMLElement>("#meetingSoundDeviceValue"),
    meetingRouteStatus: requireElement<HTMLElement>("#meetingRouteStatus"),
    startTranslationButton: requireElement<HTMLButtonElement>("#startTranslationButton"),
    startTranslationHint: requireElement<HTMLElement>("#startTranslationHint"),
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
  return value === "meeting" || value === "text";
}

function isSettingsTab(value: string | undefined): value is ProductSettingsTab {
  return value === "meeting" || value === "advanced";
}

function setTone(element: HTMLElement, tone: StatusTone): void {
  element.dataset.tone = tone;
}

export class SimpleLauncherController {
  private readonly ui: SimpleRefs;
  private settings: RuntimeSettings = defaultSettings();
  private snapshot: ProductRuntimeSnapshot | null = null;
  private activeWorkspace: ProductWorkspace = "meeting";
  private translating = false;
  private setupRunning = false;
  private voiceRunning = false;
  private meetingActionRunning = false;
  private settingsSaving = false;
  private diagnosticsRunning = false;
  private logsExpanded = false;
  private advancedDiagnosticsOpen = false;
  private lastTranslatedSource: string | null = null;

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

  private setTextResultState(state: TextResultState, label: string, message: string): void {
    this.ui.textResultStatus.dataset.state = state;
    this.ui.textResultStatus.textContent = label;
    this.ui.textResultMessage.textContent = message;
  }

  private refreshDirectionPill(): void {
    this.ui.textSourceLanguage.textContent = languageName(this.settings.source_language);
    this.ui.textTargetLanguage.textContent = languageName(this.settings.target_language);
    this.ui.textModeValue.textContent = this.settings.runtime_profile || "Current";
    if (this.activeWorkspace === "meeting") {
      this.ui.directionPill.textContent = "ID > EN";
      return;
    }
    this.ui.directionPill.textContent = `${this.settings.source_language.toUpperCase()} > ${this.settings.target_language.toUpperCase()}`;
  }

  private updateMeetingReadyView(
    readiness: ProductRuntimeSnapshot["readiness"],
    meeting: ProductRuntimeSnapshot["meeting"],
  ): void {
    const checking = readiness.level === "checking" && !meeting.hasSession;
    const meetingLabel = meeting.live
      ? "Live"
      : meeting.busy
        ? meeting.label
        : readiness.meetingReady
          ? "Ready"
          : checking
            ? "Checking"
            : meeting.label;
    const meetingTone: StatusTone = meeting.live || readiness.meetingReady
      ? "good"
      : checking || meeting.busy
        ? "neutral"
        : "warning";
    this.ui.meetingReadinessStatus.textContent = meetingLabel;
    setTone(this.ui.meetingReadinessStatus, meetingTone);

    const selectedInput = String(this.snapshot?.inputStatus?.selected_device_name ?? this.settings.audio.input_device_id ?? "").trim() || "Windows Default";
    this.ui.meetingInputDeviceValue.textContent = selectedInput;
    const microphoneLabel = readiness.microphoneReady ? "Ready" : checking ? "Checking" : "Setup Needed";
    this.ui.meetingInputDeviceStatus.textContent = microphoneLabel;
    setTone(this.ui.meetingInputDeviceStatus, readiness.microphoneReady ? "good" : checking ? "neutral" : "warning");

    const meetingSound = String(this.settings.audio.output_device_id ?? "").trim() || "Windows Default";
    this.ui.meetingSoundDeviceValue.textContent = `Meeting sound: ${meetingSound}`;

    const routeLabel = readiness.meetingRouteReady ? "Ready" : checking ? "Checking" : "Setup Needed";
    this.ui.meetingRouteStatus.textContent = routeLabel;
    setTone(this.ui.meetingRouteStatus, readiness.meetingRouteReady ? "good" : checking ? "neutral" : "warning");

    if (meeting.live) {
      this.ui.startTranslationButton.disabled = this.meetingActionRunning || !meeting.canStop;
      this.ui.startTranslationButton.textContent = this.meetingActionRunning ? "Working..." : "Stop Translation";
      this.ui.startTranslationHint.textContent = meeting.message;
      this.ui.retryReadinessButton.hidden = true;
      this.ui.fixSetupButton.hidden = true;
      return;
    }

    if (meeting.busy) {
      this.ui.startTranslationButton.disabled = true;
      this.ui.startTranslationButton.textContent = meeting.label === "Stopping" ? "Stopping..." : "Starting...";
      this.ui.startTranslationHint.textContent = meeting.message;
      this.ui.retryReadinessButton.hidden = true;
      this.ui.fixSetupButton.hidden = true;
      return;
    }

    this.ui.startTranslationButton.textContent = "Start Translation";
    this.ui.startTranslationButton.disabled = this.meetingActionRunning || !meeting.canStart;
    this.ui.startTranslationHint.textContent = meeting.canStart
      ? "Start Translation to begin the Meeting session. Other app views do not stop a live translation."
      : meeting.message || "Complete Meeting setup before Start Translation can be used.";
    this.ui.retryReadinessButton.hidden = false;
    this.ui.retryReadinessButton.disabled = false;
    this.ui.retryReadinessButton.textContent = readiness.meetingReady ? "Check Setup" : "Retry";
    this.ui.fixSetupButton.hidden = readiness.meetingReady;
  }

  private async refreshReadiness(preferredNotice?: string): Promise<void> {
    try {
      this.snapshot = await runtimeProductFacade.loadProductRuntimeSnapshot();
      this.settings = this.snapshot.settings ?? this.settings;
      this.refreshDirectionPill();
      const readiness = this.snapshot.readiness;
      const meeting = this.snapshot.meeting;
      this.ui.userPresence.textContent = meeting.live
        ? "Live"
        : readiness.meetingReady
          ? "Ready"
          : readiness.textReady
            ? "Degraded"
            : readiness.level === "blocked"
              ? "Setup Needed"
              : "Checking";
      this.ui.recordStatusText.textContent = meeting.live
        ? "Live"
        : meeting.busy
          ? meeting.label
          : readiness.meetingReady
            ? "Ready"
            : readiness.voiceReady
              ? "Route needed"
              : readiness.level === "checking"
                ? "Checking"
                : "Setup needed";
      this.ui.realtimeStatus.textContent = readiness.textStatus;
      this.ui.gpuStatus.textContent = this.snapshot.gpuPolicy?.cuda_available ? "CUDA ready" : this.snapshot.gpuPolicy?.cpu_fallback_active ? "CPU fallback" : "Checking";
      this.ui.developerOutput.textContent = JSON.stringify({ meeting, readiness, commandErrors: runtimeApi.getCommandErrors().slice(0, 5) }, null, 2);
      this.updateMeetingReadyView(readiness, meeting);
      this.notice(preferredNotice ?? (meeting.hasSession ? meeting.message : readiness.summary));
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
    this.refreshDirectionPill();
    if (workspace === "text") this.ui.messageInput.focus();
  }

  private showSettings(tab: ProductSettingsTab = "meeting", openDiagnostics = false): void {
    document.body.classList.add("settings-open");
    this.advancedDiagnosticsOpen = tab === "advanced" && openDiagnostics;
    this.ui.mainApp.dataset.route = "settings";
    this.ui.homePage.classList.add("is-hidden");
    this.ui.homePage.hidden = true;
    this.ui.homePage.style.display = "none";
    this.ui.settingsPage.classList.remove("is-hidden");
    this.ui.settingsPage.hidden = false;
    this.ui.settingsPage.style.display = "grid";
    this.renderSettings(tab);
  }

  private handleTextSourceInput(): void {
    if (this.lastTranslatedSource === null) {
      if (this.ui.textResultStatus.dataset.state === "error") {
        this.setTextResultState("idle", "Ready", "Select Translate when the source text is ready.");
      }
      return;
    }
    const currentSource = this.ui.messageInput.value.trim();
    if (currentSource === this.lastTranslatedSource) {
      this.setTextResultState("success", "Translated", "Translation matches the current source text.");
      return;
    }
    this.setTextResultState("stale", "Needs update", "Source text changed after the last translation. Translate again to update the result.");
  }

  private async submitText(): Promise<void> {
    const source = this.ui.messageInput.value.trim();
    if (!source) {
      this.setTextResultState("error", "Enter text", "Type or paste source text before translating.");
      this.notice("Type text before translating.");
      this.ui.messageInput.focus();
      return;
    }
    if (exceedsManualTranslationLimit(source)) {
      const message = `Text is too long. Limit: ${MAX_MANUAL_TRANSLATION_CHARS} characters.`;
      this.setTextResultState("error", "Text too long", message);
      this.notice(message);
      return;
    }
    if (this.translating) return;

    const requestSource = source;
    const previousTarget = this.ui.textTargetOutput.value;
    this.translating = true;
    this.ui.sendButton.disabled = true;
    this.ui.textSwapLanguageButton.disabled = true;
    this.ui.sendButton.textContent = "Translating...";
    this.setTextResultState("translating", "Translating", "Using the current local translation runtime.");
    this.notice("Translating with local engine...");

    try {
      const result = await runtimeProductFacade.runProductTranslation(requestSource);
      if (!result.ok) {
        this.ui.textTargetOutput.value = previousTarget;
        this.setTextResultState("error", "Couldn't translate", result.message);
        this.notice(`Translation blocked: ${result.message}`);
        return;
      }

      this.ui.textTargetOutput.value = result.translated;
      this.lastTranslatedSource = requestSource;
      const sourceStillCurrent = this.ui.messageInput.value.trim() === requestSource;
      if (sourceStillCurrent) {
        this.setTextResultState("success", "Translated", "Translation completed. You can review or edit the result.");
        this.notice("Translation completed.");
      } else {
        this.setTextResultState("stale", "Needs update", "The source changed while translating. The result is for the previous source text.");
        this.notice("Translation completed for the previous source text.");
      }
    } catch (error) {
      this.ui.textTargetOutput.value = previousTarget;
      const message = errorMessage(error);
      this.setTextResultState("error", "Couldn't translate", message);
      this.notice(`Translation failed: ${message}`);
    } finally {
      this.translating = false;
      this.ui.sendButton.disabled = false;
      this.ui.textSwapLanguageButton.disabled = this.settingsSaving;
      this.ui.sendButton.textContent = "Translate";
    }
  }

  private async swapTextLanguages(): Promise<void> {
    if (this.settingsSaving || this.translating) return;
    const previousSource = this.settings.source_language;
    const previousTarget = this.settings.target_language;
    const visibleTarget = this.ui.textTargetOutput.value;
    const result = applyLanguageSwap(this.settings);
    this.settings = result.settings;
    this.refreshDirectionPill();
    this.settingsSaving = true;
    this.ui.textSwapLanguageButton.disabled = true;
    try {
      const saveResult = await runtimeApi.saveSettings(this.settings);
      if (!saveResult.ok) throw Error(saveResult.message || "Language direction could not be saved.");
      this.settings = await runtimeApi.loadSettings().catch(() => this.settings);
      this.refreshDirectionPill();
      if (visibleTarget.trim()) {
        this.ui.messageInput.value = visibleTarget;
        this.ui.textTargetOutput.value = "";
        this.lastTranslatedSource = null;
        this.setTextResultState("idle", "Ready", "Target text moved to the source pane. Select Translate when ready.");
      }
      this.notice(result.notice);
    } catch (error) {
      this.settings.source_language = previousSource;
      this.settings.target_language = previousTarget;
      this.refreshDirectionPill();
      this.notice(`Language direction was not changed: ${errorMessage(error)}`);
    } finally {
      this.settingsSaving = false;
      this.ui.textSwapLanguageButton.disabled = this.translating;
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

  private async handleMeetingPrimaryAction(): Promise<void> {
    if (this.meetingActionRunning) return;
    const meeting = this.snapshot?.meeting;
    if (!meeting) {
      this.notice("Meeting state is still checking. Retry readiness before starting Translation.");
      return;
    }

    const action = meeting.canStop ? "stop" : "start";
    if (action === "start" && !meeting.canStart) {
      this.notice(this.snapshot?.readiness.nextAction ?? meeting.message);
      return;
    }
    if (action === "stop" && !meeting.canStop) {
      this.notice(meeting.message);
      return;
    }

    this.meetingActionRunning = true;
    this.ui.startTranslationButton.disabled = true;
    this.ui.retryReadinessButton.disabled = true;
    this.ui.startTranslationButton.textContent = action === "start" ? "Starting..." : "Stopping...";
    this.notice(action === "start" ? "Starting Meeting Translation..." : "Stopping Meeting Translation...");
    try {
      const result = await runtimeProductFacade.runProductMeetingAction(action);
      await this.refreshReadiness(result.message);
    } catch (error) {
      this.notice(`Meeting command failed: ${errorMessage(error)}`);
      await this.refreshReadiness();
    } finally {
      this.meetingActionRunning = false;
      if (this.snapshot) this.updateMeetingReadyView(this.snapshot.readiness, this.snapshot.meeting);
    }
  }

  private async toggleVoice(): Promise<void> {
    if (this.voiceRunning) return;
    const meeting = this.snapshot?.meeting;
    if (meeting?.hasSession) {
      this.notice(
        meeting.live
          ? "Mic Test is unavailable while Translation is live. Stop Translation from the Meeting workspace first."
          : "Mic Test is unavailable while Meeting resources are in use.",
      );
      return;
    }
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

  private renderSettings(tab: ProductSettingsTab): void {
    this.ui.settingsNavItems.forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === tab));
    if (tab === "meeting") {
      this.advancedDiagnosticsOpen = false;
      renderMeetingSettingsTab({
        ui: this.ui,
        settings: this.settings,
        onCheckAudioInput: () => void this.runSetup("check-microphone"),
        onStartOrStopRecording: () => void this.toggleVoice(),
        onCheckSetup: () => void this.fixSetup(),
      });
      return;
    }
    if (!this.advancedDiagnosticsOpen) {
      renderAdvancedSettingsTab({
        ui: this.ui,
        translationStatus: this.ui.realtimeStatus.textContent ?? "Checking",
        meetingStatus: this.ui.meetingReadinessStatus.textContent ?? "Checking",
        onOpenDiagnostics: () => {
          this.advancedDiagnosticsOpen = true;
          this.renderSettings("advanced");
        },
      });
      return;
    }
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
    logsButton?.addEventListener("click", () => { this.logsExpanded = !this.logsExpanded; this.renderSettings("advanced"); });
    const modelButton = document.getElementById("refreshModelInventoryButton") as HTMLButtonElement | null;
    modelButton?.addEventListener("click", () => void this.runSetup("verify-models"));
  }

  private async runDiagnostics(): Promise<void> {
    if (this.diagnosticsRunning) return;
    this.diagnosticsRunning = true;
    this.notice("Refreshing diagnostics...");
    try {
      await this.refreshReadiness("Diagnostics refreshed.");
      this.advancedDiagnosticsOpen = true;
      this.renderSettings("advanced");
    } finally {
      this.diagnosticsRunning = false;
    }
  }

  private bindEvents(): void {
    this.ui.sendButton.addEventListener("click", () => void this.submitText());
    this.ui.startTranslationButton.addEventListener("click", () => void this.handleMeetingPrimaryAction());
    this.ui.messageInput.addEventListener("input", () => this.handleTextSourceInput());
    this.ui.messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this.submitText();
      }
    });
    this.ui.textSwapLanguageButton.addEventListener("click", () => void this.swapTextLanguages());
    this.ui.workspaceNavItems.forEach((button) => button.addEventListener("click", () => {
      const workspace = button.dataset.workspaceNav;
      if (isWorkspace(workspace)) this.showWorkspace(workspace);
    }));
    this.ui.settingsButton.addEventListener("click", () => this.showSettings("meeting"));
    this.ui.backHomeButton.addEventListener("click", () => this.showWorkspace(this.activeWorkspace));
    this.ui.retryReadinessButton.addEventListener("click", () => void this.refreshReadiness("Readiness refreshed."));
    this.ui.fixSetupButton.addEventListener("click", () => void this.fixSetup());
    this.ui.settingsNavItems.forEach((button) => button.addEventListener("click", () => {
      const tab = button.dataset.settingsTab;
      if (!isSettingsTab(tab)) return;
      this.advancedDiagnosticsOpen = false;
      this.renderSettings(tab);
    }));
  }
}
