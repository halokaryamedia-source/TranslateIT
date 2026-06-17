import type { RealtimeStatusReadinessSummary } from "./realtimeStatusReadinessSummary";
import { decideRealtimeStatusVisibleBinding, type RealtimeStatusVisibleBindingDecision } from "./realtimeStatusVisibleBindingGate";
import type { RealtimeStatusUiTextPatch } from "./realtimeStatusPayloadViewPatch";

export type RealtimeStatusVisibleBindingPlan = {
  decision: RealtimeStatusVisibleBindingDecision;
  patch: RealtimeStatusUiTextPatch;
  safeToApply: boolean;
  approvalRequired: boolean;
  note: string;
};

export function planRealtimeStatusVisibleBinding(
  summary: RealtimeStatusReadinessSummary,
  designPreviewApproved: boolean,
): RealtimeStatusVisibleBindingPlan {
  const decision = decideRealtimeStatusVisibleBinding(summary, designPreviewApproved);
  return {
    decision,
    patch: summary.patch,
    safeToApply: decision.allowed,
    approvalRequired: !designPreviewApproved,
    note: decision.allowed
      ? "Visible realtime status binding can be applied."
      : decision.reason,
  };
}
