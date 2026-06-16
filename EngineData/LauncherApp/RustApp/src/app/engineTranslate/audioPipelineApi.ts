import { runCommand } from "../shared/tauriBridge";

type TranslationEvidence = {
  direction_pair?: string;
  direction_supported?: boolean;
  source_language?: string;
  target_language?: string;
  mode?: string;
  fallback_mode?: string;
  blocker?: string;
};

type SynthesisEvidence = {
  provider?: string;
  output_path?: string;
  blocker?: string;
};

export type AudioPipelineEvidence = {
  ok: boolean;
  stage: string;
  blocker?: string;
  source_language?: string;
  target_language?: string;
  direction_pair?: string;
  direction_supported?: boolean;
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
  translate?: TranslationEvidence | null;
  synthesize?: SynthesisEvidence | null;
  evidence_unix_ms?: number;
};

export function getLatestAudioPipelineEvidence(): Promise<AudioPipelineEvidence | null> {
  return runCommand<AudioPipelineEvidence>("get_latest_audio_pipeline_evidence");
}
