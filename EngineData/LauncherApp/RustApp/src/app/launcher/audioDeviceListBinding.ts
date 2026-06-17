import { runtimeApi } from "../engineTranslate/runtimeApi";
import type { AudioDeviceSummary } from "../shared/types";

const DEVICE_BUTTON_SELECTOR = "#checkAudioInputButton,#micOptionsButton,#audioVoiceToggleButton,#voiceOptionsButton";
let bound = false;

function deviceNames(devices: AudioDeviceSummary[], fallback: string): string {
  if (devices.length === 0) return fallback;
  return devices
    .slice(0, 6)
    .map((device) => `${device.name}${device.is_default ? " (default)" : ""}`)
    .join("; ");
}

function setAssistantMessage(message: string): void {
  const element = document.querySelector<HTMLElement>("#assistantMessage");
  if (element) element.textContent = message;
}

function setDeveloperOutput(message: string): void {
  const element = document.querySelector<HTMLElement>("#developerOutput");
  if (element) element.textContent = message;
}

async function showAudioDevices(): Promise<void> {
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
  setAssistantMessage(`Detected ${report.input_devices.length} microphone(s) and ${report.output_devices.length} speaker device(s).`);
  setDeveloperOutput(`microphones: ${input}\nspeakers: ${output}\n${report.note}`);
}

export function bindAudioDeviceListUi(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (!target?.closest(DEVICE_BUTTON_SELECTOR)) return;
    void showAudioDevices();
  });
}
