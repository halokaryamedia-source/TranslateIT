export type MeetingVoiceState = "ready" | "missing" | "checking";

export type MeetingVoiceGate = {
  state: MeetingVoiceState;
  meetingReady: boolean;
  status: "Ready" | "Setup Needed" | "Checking";
  nextAction: string | null;
  summary: string | null;
};

export function resolveMeetingVoiceGate(input: {
  live: boolean;
  preflightReady: boolean;
  selectedVoiceReady: boolean | null | undefined;
}): MeetingVoiceGate {
  const state: MeetingVoiceState = input.selectedVoiceReady === true
    ? "ready"
    : input.selectedVoiceReady === false
      ? "missing"
      : "checking";

  if (input.live) {
    return { state, meetingReady: true, status: "Ready", nextAction: null, summary: null };
  }
  if (!input.preflightReady) {
    return { state, meetingReady: false, status: "Setup Needed", nextAction: null, summary: null };
  }
  if (state === "ready") {
    return { state, meetingReady: true, status: "Ready", nextAction: null, summary: null };
  }
  if (state === "checking") {
    return {
      state,
      meetingReady: false,
      status: "Checking",
      nextAction: "Checking the selected Meeting voice before starting.",
      summary: "Meeting Translation is checking the selected Meeting voice.",
    };
  }
  return {
    state,
    meetingReady: false,
    status: "Setup Needed",
    nextAction: "Choose a Meeting voice before starting Meeting translation.",
    summary: "Choose a Meeting voice before starting Meeting Translation.",
  };
}
