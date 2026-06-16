import { runCommand } from "../shared/tauriBridge";

export type AudioPipelineEvidence = {
  ok: boolean;
  stage: string;
  blocker?: string;
  transcript_text?: string;
  translated_text?: string;
  transcribe_ok?: boolean;
  translate_ok?: boolean;
  synthesize_ok?: boolean;
  evidence_unix_ms?: number;
};

export function getLatestAudioPipelineEvidence(): Promise<AudioPipelineEvidence | null> {
  return runCommand<AudioPipelineEvidence>("get_latest_audio_pipeline_evidence");
}
