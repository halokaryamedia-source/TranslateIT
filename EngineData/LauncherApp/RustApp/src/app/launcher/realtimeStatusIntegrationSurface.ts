import { refreshRealtimeStatusPayloadStore } from "./realtimeStatusPayloadRefresh";
import type { RealtimeStatusStoreSnapshot } from "./realtimeStatusPayloadStore";
import { realtimeStatusReadinessSummary, type RealtimeStatusReadinessSummary } from "./realtimeStatusReadinessSummary";
import { planRealtimeStatusVisibleBinding, type RealtimeStatusVisibleBindingPlan } from "./realtimeStatusVisibleBindingPlan";

export type RealtimeStatusIntegrationSurface = {
  snapshot: RealtimeStatusStoreSnapshot;
  summary: RealtimeStatusReadinessSummary;
  plan: RealtimeStatusVisibleBindingPlan;
};

export async function prepareRealtimeStatusIntegrationSurface(
  designPreviewApproved = false,
): Promise<RealtimeStatusIntegrationSurface> {
  const snapshot = await refreshRealtimeStatusPayloadStore();
  const summary = realtimeStatusReadinessSummary(snapshot);
  const plan = planRealtimeStatusVisibleBinding(summary, designPreviewApproved);
  return { snapshot, summary, plan };
}
