import { runCommand } from "../shared/tauriBridge";

export type AudioStudioTakeRequest = {
  take_id?: string | null;
  source: string;
  title: string;
  detail: string;
};

export type AudioStudioStateUpdateRequest = {
  take_id: string;
  state: string;
};

export type AudioStudioCommandResult = {
  ok: boolean;
  state: string;
  message: string;
  evidence_required: boolean;
};

export const audioStudioApi = {
  importTake: (request: AudioStudioTakeRequest) => runCommand<AudioStudioCommandResult>("audio_studio_import_take", { request }),
  stageGuidedTake: (request: AudioStudioTakeRequest) => runCommand<AudioStudioCommandResult>("audio_studio_stage_guided_take", { request }),
  updateTakeState: (request: AudioStudioStateUpdateRequest) => runCommand<AudioStudioCommandResult>("audio_studio_update_take_state", { request }),
  exportProjectMetadata: () => runCommand<AudioStudioCommandResult>("audio_studio_export_project_metadata"),
};
