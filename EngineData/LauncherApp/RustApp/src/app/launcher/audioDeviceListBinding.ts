import { runtimeApi } from "../engineTranslate/runtimeApi";
import type { AudioDeviceSummary, RuntimeSettings } from "../shared/types";

const INPUT_BUTTON_SELECTOR = "#checkAudioInputButton,#micOptionsButton";
const OUTPUT_BUTTON_SELECTOR = "#audioVoiceToggleButton,#voiceOptionsButton";
const DEVICE_BUTTON_SELECTOR = `${INPUT_BUTTON_SELECTOR},${OUTPUT_BUTTON_SELECTOR}`;
let bound = false;

function deviceNames(devices: AudioDeviceSummary[], fallback: string): string {
  if (devices.length === 0) return fallback;
  return devices
    .slice(0, 6)
    .map((device) => `${device.name}${device.is_default ? " (default)" : ""}`)
    .join("; ");
}

function shortDeviceLabel(device: AudioDeviceSummary): string {
  const name = device.name.trim();
  if (name.length <= 42) return `${name}${device.is_default ? " (default)" : ""}`;
  return `${name.slice(0, 39).trim()}...${device.is_default ? " (default)" : ""}`;
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

async function showAudioDevices(kind: "input" | "output" | "both"): Promise<void> {
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

  if (kind === "both") {
    setAssistantMessage(`Detected ${report.input_devices.length} microphone(s) and ${report.output_devices.length} speaker device(s).`);
    return;
  }

  const settings = await runtimeApi.loadSettings();
  if (!settings) {
    setAssistantMessage("Audio devices were found, but settings could not be loaded yet.");
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

export function bindAudioDeviceListUi(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (!target?.closest(DEVICE_BUTTON_SELECTOR)) return;
    if (target.closest(INPUT_BUTTON_SELECTOR)) {
      void showAudioDevices("input");
      return;
    }
    if (target.closest(OUTPUT_BUTTON_SELECTOR)) {
      void showAudioDevices("output");
      return;
    }
    void showAudioDevices("both");
  });
}
