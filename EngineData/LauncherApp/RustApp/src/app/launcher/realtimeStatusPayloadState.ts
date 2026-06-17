import type { RealtimeStatusPayload } from "../shared/types";

export type RealtimeStatusViewState = {
  direction: string;
  realtimeLabel: string;
  gpuLabel: string;
  missingCount: number;
  message: string;
};

export function realtimeStatusViewState(payload: RealtimeStatusPayload): RealtimeStatusViewState {
  const missingCount = payload.assets.missing.length;
  const realtimeLabel = payload.status === "ready"
    ? "Ready"
    : payload.status === "partial_ready"
      ? `Setup needed (${missingCount})`
      : payload.status === "checking"
        ? "Checking"
        : payload.status === "fallback"
          ? "Fallback active"
          : payload.status === "error"
            ? "Error"
            : "Idle";

  const gpuLabel = payload.worker.device === "cuda"
    ? "CUDA ready"
    : payload.worker.device === "cuda_partial"
      ? "CUDA partial"
      : payload.worker.fallback_active
        ? "CPU fallback"
        : "Checking";

  return {
    direction: payload.language_direction,
    realtimeLabel,
    gpuLabel,
    missingCount,
    message: payload.message,
  };
}
