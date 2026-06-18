import {
  AUDIO_STUDIO_COMMAND_STATES,
  type AudioStudioCommandState,
  type AudioStudioTakeSource,
  type AudioStudioTakeState,
} from "../shared/audioStudioTypes";
import { runCommand } from "../shared/tauriBridge";

export type AudioStudioTakeRequest = {
  take_id?: string | null;
  source: AudioStudioTakeSource;
  title: string;
  detail: string;
};

export type AudioStudioStateUpdateRequest = {
  take_id: string;
  state: AudioStudioTakeState;
};

export type AudioStudioCommandResult = {
  ok: boolean;
  state: AudioStudioCommandState;
  message: string;
  evidence_required: boolean;
};

type RawAudioStudioCommandResult = Partial<AudioStudioCommandResult> | null;

function isAudioStudioCommandState(value: unknown): value is AudioStudioCommandState {
  return typeof value === "string" && AUDIO_STUDIO_COMMAND_STATES.includes(value as AudioStudioCommandState);
}

function normalizeCommandResult(result: RawAudioStudioCommandResult): AudioStudioCommandResult | null {
  if (!result || typeof result !== "object") return null;
  return {
    ok: result.ok === true,
    state: isAudioStudioCommandState(result.state) ? result.state : "blocked",
    message: typeof result.message === "string" && result.message.trim().length > 0
      ? result.message.trim()
      : "Audio Studio command returned an incomplete response.",
    evidence_required: result.evidence_required !== false,
  };
}

async function runAudioStudioCommand(name: string, args?: Record<string, unknown>): Promise<AudioStudioCommandResult | null> {
  const result = await runCommand<RawAudioStudioCommandResult>(name, args);
  return normalizeCommandResult(result);
}

export const audioStudioApi = {
  importTake: (request: AudioStudioTakeRequest) => runAudioStudioCommand("audio_studio_import_take", { request }),
  stageGuidedTake: (request: AudioStudioTakeRequest) => runAudioStudioCommand("audio_studio_stage_guided_take", { request }),
  updateTakeState: (request: AudioStudioStateUpdateRequest) => runAudioStudioCommand("audio_studio_update_take_state", { request }),
  exportProjectMetadata: () => runAudioStudioCommand("audio_studio_export_project_metadata"),
};
