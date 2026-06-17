export type RealtimeSegmentEventType =
  | "asr_partial"
  | "asr_final"
  | "translation_partial"
  | "translation_final"
  | "tts_started"
  | "tts_finished"
  | "pipeline_error";

export type RealtimeSegmentEvent = {
  event_id: string;
  session_id: string;
  sequence: number;
  event_type: RealtimeSegmentEventType;
  source_language: string;
  target_language: string;
  text: string;
  translated_text: string | null;
  is_final: boolean;
  confidence: number | null;
  latency_ms: number | null;
  created_unix_ms: number;
  blocker: string | null;
};

export type RealtimeSegmentState = {
  session_id: string;
  source_language: string;
  target_language: string;
  partial_transcript: string;
  final_transcript: string;
  partial_translation: string;
  final_translation: string;
  last_latency_ms: number | null;
  last_error: string | null;
};

export function emptyRealtimeSegmentState(sessionId: string): RealtimeSegmentState {
  return {
    session_id: sessionId,
    source_language: "id",
    target_language: "en",
    partial_transcript: "",
    final_transcript: "",
    partial_translation: "",
    final_translation: "",
    last_latency_ms: null,
    last_error: null,
  };
}
