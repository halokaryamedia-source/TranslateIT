export type AudioStudioTakeSource = "import" | "guided_reading";
export type AudioStudioTakeState = "draft" | "staged" | "accepted" | "needs_retry" | "blocked";
export type AudioStudioCommandState = "invalid_request" | "placeholder_only" | "ready" | "blocked";

export const AUDIO_STUDIO_TAKE_SOURCES: AudioStudioTakeSource[] = ["import", "guided_reading"];

export const AUDIO_STUDIO_TAKE_STATES: AudioStudioTakeState[] = [
  "draft",
  "staged",
  "accepted",
  "needs_retry",
  "blocked",
];

export const AUDIO_STUDIO_COMMAND_STATES: AudioStudioCommandState[] = [
  "invalid_request",
  "placeholder_only",
  "ready",
  "blocked",
];
