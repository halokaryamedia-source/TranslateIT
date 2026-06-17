export type TranslationBenchmarkDirection = "id->en" | "en->id";

export type TranslationBenchmarkCase = {
  id: string;
  direction: TranslationBenchmarkDirection;
  source: string;
  expected_meaning: string;
  domain: string;
};

export type TranslationBenchmarkScore = {
  case_id: string;
  meaning_preservation: number;
  fluency: number;
  terminology: number;
  latency_ms: number | null;
  notes: string;
};

export type TranslationBenchmarkSummary = {
  case_count: number;
  average_quality_score: number;
  average_latency_ms: number | null;
  pass: boolean;
  readiness_note: string;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function qualityScore(score: TranslationBenchmarkScore): number {
  return average([
    clampScore(score.meaning_preservation),
    clampScore(score.fluency),
    clampScore(score.terminology),
  ]);
}

export function summarizeTranslationBenchmark(scores: TranslationBenchmarkScore[]): TranslationBenchmarkSummary {
  const qualityScores = scores.map(qualityScore);
  const latencies = scores
    .map((score) => score.latency_ms)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageQualityScore = average(qualityScores);
  const averageLatencyMs = latencies.length > 0 ? average(latencies) : null;
  const pass = scores.length > 0 && averageQualityScore >= 4.3 && averageLatencyMs !== null;

  return {
    case_count: scores.length,
    average_quality_score: Number(averageQualityScore.toFixed(2)),
    average_latency_ms: averageLatencyMs === null ? null : Math.round(averageLatencyMs),
    pass,
    readiness_note: pass
      ? "Benchmark quality threshold passed. Runtime latency evidence still needs target-PC p95 confirmation."
      : "Benchmark is not enough for product-class readiness yet.",
  };
}
