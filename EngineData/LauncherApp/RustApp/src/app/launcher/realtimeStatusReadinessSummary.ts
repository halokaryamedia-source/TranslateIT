import { realtimeStatusUiTextPatch, type RealtimeStatusUiTextPatch } from "./realtimeStatusPayloadViewPatch";
import { latestRealtimeStatusSnapshot, type RealtimeStatusStoreSnapshot } from "./realtimeStatusPayloadStore";

export type RealtimeStatusReadinessSummary = {
  readyForVisibleBinding: boolean;
  refreshed: boolean;
  hasPayload: boolean;
  hasViewState: boolean;
  missingCount: number;
  patch: RealtimeStatusUiTextPatch;
  blocker: string | null;
};

export function realtimeStatusReadinessSummary(snapshot: RealtimeStatusStoreSnapshot = latestRealtimeStatusSnapshot()): RealtimeStatusReadinessSummary {
  const patch = realtimeStatusUiTextPatch(snapshot);
  const hasPayload = Boolean(snapshot.payload);
  const hasViewState = Boolean(snapshot.view);
  const missingCount = snapshot.view?.missingCount ?? 0;
  const readyForVisibleBinding = snapshot.refreshed && hasPayload && hasViewState;

  return {
    readyForVisibleBinding,
    refreshed: snapshot.refreshed,
    hasPayload,
    hasViewState,
    missingCount,
    patch,
    blocker: readyForVisibleBinding ? null : snapshot.message,
  };
}
