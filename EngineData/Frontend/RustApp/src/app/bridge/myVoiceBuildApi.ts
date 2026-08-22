import { runCommand } from "../shared/tauriBridge";

export type MyVoiceEvaluationSample = {
  line_id: number;
  exact_text: string;
  wav_file: string;
  speaker_similarity: number;
};

export type MyVoiceBuildStatus = {
  active: boolean;
  generation: number | null;
  phase: string;
  message: string;
  accepted_take_count: number;
  accepted_duration_ms: number;
  minimum_duration_ms: number;
  can_build: boolean;
  evaluation_ready: boolean;
  evaluation_samples: MyVoiceEvaluationSample[];
  approved_voice_ready: boolean;
};

export type MyVoiceBuildActionResult = {
  ok: boolean;
  state: string;
  message: string;
  build: MyVoiceBuildStatus;
};

function unavailableStatus(): MyVoiceBuildStatus {
  return {
    active: false,
    generation: null,
    phase: "unavailable",
    message: "My Voice build status is unavailable.",
    accepted_take_count: 0,
    accepted_duration_ms: 0,
    minimum_duration_ms: 60_000,
    can_build: false,
    evaluation_ready: false,
    evaluation_samples: [],
    approved_voice_ready: false,
  };
}

function unavailableAction(message: string): MyVoiceBuildActionResult {
  return { ok: false, state: "frontend_bridge_error", message, build: unavailableStatus() };
}

export const myVoiceBuildApi = {
  async getStatus(): Promise<MyVoiceBuildStatus> {
    return (await runCommand<MyVoiceBuildStatus>("get_voice_lab_build_status")) ?? unavailableStatus();
  },

  async start(authorizedVoiceConfirmed: boolean): Promise<MyVoiceBuildActionResult> {
    return (await runCommand<MyVoiceBuildActionResult>("start_voice_lab_build", { authorizedVoiceConfirmed }))
      ?? unavailableAction("My Voice could not start creating your voice.");
  },

  async cancel(): Promise<MyVoiceBuildActionResult> {
    return (await runCommand<MyVoiceBuildActionResult>("cancel_voice_lab_build"))
      ?? unavailableAction("My Voice could not confirm that creation stopped.");
  },

  async approve(): Promise<MyVoiceBuildActionResult> {
    return (await runCommand<MyVoiceBuildActionResult>("approve_voice_lab_candidate"))
      ?? unavailableAction("My Voice could not approve the new voice.");
  },

  async getEvaluationAudio(lineId: number): Promise<ArrayBuffer | null> {
    return runCommand<ArrayBuffer>("get_voice_lab_evaluation_audio", { lineId });
  },
};
