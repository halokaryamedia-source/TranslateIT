import { runtimeApi } from "../engineTranslate/runtimeApi";
import type { AudioDeviceSummary, RuntimeSettings } from "../shared/types";

const INPUT_BUTTON_SELECTOR = "#checkAudioInputButton";
const OUTPUT_BUTTON_SELECTOR = "#audioVoiceToggleButton";
const DEVICE_BUTTON_SELECTOR = `${INPUT_BUTTON_SELECTOR},${OUTPUT_BUTTON_SELECTOR}`;
let bound = false;
let labelSyncPending = false;
let observer: MutationObserver | null = null;
let clickHandler: ((event: MouseEvent) => void) | null = null;

function deviceNames(devices: AudioDeviceSummary[], fallback: string): string {
  if (devices.length === 0) return fallback;
  return devices
    .slice(0, 6)
    .map((device) => `${device.name}${device.is_default ? " (default)" : ""}`)
    .join("; ");
}

function compactText(value: string, limit = 42): string {
  const text = value.trim();
  return text.length <= limit ? text : `${text.slice(0, limit - 3).trim()}...`;
}

function shortDeviceLabel(device: AudioDeviceSummary): string {
  return `${compactText(device.name)}${device.is_default ? " (default)" : ""}`;
}

function settingsDeviceLabel(value: string | null | undefined, fallback: string): string {
  return value?.trim() ? compactText(value) : fallback;
}

function setButtonLabel(selector: string, value: string): void {
  document.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
    const label = button.querySelector("span:not(.icon)");
    if (label) label.textContent = value;
  });
}

function setAssistantMessage(message: string): void {
  const element = document.querySelector<HTMLElement>("#assistantMessage");
  if (element) element.textContent = message;
}

function setDeveloperOutput(message: string): void {
  const element = document.querySelector<HTMLElement>("#developerOutput");
  if (element) element.textContent = message;
}

function nextDevice(devices: AudioDeviceSummary[], currentId: string | null | undefined): AudioDeviceSummary | null {
  if (devices.length === 0) return null;
  const currentIndex = devices.findIndex((device) => device.id === currentId || device.name === currentId);
  if (currentIndex < 0) return devices.find((device) => device.is_default) ?? devices[0];
  return devices[(currentIndex + 1) % devices.length];
}

async function syncDeviceLabelsFromSettings(): Promise<void> {
  if (labelSyncPending) return;
  if (!document.querySelector(DEVICE_BUTTON_SELECTOR)) return;
  labelSyncPending = true;
  try {
    const settings = await runtimeApi.loadSettings();
    if (!settings) return;
    setButtonLabel(INPUT_BUTTON_SELECTOR, settingsDeviceLabel(settings.audio.input_device_id, "Default microphone"));
    setButtonLabel(OUTPUT_BUTTON_SELECTOR, settings.audio.auto_play_out_voice ? settingsDeviceLabel(settings.audio.output_device_id, "Default speaker") : "Speaker disabled");
  } finally {
    labelSyncPending = false;
  }
}

async function saveSelectedDevice(kind: "input" | "output", device: AudioDeviceSummary, settings: RuntimeSettings): Promise<void> {
  const nextSettings: RuntimeSettings = {
    ...settings,
    audio: {
      ...settings.audio,
      input_device_id: kind === "input" ? device.id : settings.audio.input_device_id,
      output_device_id: kind === "output" ? device.id : settings.audio.output_device_id,
    },
  };
  await runtimeApi.saveSettings(nextSettings);
}

async function enableSpeakerOutput(settings: RuntimeSettings): Promise<void> {
  const nextSettings: RuntimeSettings = {
    ...settings,
    audio: {
      ...settings.audio,
      auto_play_out_voice: true,
      auto_play_translation_voice: true,
    },
  };
  await runtimeApi.saveSettings(nextSettings);
  setButtonLabel(OUTPUT_BUTTON_SELECTOR, settingsDeviceLabel(settings.audio.output_device_id, "Default speaker"));
  setAssistantMessage("Speaker output enabled. Click Speaker again to choose another output device.");
}

async function showAudioDevices(kind: "input" | "output"): Promise<void> {
  setAssistantMessage("Checking local audio devices...");
  const report = await runtimeApi.listAudioDevices();
  if (!report || !report.ok) {
    const blocker = report?.blocker || "audio_devices:unavailable";
    setAssistantMessage("Audio devices were not found yet. Check Windows sound settings or reconnect your microphone.");
    setDeveloperOutput(`audio devices unavailable: ${blocker}`);
    return;
  }

  const input = deviceNames(report.input_devices, "no microphone found");
  const output = deviceNames(report.output_devices, "no speaker found");
  setDeveloperOutput(`microphones: ${input}\nspeakers: ${output}\n${report.note}`);

  const settings = await runtimeApi.loadSettings();
  if (!settings) {
    setAssistantMessage("Audio devices were found, but settings could not be loaded yet.");
    return;
  }

  if (kind === "output" && !settings.audio.auto_play_out_voice) {
    await enableSpeakerOutput(settings);
    return;
  }

  const devices = kind === "input" ? report.input_devices : report.output_devices;
  const currentId = kind === "input" ? settings.audio.input_device_id : settings.audio.output_device_id;
  const selected = nextDevice(devices, currentId);
  if (!selected) {
    setAssistantMessage(kind === "input" ? "No microphone device is available." : "No speaker device is available.");
    return;
  }

  await saveSelectedDevice(kind, selected, settings);
  const label = shortDeviceLabel(selected);
  setButtonLabel(kind === "input" ? INPUT_BUTTON_SELECTOR : OUTPUT_BUTTON_SELECTOR, label);
  setAssistantMessage(`${kind === "input" ? "Microphone" : "Speaker"} selected: ${label}.`);
}

export function bindAudioDeviceListUi(): () => void {
  if (bound) return unbindAudioDeviceListUi;
  bound = true;
  observer = new MutationObserver(() => { void syncDeviceLabelsFromSettings(); });
  observer.observe(document.body, { childList: true, subtree: true });
  void syncDeviceLabelsFromSettings();
  clickHandler = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target?.closest(DEVICE_BUTTON_SELECTOR)) return;
    if (target.closest(INPUT_BUTTON_SELECTOR)) {
      event.preventDefault();
      event.stopPropagation();
      void showAudioDevices("input");
      return;
    }
    if (target.closest(OUTPUT_BUTTON_SELECTOR)) {
      event.preventDefault();
      event.stopPropagation();
      void showAudioDevices("output");
    }
  };
  document.addEventListener("click", clickHandler, true);
  return unbindAudioDeviceListUi;
}

export function unbindAudioDeviceListUi(): void {
  if (!bound) return;
  observer?.disconnect();
  observer = null;
  if (clickHandler) document.removeEventListener("click", clickHandler, true);
  clickHandler = null;
  labelSyncPending = false;
  bound = false;
}
