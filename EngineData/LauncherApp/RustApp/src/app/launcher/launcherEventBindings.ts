import { RUNTIME_SETTINGS_SAVED_EVENT } from "../engineTranslate/runtimeApi";
import type { RuntimeSettings, SettingsTab } from "../shared/types";
import type { UiRefs } from "./dom";
import { traceUserFlow } from "./userFlowTrace";

export type LauncherEventHandlers = {
  showSettings: () => void;
  openGeneralSettings: () => void;
  showHome: () => void;
  startOrStopRecording: () => Promise<void>;
  submitText: () => Promise<void>;
  resizeMessageInput: () => void;
  createNewChat: () => Promise<void>;
  prepareAndStartVoiceCapture: () => Promise<void>;
  startHelperBridge: () => Promise<void>;
  checkWorkerStatus: () => Promise<void>;
  openDeveloperDiagnostics: () => Promise<void>;
  openAttachmentInput: () => void;
  ingestAttachmentFiles: () => Promise<void>;
  bindAttachmentDropZone: () => void;
  showRecentChat: () => Promise<void>;
  showUnsavedChat: () => Promise<void>;
  showSavedChat: () => Promise<void>;
  showLocalData: () => Promise<void>;
  openAudioSettings: () => void;
  toggleVoiceOutput: () => void;
  renderSettingsTab: (tab: SettingsTab) => void;
  applyRuntimeSettings: (settings: RuntimeSettings) => void;
};

export function bindLauncherEvents(ui: UiRefs, handlers: LauncherEventHandlers): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal };

  ui.settingsButton.addEventListener("click", handlers.openGeneralSettings, options);
  ui.backHomeButton.addEventListener("click", handlers.showHome, options);
  ui.microphoneButton.addEventListener("click", () => void handlers.startOrStopRecording(), options);
  ui.quickMicButton.addEventListener("click", () => void handlers.startOrStopRecording(), options);
  ui.recordStatusButton.addEventListener("click", () => void handlers.startOrStopRecording(), options);
  ui.checkMicButton.addEventListener("click", () => void handlers.prepareAndStartVoiceCapture(), options);
  ui.startHelperButton.addEventListener("click", () => void handlers.startHelperBridge(), options);
  ui.checkWorkerStatusButton.addEventListener("click", () => void handlers.checkWorkerStatus(), options);
  ui.openDeveloperDiagnosticsButton.addEventListener("click", () => void handlers.openDeveloperDiagnostics(), options);
  ui.sendButton.addEventListener("click", () => void handlers.submitText(), options);
  ui.messageInput.addEventListener("input", handlers.resizeMessageInput, options);
  ui.messageInput.addEventListener("focus", () => traceUserFlow("text.input.focus", {}), options);
  ui.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handlers.submitText();
    }
  }, options);
  ui.newChatButton.addEventListener("click", () => void handlers.createNewChat(), options);
  ui.composerPlusButton.addEventListener("click", handlers.openAttachmentInput, options);
  ui.attachmentInput.addEventListener("change", () => void handlers.ingestAttachmentFiles(), options);
  handlers.bindAttachmentDropZone();
  ui.recentChatButton.addEventListener("click", () => void handlers.showRecentChat(), options);
  ui.unsavedChatButton.addEventListener("click", () => void handlers.showUnsavedChat(), options);
  ui.savedChatButton.addEventListener("click", () => void handlers.showSavedChat(), options);
  ui.localDataButton.addEventListener("click", () => void handlers.showLocalData(), options);
  ui.micOptionsButton.addEventListener("click", handlers.openAudioSettings, options);
  ui.voiceOutputButton.addEventListener("click", handlers.toggleVoiceOutput, options);
  ui.voiceOptionsButton.addEventListener("click", handlers.openAudioSettings, options);
  ui.settingsNavItems.forEach((button) => button.addEventListener("click", () => handlers.renderSettingsTab(button.dataset.settingsTab as SettingsTab), options));
  window.addEventListener(RUNTIME_SETTINGS_SAVED_EVENT, (event) => {
    const settings = (event as CustomEvent<RuntimeSettings>).detail;
    if (settings) handlers.applyRuntimeSettings(settings);
  }, options);

  return () => controller.abort();
}
