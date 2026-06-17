import { runtimeApi } from "../engineTranslate/runtimeApi";
import type { RuntimeSettings } from "../shared/types";

let bound = false;
let savePending = false;

type LanguagePair = { source: string; target: string };

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

function readDirectionPair(): LanguagePair | null {
  const text = document.getElementById("directionPill")?.textContent?.trim().toLowerCase() ?? "";
  const parts = text.split(">").map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const [source, target] = parts;
  if (!["id", "en"].includes(source) || !["id", "en"].includes(target) || source === target) return null;
  return { source, target };
}

function directionSettings(settings: RuntimeSettings, pair: LanguagePair): RuntimeSettings {
  return {
    ...settings,
    source_language: pair.source,
    target_language: pair.target,
  };
}

async function copyText(value: string): Promise<void> {
  if (!value.trim()) {
    setAssistantMessage("There is no text to copy yet.");
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    setAssistantMessage("Copied to clipboard.");
  } catch (_error) {
    setAssistantMessage("Clipboard copy is unavailable in this runtime. Select the text manually.");
  }
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

async function persistTranslateDirection(): Promise<void> {
  const pair = readDirectionPair();
  if (!pair) {
    setAssistantMessage("Translate direction could not be read yet.");
    return;
  }
  const settings = await runtimeApi.loadSettings();
  if (!settings) {
    setAssistantMessage("Translate settings could not be loaded yet.");
    return;
  }
  await persistSettings(directionSettings(settings, pair), `Translate direction saved as ${pair.source.toUpperCase()} > ${pair.target.toUpperCase()}.`);
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
    const copyButton = target?.closest<HTMLButtonElement>("[data-copy-translation]");
    if (copyButton) {
      event.preventDefault();
      void copyText(copyButton.dataset.copyTranslation ?? "");
      return;
    }
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
      return;
    }
    if (target?.closest("#saveTranslateButton")) {
      void runSavedSettingTask(persistTranslateDirection);
    }
  });
}
