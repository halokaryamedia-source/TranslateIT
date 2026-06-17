import type { RealtimeStatusReadinessSummary } from "./realtimeStatusReadinessSummary";

export type RealtimeGemini35TranslateScore = {
  overallPercent: number;
  realtimeAppPercent: number;
  streamingReadinessPercent: number;
  qualityEvidencePercent: number;
  blockers: string[];
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreRealtimeGemini35TranslateTarget(summary: RealtimeStatusReadinessSummary): RealtimeGemini35TranslateScore {
  const blockers: string[] = [];
  const hasPayload = summary.hasPayload;
  const hasViewState = summary.hasViewState;
  const assetsReady = summary.missingCount === 0;

  if (!hasPayload) blockers.push("realtime_status_payload_missing");
  if (!hasViewState) blockers.push("realtime_status_view_state_missing");
  if (!assetsReady) blockers.push("runtime_assets_incomplete");
  blockers.push("streaming_asr_events_missing");
  blockers.push("streaming_translation_state_missing");
  blockers.push("translation_benchmark_missing");
  blockers.push("tts_first_audio_latency_missing");
  blockers.push("target_pc_latency_evidence_missing");

  const realtimeAppPercent = clampPercent(55 + (hasPayload ? 10 : 0) + (hasViewState ? 10 : 0) + (assetsReady ? 10 : 0));
  const streamingReadinessPercent = clampPercent(20 + (hasPayload ? 5 : 0) + (assetsReady ? 5 : 0));
  const qualityEvidencePercent = clampPercent(25 + (summary.refreshed ? 5 : 0) + (assetsReady ? 5 : 0));
  const overallPercent = clampPercent(realtimeAppPercent * 0.45 + streamingReadinessPercent * 0.3 + qualityEvidencePercent * 0.25);

  return {
    overallPercent,
    realtimeAppPercent,
    streamingReadinessPercent,
    qualityEvidencePercent,
    blockers,
  };
}
