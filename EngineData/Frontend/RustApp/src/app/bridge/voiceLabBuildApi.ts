import { runCommand } from "../shared/tauriBridge";

export type VoiceLabEvaluationSample = {
  line_id: number;
  exact_text: string;
  wav_file: string;
  speaker_similarity: number;
};

export type VoiceLabBuildStatus = {
  active: boolean;
  generation: number | null;
  phase: string;
  message: string;
  accepted_take_count: number;
  accepted_duration_ms: number;
  minimum_duration_ms: number;
  can_build: boolean;
  evaluation_ready: boolean;
  evaluation_samples: VoiceLabEvaluationSample[];
  approved_voice_ready: boolean;
};

export type VoiceLabBuildActionResult = {
  ok: boolean;
  state: string;
  message: string;
  build: VoiceLabBuildStatus;
};

function unavailableStatus(): VoiceLabBuildStatus {
  return {
    active: false,
    generation: null,
    phase: "unavailable",
    message: "VoiceLab build status is unavailable.",
    accepted_take_count: 0,
    accepted_duration_ms: 0,
    minimum_duration_ms: 60_000,
    can_build: false,
    evaluation_ready: false,
    evaluation_samples: [],
    approved_voice_ready: false,
  };
}

function unavailableAction(message: string): VoiceLabBuildActionResult {
  return { ok: false, state: "frontend_bridge_error", message, build: unavailableStatus() };
}

export const voiceLabBuildApi = {
  async getStatus(): Promise<VoiceLabBuildStatus> {
    return (await runCommand<VoiceLabBuildStatus>("get_voice_lab_build_status")) ?? unavailableStatus();
  },

  async start(authorizedVoiceConfirmed: boolean): Promise<VoiceLabBuildActionResult> {
    return (await runCommand<VoiceLabBuildActionResult>("start_voice_lab_build", { authorizedVoiceConfirmed }))
      ?? unavailableAction("VoiceLab could not start creating My Voice.");
  },

  async cancel(): Promise<VoiceLabBuildActionResult> {
    return (await runCommand<VoiceLabBuildActionResult>("cancel_voice_lab_build"))
      ?? unavailableAction("VoiceLab could not confirm that creation stopped.");
  },

  async approve(): Promise<VoiceLabBuildActionResult> {
    return (await runCommand<VoiceLabBuildActionResult>("approve_voice_lab_candidate"))
      ?? unavailableAction("VoiceLab could not approve My Voice.");
  },

  async getEvaluationAudio(lineId: number): Promise<ArrayBuffer | null> {
    return runCommand<ArrayBuffer>("get_voice_lab_evaluation_audio", { lineId });
  },
};
