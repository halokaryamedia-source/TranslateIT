import type { RealtimeStatusReadinessSummary } from "./realtimeStatusReadinessSummary";

export type RealtimeGeminiClassGapScore = {
  overallPercent: number;
  realtimeTranslatorPercent: number;
  geminiClassVoicePercent: number;
  validationPercent: number;
  blockers: string[];
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreRealtimeGeminiClassGap(summary: RealtimeStatusReadinessSummary): RealtimeGeminiClassGapScore {
  const blockers: string[] = [];
  const hasPayload = summary.hasPayload;
  const hasViewState = summary.hasViewState;
  const hasMissingAssets = summary.missingCount > 0;

  if (!hasPayload) blockers.push("realtime_status_payload_missing");
  if (!hasViewState) blockers.push("realtime_status_view_state_missing");
  if (hasMissingAssets) blockers.push("runtime_assets_incomplete");
  blockers.push("target_pc_latency_evidence_missing");
  blockers.push("translation_quality_benchmark_missing");
  blockers.push("full_duplex_interruption_missing");
  blockers.push("multimodal_context_missing");

  const realtimeTranslatorPercent = clampPercent(
    45
    + (hasPayload ? 15 : 0)
    + (hasViewState ? 10 : 0)
    + (!hasMissingAssets ? 10 : 0),
  );

  const geminiClassVoicePercent = clampPercent(
    20
    + (hasPayload ? 5 : 0)
    + (!hasMissingAssets ? 5 : 0),
  );

  const validationPercent = clampPercent(
    30
    + (summary.refreshed ? 10 : 0)
    + (hasPayload ? 5 : 0),
  );

  const overallPercent = clampPercent(
    realtimeTranslatorPercent * 0.45
    + geminiClassVoicePercent * 0.35
    + validationPercent * 0.2,
  );

  return {
    overallPercent,
    realtimeTranslatorPercent,
    geminiClassVoicePercent,
    validationPercent,
    blockers,
  };
}
