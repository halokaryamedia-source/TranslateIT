import type { RealtimeStatusPayload } from "../shared/types";

export type RealtimeStatusViewState = {
  direction: string;
  realtimeLabel: string;
  gpuLabel: string;
  missingCount: number;
  message: string;
};

const MAX_STATUS_MESSAGE_CHARS = 240;
const UNSAFE_DISPLAY_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;

function cleanDisplayText(value: string | null | undefined, fallback: string): string {
  const clean = String(value ?? "").replace(UNSAFE_DISPLAY_CHARS, "").replace(/\s+/g, " ").trim();
  return clean || fallback;
}

function compactMessage(value: string | null | undefined): string {
  const clean = cleanDisplayText(value, "Realtime status is unavailable.");
  return clean.length > MAX_STATUS_MESSAGE_CHARS ? `${clean.slice(0, MAX_STATUS_MESSAGE_CHARS - 1)}…` : clean;
}

export function realtimeStatusViewState(payload: RealtimeStatusPayload): RealtimeStatusViewState {
  const missingCount = Math.max(0, Math.min(999, payload.assets.missing.length));
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
    direction: cleanDisplayText(payload.language_direction, "ID > EN"),
    realtimeLabel,
    gpuLabel,
    missingCount,
    message: compactMessage(payload.message),
  };
}
