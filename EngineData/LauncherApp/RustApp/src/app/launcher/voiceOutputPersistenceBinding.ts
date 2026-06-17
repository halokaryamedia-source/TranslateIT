import { runtimeApi } from "../engineTranslate/runtimeApi";
import type { RuntimeSettings } from "../shared/types";

let bound = false;
let savePending = false;

function setAssistantMessage(message: string): void {
  const element = document.querySelector<HTMLElement>("#assistantMessage");
  if (element) element.textContent = message;
}

function nextVoiceSettings(settings: RuntimeSettings): RuntimeSettings {
  const enabled = !settings.audio.auto_play_out_voice;
  return {
    ...settings,
    audio: {
      ...settings.audio,
      auto_play_out_voice: enabled,
      auto_play_translation_voice: enabled,
    },
  };
}

function profileSettings(settings: RuntimeSettings, profile: "Realtime" | "Quality"): RuntimeSettings {
  return {
    ...settings,
    runtime_profile: profile,
    audio: {
      ...settings.audio,
      input_sensitivity: profile,
    },
  };
}

async function persistSettings(nextSettings: RuntimeSettings, successMessage: string): Promise<void> {
  const result = await runtimeApi.saveSettings(nextSettings);
  setAssistantMessage(result?.ok ? successMessage : result?.message ?? "Setting could not be saved.");
}

async function persistVoiceOutputToggle(): Promise<void> {
  const settings = await runtimeApi.loadSettings();
  if (!settings) {
    setAssistantMessage("Voice output setting could not be loaded yet.");
    return;
  }
  const nextSettings = nextVoiceSettings(settings);
  await persistSettings(nextSettings, nextSettings.audio.auto_play_out_voice ? "Voice output enabled and saved." : "Voice output disabled and saved.");
}

async function persistRuntimeProfile(profile: "Realtime" | "Quality"): Promise<void> {
  const settings = await runtimeApi.loadSettings();
  if (!settings) {
    setAssistantMessage("Translate mode could not be loaded yet.");
    return;
  }
  await persistSettings(profileSettings(settings, profile), `Translate mode saved as ${profile}.`);
}

async function runSavedSettingTask(task: () => Promise<void>): Promise<void> {
  if (savePending) return;
  savePending = true;
  try {
    await task();
  } finally {
    savePending = false;
  }
}

export function bindVoiceOutputPersistenceUi(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (target?.closest("#voiceOutputButton")) {
      void runSavedSettingTask(persistVoiceOutputToggle);
      return;
    }
    if (target?.closest("#realtimeModeButton")) {
      void runSavedSettingTask(() => persistRuntimeProfile("Realtime"));
      return;
    }
    if (target?.closest("#qualityModeButton")) {
      void runSavedSettingTask(() => persistRuntimeProfile("Quality"));
    }
  });
}
