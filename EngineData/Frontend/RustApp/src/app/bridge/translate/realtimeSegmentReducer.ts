import type { RealtimeSegmentEvent, RealtimeSegmentState } from "./realtimeSegmentEventTypes";
import { emptyRealtimeSegmentState } from "./realtimeSegmentEventTypes";

export function applyRealtimeSegmentEvent(
  current: RealtimeSegmentState | null,
  event: RealtimeSegmentEvent,
): RealtimeSegmentState {
  const next: RealtimeSegmentState = {
    ...(current ?? emptyRealtimeSegmentState(event.session_id)),
    session_id: event.session_id,
    source_language: event.source_language,
    target_language: event.target_language,
    last_latency_ms: event.latency_ms,
    last_error: event.event_type === "pipeline_error" ? event.blocker ?? "pipeline_error" : current?.last_error ?? null,
  };

  if (event.event_type === "asr_partial") {
    next.partial_transcript = event.text;
  }

  if (event.event_type === "asr_final") {
    next.final_transcript = event.text;
    next.partial_transcript = "";
  }

  if (event.event_type === "translation_partial") {
    next.partial_translation = event.translated_text ?? event.text;
  }

  if (event.event_type === "translation_final") {
    next.final_translation = event.translated_text ?? event.text;
    next.partial_translation = "";
  }

  return next;
}
