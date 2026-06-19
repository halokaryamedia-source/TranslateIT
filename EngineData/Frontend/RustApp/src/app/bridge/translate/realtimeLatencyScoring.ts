export type RealtimeLatencySample = {
  session_id: string;
  source_language: string;
  target_language: string;
  mode: string;
  device: string;
  end_to_end_total_ms: number;
  translation_to_first_audio_ms: number | null;
  created_unix_ms: number;
};

export type RealtimeLatencySummary = {
  sample_count: number;
  p50_end_to_end_ms: number | null;
  p95_end_to_end_ms: number | null;
  average_end_to_end_ms: number | null;
  pass: boolean;
  tier: "excellent" | "acceptable" | "too_slow" | "insufficient_samples";
};

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function summarizeRealtimeLatency(samples: RealtimeLatencySample[]): RealtimeLatencySummary {
  const values = samples
    .map((sample) => sample.end_to_end_total_ms)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const p50 = percentile(values, 50);
  const p95 = percentile(values, 95);
  const avg = average(values);
  const sampleCount = values.length;

  let tier: RealtimeLatencySummary["tier"] = "insufficient_samples";
  if (sampleCount >= 20 && p50 !== null && p95 !== null) {
    if (p50 <= 1000 && p95 <= 3500) tier = "excellent";
    else if (p50 <= 1800 && p95 <= 3500) tier = "acceptable";
    else tier = "too_slow";
  }

  return {
    sample_count: sampleCount,
    p50_end_to_end_ms: p50 === null ? null : Math.round(p50),
    p95_end_to_end_ms: p95 === null ? null : Math.round(p95),
    average_end_to_end_ms: avg === null ? null : Math.round(avg),
    pass: tier === "excellent" || tier === "acceptable",
    tier,
  };
}
