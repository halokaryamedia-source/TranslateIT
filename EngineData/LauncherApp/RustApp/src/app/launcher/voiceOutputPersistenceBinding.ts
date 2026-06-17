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

async function persistVoiceOutputToggle(): Promise<void> {
  if (savePending) return;
  savePending = true;
  try {
    const settings = await runtimeApi.loadSettings();
    if (!settings) {
      setAssistantMessage("Voice output setting could not be loaded yet.");
      return;
    }
    const nextSettings = nextVoiceSettings(settings);
    const result = await runtimeApi.saveSettings(nextSettings);
    if (!result?.ok) {
      setAssistantMessage(result?.message ?? "Voice output setting could not be saved.");
      return;
    }
    setAssistantMessage(nextSettings.audio.auto_play_out_voice ? "Voice output enabled and saved." : "Voice output disabled and saved.");
  } finally {
    savePending = false;
  }
}

export function bindVoiceOutputPersistenceUi(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (!target?.closest("#voiceOutputButton")) return;
    void persistVoiceOutputToggle();
  });
}
