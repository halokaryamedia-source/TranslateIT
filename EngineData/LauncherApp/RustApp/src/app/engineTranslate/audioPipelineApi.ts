import { runCommand } from "../shared/tauriBridge";

export type AudioPipelineEvidence = {
  ok: boolean;
  stage: string;
  blocker?: string;
  source_language?: string;
  target_language?: string;
  requested_mode?: string;
  translation_mode_used?: string;
  translation_fallback_used?: boolean;
  transcript_text?: string;
  translated_text?: string;
  transcribe_ok?: boolean;
  translate_ok?: boolean;
  synthesize_ok?: boolean;
  auto_play_output?: boolean;
  tts_output_path?: string;
  playback_ok?: boolean;
  evidence_unix_ms?: number;
};

export function getLatestAudioPipelineEvidence(): Promise<AudioPipelineEvidence | null> {
  return runCommand<AudioPipelineEvidence>("get_latest_audio_pipeline_evidence");
}
