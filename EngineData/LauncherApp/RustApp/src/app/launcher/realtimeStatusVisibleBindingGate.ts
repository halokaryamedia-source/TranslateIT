import type { RealtimeStatusReadinessSummary } from "./realtimeStatusReadinessSummary";

export type RealtimeStatusVisibleBindingDecision = {
  allowed: boolean;
  reason: string;
};

export function decideRealtimeStatusVisibleBinding(
  summary: RealtimeStatusReadinessSummary,
  designPreviewApproved: boolean,
): RealtimeStatusVisibleBindingDecision {
  if (!designPreviewApproved) {
    return {
      allowed: false,
      reason: "DesignPreview approval is required before visible UI binding.",
    };
  }

  if (!summary.readyForVisibleBinding) {
    return {
      allowed: false,
      reason: summary.blocker ?? "Realtime status state is not ready for visible binding.",
    };
  }

  return {
    allowed: true,
    reason: "Realtime status state is approved and ready for visible binding.",
  };
}
