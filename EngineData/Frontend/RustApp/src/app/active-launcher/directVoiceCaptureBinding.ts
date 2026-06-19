import { runtimeApi } from "../bridge/runtimeApi";

let bound = false;
let pending = false;
let recording = false;
let clickHandler: ((event: MouseEvent) => void) | null = null;

function notice(message: string): void {
  const element = document.querySelector<HTMLElement>("#assistantMessage");
  if (element) element.textContent = message;
}

function updateRecordingUi(active: boolean): void {
  recording = active;
  document.body.classList.toggle("is-recording", active);
  const status = document.getElementById("recordStatusText");
  if (status) status.textContent = active ? "Recording" : "Idle";
  const presence = document.getElementById("userPresence");
  if (presence) presence.textContent = active ? "Mic active" : "Text ready";
}

function setVoiceButtonsDisabled(disabled: boolean): void {
  for (const selector of ["#microphoneButton", "#quickMicButton", "#recordStatusButton"]) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (button) button.disabled = disabled;
  }
}

async function runVoiceToggle(): Promise<void> {
  if (pending) {
    notice("Voice capture is already updating. Please wait.");
    return;
  }
  pending = true;
  setVoiceButtonsDisabled(true);
  try {
    if (recording) {
      notice("Stopping microphone capture and preparing the local audio segment...");
      const result = await runtimeApi.stopCapture();
      updateRecordingUi(false);
      notice(result.message || "Microphone capture stopped.");
      return;
    }

    notice("Checking microphone before recording...");
    const input = await runtimeApi.getInputStatus();
    if (!input.ready) {
      updateRecordingUi(false);
      notice(input.note || input.blocker || "Microphone is not ready. Open Audio Settings or Windows sound settings.");
      return;
    }

    const helper = await runtimeApi.getHelperBridgeStatus();
    notice(helper.provider_ready ? "Voice provider is ready. Starting capture..." : "Starting microphone-only capture. Full voice translation still needs helper/model/provider setup.");
    const result = await runtimeApi.startCapture();
    updateRecordingUi(Boolean(result.ok));
    notice(result.message || (result.ok ? "Recording started." : "Recording could not start."));
  } finally {
    pending = false;
    setVoiceButtonsDisabled(false);
  }
}

export function bindDirectVoiceCaptureUi(): () => void {
  if (bound) return unbindDirectVoiceCaptureUi;
  bound = true;
  clickHandler = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target?.closest("#microphoneButton,#quickMicButton,#recordStatusButton")) return;
    event.preventDefault();
    event.stopPropagation();
    void runVoiceToggle().catch(() => {
      pending = false;
      setVoiceButtonsDisabled(false);
      updateRecordingUi(false);
      notice("Voice capture failed before returning a result. Open Developer Diagnostics for details.");
    });
  };
  document.addEventListener("click", clickHandler, true);
  return unbindDirectVoiceCaptureUi;
}

export function unbindDirectVoiceCaptureUi(): void {
  if (!bound || !clickHandler) return;
  document.removeEventListener("click", clickHandler, true);
  clickHandler = null;
  pending = false;
  bound = false;
}
