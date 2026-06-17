import { RUNTIME_SETTINGS_SAVED_EVENT } from "../engineTranslate/runtimeApi";
import type { RuntimeSettings, SettingsTab } from "../shared/types";
import type { UiRefs } from "./dom";

export type LauncherEventHandlers = {
  showSettings: () => void;
  showHome: () => void;
  startOrStopRecording: () => Promise<void>;
  submitText: () => Promise<void>;
  resizeMessageInput: () => void;
  createNewChat: () => Promise<void>;
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

export function bindLauncherEvents(ui: UiRefs, handlers: LauncherEventHandlers): void {
  ui.settingsButton.addEventListener("click", handlers.showSettings);
  ui.backHomeButton.addEventListener("click", handlers.showHome);
  ui.microphoneButton.addEventListener("click", () => void handlers.startOrStopRecording());
  ui.quickMicButton.addEventListener("click", () => void handlers.startOrStopRecording());
  ui.recordStatusButton.addEventListener("click", () => void handlers.startOrStopRecording());
  ui.sendButton.addEventListener("click", () => void handlers.submitText());
  ui.messageInput.addEventListener("input", handlers.resizeMessageInput);
  ui.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handlers.submitText();
    }
  });
  ui.newChatButton.addEventListener("click", () => void handlers.createNewChat());
  ui.composerPlusButton.addEventListener("click", handlers.openAttachmentInput);
  ui.attachmentInput.addEventListener("change", () => void handlers.ingestAttachmentFiles());
  handlers.bindAttachmentDropZone();
  ui.recentChatButton.addEventListener("click", () => void handlers.showRecentChat());
  ui.unsavedChatButton.addEventListener("click", () => void handlers.showUnsavedChat());
  ui.savedChatButton.addEventListener("click", () => void handlers.showSavedChat());
  ui.localDataButton.addEventListener("click", () => void handlers.showLocalData());
  ui.micOptionsButton.addEventListener("click", handlers.openAudioSettings);
  ui.voiceOutputButton.addEventListener("click", handlers.toggleVoiceOutput);
  ui.voiceOptionsButton.addEventListener("click", handlers.openAudioSettings);
  ui.settingsNavItems.forEach((button) => button.addEventListener("click", () => handlers.renderSettingsTab(button.dataset.settingsTab as SettingsTab)));
  window.addEventListener(RUNTIME_SETTINGS_SAVED_EVENT, (event) => {
    const settings = (event as CustomEvent<RuntimeSettings>).detail;
    if (settings) handlers.applyRuntimeSettings(settings);
  });
}
