import { runCommand } from "../shared/tauriBridge";

export type RealtimeTranslateStreamRequest = {
  session_id: string;
  segment_id: string;
  source_language: string;
  target_language: string;
  partial_transcript: string;
  final_transcript: string | null;
  previous_translation: string | null;
  partial_translation: string | null;
  final_translation: string | null;
  asr_confidence: number | null;
  translation_confidence: number | null;
  elapsed_ms: number;
};

export type RealtimeTranslateStreamReport = {
  session_id: string;
  segment_id: string;
  direction_pair: string;
  stage: "partial" | "final" | "waiting" | "blocked" | string;
  display_transcript: string;
  display_translation: string;
  should_emit_partial: boolean;
  should_emit_final: boolean;
  should_use_quality_fallback: boolean;
  latency_warning: boolean;
  blockers: string[];
  message: string;
};

export function analyzeRealtimeTranslateStreamState(
  request: RealtimeTranslateStreamRequest,
): Promise<RealtimeTranslateStreamReport | null> {
  return runCommand<RealtimeTranslateStreamReport>("analyze_realtime_translate_stream_state", { request });
}
