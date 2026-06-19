import {
  AUDIO_STUDIO_COMMAND_STATES,
  AUDIO_STUDIO_TAKE_STATES,
  type AudioStudioCommandState,
  type AudioStudioTakeSource,
  type AudioStudioTakeState,
} from "../../shared/audioStudioTypes";
import { runCommand } from "../../shared/tauriBridge";

export type AudioStudioTakeRequest = {
  take_id?: string | null;
  source: AudioStudioTakeSource;
  title: string;
  detail: string;
  file_name?: string | null;
  size_bytes?: number | null;
  reading_line_id?: string | null;
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

export type AudioStudioTakeRecord = {
  schema_version: number;
  take_id: string;
  source: AudioStudioTakeSource;
  state: AudioStudioTakeState;
  title: string;
  detail: string;
  file_name?: string | null;
  size_bytes?: number | null;
  reading_line_id?: string | null;
  created_unix_ms: number;
  updated_unix_ms: number;
};

export type AudioStudioTakeListResult = AudioStudioCommandResult & {
  takes: AudioStudioTakeRecord[];
};

type RawAudioStudioCommandResult = Partial<AudioStudioCommandResult> | null;
type RawAudioStudioTakeListResult = Partial<AudioStudioTakeListResult> | null;

function isAudioStudioCommandState(value: unknown): value is AudioStudioCommandState {
  return typeof value === "string" && AUDIO_STUDIO_COMMAND_STATES.includes(value as AudioStudioCommandState);
}

function isAudioStudioTakeState(value: unknown): value is AudioStudioTakeState {
  return typeof value === "string" && AUDIO_STUDIO_TAKE_STATES.includes(value as AudioStudioTakeState);
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

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeTakeRecord(value: unknown): AudioStudioTakeRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<AudioStudioTakeRecord>;
  if (typeof record.take_id !== "string" || typeof record.title !== "string" || typeof record.detail !== "string") return null;
  if (record.source !== "import" && record.source !== "guided_reading") return null;
  if (!isAudioStudioTakeState(record.state)) return null;
  return {
    schema_version: typeof record.schema_version === "number" ? record.schema_version : 1,
    take_id: record.take_id,
    source: record.source,
    state: record.state,
    title: record.title,
    detail: record.detail,
    file_name: optionalString(record.file_name),
    size_bytes: optionalNumber(record.size_bytes),
    reading_line_id: optionalString(record.reading_line_id),
    created_unix_ms: typeof record.created_unix_ms === "number" ? record.created_unix_ms : 0,
    updated_unix_ms: typeof record.updated_unix_ms === "number" ? record.updated_unix_ms : 0,
  };
}

export async function importAudioStudioTake(request: AudioStudioTakeRequest): Promise<AudioStudioCommandResult | null> {
  return normalizeCommandResult(await runCommand<RawAudioStudioCommandResult>("audio_studio_import_take", { request }).catch(() => null));
}

export async function stageGuidedAudioStudioTake(request: AudioStudioTakeRequest): Promise<AudioStudioCommandResult | null> {
  return normalizeCommandResult(await runCommand<RawAudioStudioCommandResult>("audio_studio_stage_guided_take", { request }).catch(() => null));
}

export async function updateAudioStudioTakeState(request: AudioStudioStateUpdateRequest): Promise<AudioStudioCommandResult | null> {
  return normalizeCommandResult(await runCommand<RawAudioStudioCommandResult>("audio_studio_update_take_state", { request }).catch(() => null));
}

export async function listAudioStudioTakes(): Promise<AudioStudioTakeListResult | null> {
  const result = await runCommand<RawAudioStudioTakeListResult>("audio_studio_list_takes").catch(() => null);
  const command = normalizeCommandResult(result);
  if (!command) return null;
  const takes = Array.isArray(result?.takes) ? result.takes.map(normalizeTakeRecord).filter((take): take is AudioStudioTakeRecord => Boolean(take)) : [];
  return { ...command, takes };
}

export async function exportAudioStudioProjectMetadata(): Promise<AudioStudioCommandResult | null> {
  return normalizeCommandResult(await runCommand<RawAudioStudioCommandResult>("audio_studio_export_project_metadata").catch(() => null));
}
