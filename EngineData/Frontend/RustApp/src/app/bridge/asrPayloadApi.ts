import { runCommand } from "../shared/tauriBridge";

export type AsrAudioPayloadRequestStatus = {
  ok: boolean;
  state: string;
  schema_prepared: boolean;
  boundary_ready: boolean;
  audio_write_attempted: boolean;
  audio_payload_ready: boolean;
  request_prepared: boolean;
  dispatch_attempted: boolean;
  dispatch_ok: boolean;
  task: string;
  message: string;
  blocker: string;
  next_action: string;
  audio_path: string | null;
  sample_rate_hz: number;
  channels: number;
  pcm_format: string;
  frame_count: number;
  duration_ms: number;
  audio_base64_present: boolean;
  generation_token: number;
  runtime_claim: string;
  payload_json: string;
  evidence_json: string;
  updated_unix_ms: number;
};

function fallback(message: string): AsrAudioPayloadRequestStatus {
  return {
    ok: false,
    state: "frontend_bridge_error",
    schema_prepared: false,
    boundary_ready: false,
    audio_write_attempted: false,
    audio_payload_ready: false,
    request_prepared: false,
    dispatch_attempted: false,
    dispatch_ok: false,
    task: "asr_decode",
    message,
    blocker: "frontend_bridge_unavailable",
    next_action: "open_developer_diagnostics",
    audio_path: null,
    sample_rate_hz: 0,
    channels: 0,
    pcm_format: "unknown",
    frame_count: 0,
    duration_ms: 0,
    audio_base64_present: false,
    generation_token: 0,
    runtime_claim: "frontend_bridge_unavailable",
    payload_json: "{}",
    evidence_json: "{}",
    updated_unix_ms: Date.now(),
  };
}

async function runAsrPayloadCommand(command: string, fallbackMessage: string): Promise<AsrAudioPayloadRequestStatus> {
  const result = await runCommand<AsrAudioPayloadRequestStatus>(command);
  return result ?? fallback(fallbackMessage);
}

export const asrPayloadApi = {
  prepareAsrAudioPayloadRequest(): Promise<AsrAudioPayloadRequestStatus> {
    return runAsrPayloadCommand(
      "prepare_asr_audio_payload_request",
      "ASR audio payload prepare failed before reaching the Tauri command bridge.",
    );
  },

  dispatchAsrDecodeRequest(): Promise<AsrAudioPayloadRequestStatus> {
    return runAsrPayloadCommand(
      "dispatch_asr_decode_request",
      "ASR decode dispatch failed before reaching the Tauri command bridge.",
    );
  },
};
