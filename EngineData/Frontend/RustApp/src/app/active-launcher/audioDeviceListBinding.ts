import { runtimeApi } from "../bridge/runtimeApi";

let bound = false;
let clickHandler: ((event: MouseEvent) => void) | null = null;

function setAssistantMessage(message: string): void {
  const element = document.querySelector<HTMLElement>("#assistantMessage");
  if (element) element.textContent = message;
}

function updateAudioLabel(labelId: string, fallbackSelector: string, value: string): void {
  const direct = document.getElementById(labelId);
  if (direct) {
    direct.textContent = value;
    return;
  }
  const fallback = document.querySelector<HTMLElement>(fallbackSelector);
  if (fallback) fallback.textContent = value;
}

async function refreshAudioDeviceLabels(): Promise<void> {
  const report = await runtimeApi.listAudioDevices();
  if (!report.ok) {
    setAssistantMessage(report.note || report.blocker || "Audio devices could not be listed yet.");
    return;
  }

  const input = report.input_devices.find((device) => device.is_default) ?? report.input_devices[0];
  const output = report.output_devices.find((device) => device.is_default) ?? report.output_devices[0];

  updateAudioLabel("audioInputLabel", "#checkAudioInputButton span:first-child", input?.name ?? "Default microphone");
  updateAudioLabel("audioOutputLabel", "#audioVoiceToggleButton span:first-child", output?.name ?? "Default speaker");

  setAssistantMessage(`Audio devices checked. Input: ${input?.name ?? "not found"}. Output: ${output?.name ?? "not found"}.`);
}

export function bindAudioDeviceListUi(): () => void {
  if (bound) return unbindAudioDeviceListUi;
  bound = true;
  clickHandler = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target?.closest("#checkAudioInputButton,#audioVoiceToggleButton")) return;
    void refreshAudioDeviceLabels().catch(() => {
      setAssistantMessage("Audio device list failed before returning a result.");
    });
  };
  document.addEventListener("click", clickHandler, true);
  return unbindAudioDeviceListUi;
}

export function unbindAudioDeviceListUi(): void {
  if (!bound || !clickHandler) return;
  document.removeEventListener("click", clickHandler, true);
  clickHandler = null;
  bound = false;
}
