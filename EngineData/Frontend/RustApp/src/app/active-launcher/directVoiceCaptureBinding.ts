import { runtimeApi } from "../bridge/runtimeApi";

type VoiceCaptureMode = "toggle" | "push-to-talk";

const VOICE_CAPTURE_MODE_KEY = "translateit.voiceCaptureMode";
const PUSH_TO_TALK_LABEL = "Ctrl+Space";

let bound = false;
let pending = false;
let recording = false;
let pushToTalkHeld = false;
let clickHandler: ((event: MouseEvent) => void) | null = null;
let keydownHandler: ((event: KeyboardEvent) => void) | null = null;
let keyupHandler: ((event: KeyboardEvent) => void) | null = null;

function notice(message: string): void {
  const element = document.querySelector<HTMLElement>("#assistantMessage");
  if (element) element.textContent = message;
}

function voiceMode(): VoiceCaptureMode {
  return localStorage.getItem(VOICE_CAPTURE_MODE_KEY) === "push-to-talk" ? "push-to-talk" : "toggle";
}

function setVoiceMode(mode: VoiceCaptureMode): void {
  localStorage.setItem(VOICE_CAPTURE_MODE_KEY, mode);
  document.body.dataset.voiceCaptureMode = mode;
  document.querySelectorAll<HTMLElement>("[data-voice-capture-mode]").forEach((element) => {
    element.classList.toggle("active", element.dataset.voiceCaptureMode === mode);
    element.setAttribute("aria-pressed", element.dataset.voiceCaptureMode === mode ? "true" : "false");
  });
  notice(mode === "push-to-talk" ? `Voice mode set to Push to Talk. Hold ${PUSH_TO_TALK_LABEL} to record.` : "Voice mode set to Click Toggle. Click the mic once to start and again to stop.");
}

function syncVoiceModeUi(): void {
  const mode = voiceMode();
  document.body.dataset.voiceCaptureMode = mode;
  document.querySelectorAll<HTMLElement>("[data-voice-capture-mode]").forEach((element) => {
    element.classList.toggle("active", element.dataset.voiceCaptureMode === mode);
    element.setAttribute("aria-pressed", element.dataset.voiceCaptureMode === mode ? "true" : "false");
  });
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

async function startVoiceCapture(reason: "toggle" | "push-to-talk"): Promise<void> {
  if (recording) return;
  notice(reason === "push-to-talk" ? "Push to Talk active. Checking microphone..." : "Checking microphone before recording...");
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
}

async function stopVoiceCapture(reason: "toggle" | "push-to-talk"): Promise<void> {
  if (!recording) return;
  notice(reason === "push-to-talk" ? "Push to Talk released. Preparing local audio segment..." : "Stopping microphone capture and preparing the local audio segment...");
  const result = await runtimeApi.stopCapture();
  updateRecordingUi(false);
  notice(result.message || "Microphone capture stopped.");
}

async function runVoiceToggle(): Promise<void> {
  if (pending) {
    notice("Voice capture is already updating. Please wait.");
    return;
  }
  pending = true;
  setVoiceButtonsDisabled(true);
  try {
    if (recording) await stopVoiceCapture("toggle");
    else await startVoiceCapture("toggle");
  } finally {
    pending = false;
    setVoiceButtonsDisabled(false);
  }
}

async function runPushToTalkStart(): Promise<void> {
  if (voiceMode() !== "push-to-talk" || pending || recording) return;
  pending = true;
  pushToTalkHeld = true;
  setVoiceButtonsDisabled(true);
  try {
    await startVoiceCapture("push-to-talk");
  } finally {
    pending = false;
    setVoiceButtonsDisabled(false);
  }
}

async function runPushToTalkStop(): Promise<void> {
  if (voiceMode() !== "push-to-talk" || pending || !recording) return;
  pending = true;
  pushToTalkHeld = false;
  setVoiceButtonsDisabled(true);
  try {
    await stopVoiceCapture("push-to-talk");
  } finally {
    pending = false;
    setVoiceButtonsDisabled(false);
  }
}

function isTypingTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return Boolean(target?.closest("textarea,input,[contenteditable='true']"));
}

function isPushToTalkShortcut(event: KeyboardEvent): boolean {
  return event.code === "Space" && event.ctrlKey && !event.altKey && !event.metaKey;
}

export function bindDirectVoiceCaptureUi(): () => void {
  if (bound) return unbindDirectVoiceCaptureUi;
  bound = true;
  syncVoiceModeUi();
  clickHandler = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const modeButton = target?.closest<HTMLElement>("[data-voice-capture-mode]");
    if (modeButton) {
      event.preventDefault();
      setVoiceMode(modeButton.dataset.voiceCaptureMode === "push-to-talk" ? "push-to-talk" : "toggle");
      return;
    }
    if (!target?.closest("#microphoneButton,#quickMicButton,#recordStatusButton")) return;
    event.preventDefault();
    event.stopPropagation();
    if (voiceMode() === "push-to-talk") {
      notice(`Push to Talk mode is active. Hold ${PUSH_TO_TALK_LABEL} to record, or switch to Click Toggle in Audio Settings.`);
      return;
    }
    void runVoiceToggle().catch(() => {
      pending = false;
      setVoiceButtonsDisabled(false);
      updateRecordingUi(false);
      notice("Voice capture failed before returning a result. Open Developer Diagnostics for details.");
    });
  };
  keydownHandler = (event: KeyboardEvent) => {
    if (!isPushToTalkShortcut(event) || isTypingTarget(event) || pushToTalkHeld) return;
    event.preventDefault();
    void runPushToTalkStart().catch(() => {
      pending = false;
      pushToTalkHeld = false;
      setVoiceButtonsDisabled(false);
      updateRecordingUi(false);
      notice("Push to Talk failed before returning a result. Open Developer Diagnostics for details.");
    });
  };
  keyupHandler = (event: KeyboardEvent) => {
    if (!isPushToTalkShortcut(event) || !pushToTalkHeld) return;
    event.preventDefault();
    void runPushToTalkStop().catch(() => {
      pending = false;
      pushToTalkHeld = false;
      setVoiceButtonsDisabled(false);
      updateRecordingUi(false);
      notice("Push to Talk stop failed before returning a result. Open Developer Diagnostics for details.");
    });
  };
  document.addEventListener("click", clickHandler, true);
  window.addEventListener("keydown", keydownHandler, true);
  window.addEventListener("keyup", keyupHandler, true);
  return unbindDirectVoiceCaptureUi;
}

export function unbindDirectVoiceCaptureUi(): void {
  if (!bound) return;
  if (clickHandler) document.removeEventListener("click", clickHandler, true);
  if (keydownHandler) window.removeEventListener("keydown", keydownHandler, true);
  if (keyupHandler) window.removeEventListener("keyup", keyupHandler, true);
  clickHandler = null;
  keydownHandler = null;
  keyupHandler = null;
  pending = false;
  pushToTalkHeld = false;
  bound = false;
}
