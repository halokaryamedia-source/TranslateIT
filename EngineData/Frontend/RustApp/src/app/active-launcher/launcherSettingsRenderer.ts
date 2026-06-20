import { languageName } from "../shared/state";
import type { RuntimeSettings, SettingsTab } from "../shared/types";
import type { LanguageSelectorRole } from "./launcherLanguageRules";
import { LANGUAGE_OPTIONS } from "./launcherLanguageRules";
import { requireElement, type UiRefs } from "./dom";
import { audioSettingsView, generalSettingsView, translateSettingsView } from "./settingsViews";

export function renderGeneralSettingsTab(args: {
  ui: UiRefs;
  settings: RuntimeSettings;
  realtimeStatusText: string | null;
  gpuStatusText: string | null;
  onToggleRuntimeProfile: () => void;
  onToggleLanguageFocusMode: () => void;
  onSaveSettings: () => void;
  onResetSettings: () => void;
}): void {
  args.ui.settingsContent.innerHTML = generalSettingsView(args.settings, args.realtimeStatusText, args.gpuStatusText);
  const runtimeProfileButton = document.getElementById("runtimeProfileButton") as HTMLButtonElement | null;
  if (runtimeProfileButton) runtimeProfileButton.addEventListener("click", () => args.onToggleRuntimeProfile());
  const languageFocusButton = document.getElementById("languageFocusButton") as HTMLButtonElement | null;
  if (languageFocusButton) languageFocusButton.addEventListener("click", () => args.onToggleLanguageFocusMode());
  requireElement<HTMLButtonElement>("#saveSettingsButton").addEventListener("click", () => args.onSaveSettings());
  requireElement<HTMLButtonElement>("#resetSettingsButton").addEventListener("click", () => args.onResetSettings());
}

export function renderAudioSettingsTab(args: {
  ui: UiRefs;
  settings: RuntimeSettings;
  onCheckAudioInput: () => void;
  onStartOrStopRecording: () => void;
  onToggleVoiceOutput: () => void;
  onToggleRuntimeProfile: () => void;
}): void {
  args.ui.settingsContent.innerHTML = audioSettingsView(args.settings);
  requireElement<HTMLButtonElement>("#checkAudioInputButton").addEventListener("click", () => args.onCheckAudioInput());
  requireElement<HTMLButtonElement>("#micTestButton").addEventListener("click", () => args.onStartOrStopRecording());
  requireElement<HTMLButtonElement>("#audioVoiceToggleButton").addEventListener("click", () => args.onToggleVoiceOutput());
}

export function renderTranslateSettingsTab(args: {
  ui: UiRefs;
  settings: RuntimeSettings;
  activeLanguageSelector: LanguageSelectorRole | null;
  onToggleLanguageSelector: (role: LanguageSelectorRole) => void;
  onSelectLanguage: (role: LanguageSelectorRole, code: string) => void;
  onSwapLanguages: () => void;
  onSetRuntimeProfile: (profile: "Realtime" | "Quality") => void;
  onSaveSettings: () => void;
}): void {
  args.ui.settingsContent.innerHTML = translateSettingsView(args.settings, languageName(args.settings.source_language), languageName(args.settings.target_language), args.activeLanguageSelector, LANGUAGE_OPTIONS);
  requireElement<HTMLButtonElement>("#sourceLanguageButton").addEventListener("click", () => args.onToggleLanguageSelector("source"));
  requireElement<HTMLButtonElement>("#targetLanguageButton").addEventListener("click", () => args.onToggleLanguageSelector("target"));
  requireElement<HTMLButtonElement>("#swapLanguageButton").addEventListener("click", () => args.onSwapLanguages());
  document.querySelectorAll<HTMLButtonElement>("[data-language-role]").forEach((button) => button.addEventListener("click", () => args.onSelectLanguage(button.dataset.languageRole as LanguageSelectorRole, button.dataset.languageCode ?? "")));
  requireElement<HTMLButtonElement>("#realtimeModeButton").addEventListener("click", () => args.onSetRuntimeProfile("Realtime"));
  requireElement<HTMLButtonElement>("#qualityModeButton").addEventListener("click", () => args.onSetRuntimeProfile("Quality"));
  requireElement<HTMLButtonElement>("#saveTranslateButton").addEventListener("click", () => args.onSaveSettings());
}