export type ButtonLocation =
  | "shell"
  | "home"
  | "settings-general"
  | "settings-audio"
  | "settings-translate"
  | "settings-developer";

export type ButtonActionContract = {
  selector: string;
  label: string;
  location: ButtonLocation;
  expectedAction: string;
  required: boolean;
  interactive?: boolean;
  statusOnly?: boolean;
};

export const BUTTON_ACTION_CONTRACTS: ButtonActionContract[] = [
  { selector: "#newChatButton", label: "New Chat", location: "shell", expectedAction: "createNewChat", required: true },
  { selector: "#recentChatButton", label: "Recent Chat", location: "shell", expectedAction: "showRecentChat", required: true },
  { selector: "#unsavedChatButton", label: "Unsaved Chat", location: "shell", expectedAction: "showUnsavedChat", required: true },
  { selector: "#savedChatButton", label: "Saved Chat", location: "shell", expectedAction: "showSavedChat", required: true },
  { selector: "#localDataButton", label: "Local Data", location: "shell", expectedAction: "showLocalData", required: true },
  { selector: "#quickMicButton", label: "Quick Mic", location: "shell", expectedAction: "startOrStopRecording", required: true },
  { selector: "#micOptionsButton", label: "Mic Options", location: "shell", expectedAction: "openAudioSettings", required: true },
  { selector: "#voiceOutputButton", label: "Voice Output", location: "shell", expectedAction: "toggleVoiceOutput", required: true },
  { selector: "#voiceOptionsButton", label: "Voice Options", location: "shell", expectedAction: "openAudioSettings", required: true },
  { selector: "#settingsButton", label: "Settings", location: "shell", expectedAction: "openGeneralSettings", required: true },
  { selector: "#recordStatusButton", label: "Record Status", location: "home", expectedAction: "startOrStopRecording", required: true },
  { selector: "#checkMicButton", label: "Check Microphone", location: "home", expectedAction: "prepareAndStartVoiceCapture", required: true },
  { selector: "#startHelperButton", label: "Start Helper", location: "home", expectedAction: "startHelperBridge", required: true },
  { selector: "#checkWorkerStatusButton", label: "Check Worker Status", location: "home", expectedAction: "checkWorkerStatus", required: true },
  { selector: "#openDeveloperDiagnosticsButton", label: "Open Developer Diagnostics", location: "home", expectedAction: "openDeveloperDiagnostics", required: true },
  { selector: "#composerPlusButton", label: "Attach Text", location: "home", expectedAction: "openAttachmentInput", required: true },
  { selector: "#microphoneButton", label: "Microphone", location: "home", expectedAction: "startOrStopRecording", required: true },
  { selector: "#sendButton", label: "Send", location: "home", expectedAction: "submitText", required: true },
  { selector: "#backHomeButton", label: "Back", location: "settings-general", expectedAction: "showHome", required: true },
  { selector: '[data-settings-tab="general"]', label: "General", location: "settings-general", expectedAction: "renderSettingsTab(\"general\")", required: true },
  { selector: '[data-settings-tab="audio"]', label: "Audio", location: "settings-audio", expectedAction: "renderSettingsTab(\"audio\")", required: true },
  { selector: '[data-settings-tab="translate"]', label: "Translate", location: "settings-translate", expectedAction: "renderSettingsTab(\"translate\")", required: true },
  { selector: '[data-settings-tab="developer"]', label: "Developer", location: "settings-developer", expectedAction: "renderSettingsTab(\"developer\")", required: true },
  { selector: "#saveSettingsButton", label: "Save Settings", location: "settings-general", expectedAction: "saveCurrentSettings", required: true },
  { selector: "#resetSettingsButton", label: "Reset Settings", location: "settings-general", expectedAction: "saveDefaultSettings", required: true },
  { selector: "#runtimeProfileButton", label: "Runtime Profile", location: "settings-general", expectedAction: "toggleRuntimeProfile", required: true },
  { selector: "#languageFocusButton", label: "Language Focus", location: "settings-general", expectedAction: "cycleLanguageFocusMode", required: true },
  { selector: "#checkAudioInputButton", label: "Check Microphone", location: "settings-audio", expectedAction: "checkAudioInput", required: true },
  { selector: "#micTestButton", label: "Mic Test", location: "settings-audio", expectedAction: "startOrStopRecording", required: true },
  { selector: "#audioVoiceToggleButton", label: "Voice Toggle", location: "settings-audio", expectedAction: "toggleVoiceOutput", required: true },
  { selector: "#audioSensitivityButton", label: "Voice Mode", location: "settings-audio", expectedAction: "toggleRuntimeProfile", required: true },
  { selector: "#sourceLanguageButton", label: "Source Language", location: "settings-translate", expectedAction: "toggleLanguageSelector(\"source\")", required: true },
  { selector: "#targetLanguageButton", label: "Target Language", location: "settings-translate", expectedAction: "toggleLanguageSelector(\"target\")", required: true },
  { selector: "#swapLanguageButton", label: "Swap Languages", location: "settings-translate", expectedAction: "swapLanguages", required: true },
  { selector: '[data-language-role]', label: "Language option", location: "settings-translate", expectedAction: "selectLanguage", required: true },
  { selector: "#realtimeModeButton", label: "Realtime Mode", location: "settings-translate", expectedAction: "setRuntimeProfile(\"Realtime\")", required: true },
  { selector: "#qualityModeButton", label: "Quality Mode", location: "settings-translate", expectedAction: "setRuntimeProfile(\"Quality\")", required: true },
  { selector: "#saveTranslateButton", label: "Save Translate", location: "settings-translate", expectedAction: "saveCurrentSettings", required: true },
  { selector: "#runDiagnosticButton", label: "Run Diagnostic", location: "settings-developer", expectedAction: "runDeveloperDiagnostic", required: true },
  { selector: "#seeAllLogsButton", label: "See All Logs", location: "settings-developer", expectedAction: "toggle logs view", required: true },
  { selector: "#refreshModelInventoryButton", label: "Refresh Model Inventory", location: "settings-developer", expectedAction: "refreshModelInventory", required: false },
  { selector: '[data-helper-bridge-action="start"]', label: "Start Helper", location: "settings-developer", expectedAction: "runtimeApi.startHelperBridge", required: true },
  { selector: '[data-helper-bridge-action="status"]', label: "Worker Status", location: "settings-developer", expectedAction: "runtimeApi.sendHelperBridgeRequest(status)", required: true },
  { selector: '[data-helper-bridge-action="stop"]', label: "Stop Helper", location: "settings-developer", expectedAction: "runtimeApi.stopHelperBridge", required: true },
  { selector: '[data-helper-bridge-action="cancel"]', label: "Cancel Task", location: "settings-developer", expectedAction: "runtimeApi.cancelHelperBridgeTask", required: true },
  { selector: '[data-capture-bridge-action="start-preview"]', label: "Preview Capture Start", location: "settings-developer", expectedAction: "runtimeApi.prepareCaptureStartRequest", required: true },
  { selector: '[data-capture-bridge-action="stop-preview"]', label: "Preview Capture Stop", location: "settings-developer", expectedAction: "runtimeApi.prepareCaptureStopRequest", required: true },
];

