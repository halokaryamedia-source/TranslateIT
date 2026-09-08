export type SetupRecoveryInput = {
  helperState: string | null | undefined;
  helperStartFailed?: boolean;
  readinessOk: boolean | null | undefined;
  inputBlocked: boolean;
  workerResponseAvailable: boolean;
  translationIdEnReady: boolean;
};

export function setupRecoveryMessage(input: SetupRecoveryInput): string {
  if (input.helperStartFailed || !input.helperState) {
    return "The local translator couldn't start. Retry status, or open Diagnostics if it continues.";
  }
  if (input.helperState !== "ready") {
    return "The local translator still needs attention. Open Diagnostics for technical details.";
  }
  if (input.inputBlocked) {
    return "The microphone still needs attention. Check the microphone in Settings, then try again.";
  }
  if (input.workerResponseAvailable && !input.translationIdEnReady) {
    return "The Indonesian → English translation runtime still needs attention. Open Diagnostics for technical details.";
  }
  if (input.readinessOk !== true) {
    return "The final local translation check still needs attention. Open Diagnostics if this continues.";
  }
  return "The local translation check passed. Check Meeting again; the Meeting microphone may still need attention.";
}
