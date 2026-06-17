import type { RealtimeStatusPayload } from "../shared/types";
import { realtimeStatusViewState } from "./realtimeStatusPayloadState";
import { applyRealtimeStatusPayload, latestRealtimeStatusSnapshot } from "./realtimeStatusPayloadStore";
import { realtimeStatusUiTextPatch } from "./realtimeStatusPayloadViewPatch";
import { realtimeStatusReadinessSummary } from "./realtimeStatusReadinessSummary";

export type RealtimeStatusStateValidationReport = {
  ok: boolean;
  checked: number;
  failures: string[];
};

function samplePayload(status: string, missing: string[] = []): RealtimeStatusPayload {
  return {
    status,
    language_direction: "ID > EN",
    mode: "Realtime",
    latency: {
      target_ms: 1000,
      last_total_ms: null,
      p50_ms: null,
      sample_count: 0,
    },
    worker: {
      available: true,
      device: status === "ready" ? "cuda" : "cpu_or_unknown",
      fallback_active: status !== "ready",
      last_command: "status",
    },
    assets: {
      asr_ready: status === "ready",
      translation_ready: status === "ready",
      tts_ready: status === "ready",
      missing,
    },
    message: `${status} sample`,
    evidence_path: null,
  };
}

export function validateRealtimeStatusStateMapping(): RealtimeStatusStateValidationReport {
  const failures: string[] = [];
  const ready = samplePayload("ready");
  const partial = samplePayload("partial_ready", ["asr_model_missing"]);

  const readyView = realtimeStatusViewState(ready);
  if (readyView.direction !== "ID > EN") failures.push("ready direction mapping failed");
  if (readyView.realtimeLabel !== "Ready") failures.push("ready label mapping failed");
  if (readyView.gpuLabel !== "CUDA ready") failures.push("ready GPU mapping failed");

  const partialSnapshot = applyRealtimeStatusPayload(partial);
  if (!partialSnapshot.refreshed) failures.push("store refresh flag failed");
  if (partialSnapshot.view?.missingCount !== 1) failures.push("store missing count failed");
  if (latestRealtimeStatusSnapshot().payload?.status !== "partial_ready") failures.push("latest snapshot update failed");

  const patch = realtimeStatusUiTextPatch(partialSnapshot);
  if (patch.directionPill !== "ID > EN") failures.push("UI patch direction failed");
  if (patch.realtimeStatus !== "Partial (1)") failures.push("UI patch realtime label failed");
  if (patch.gpuStatus !== "CPU fallback") failures.push("UI patch GPU label failed");

  const summary = realtimeStatusReadinessSummary(partialSnapshot);
  if (!summary.readyForVisibleBinding) failures.push("readiness summary binding flag failed");
  if (summary.missingCount !== 1) failures.push("readiness summary missing count failed");
  if (summary.patch.realtimeStatus !== "Partial (1)") failures.push("readiness summary patch failed");

  return {
    ok: failures.length === 0,
    checked: 12,
    failures,
  };
}
