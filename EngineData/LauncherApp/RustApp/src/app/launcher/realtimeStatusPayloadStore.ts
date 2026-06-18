import type { RealtimeStatusPayload } from "../shared/types";
import { realtimeStatusViewState, type RealtimeStatusViewState } from "./realtimeStatusPayloadState";

export type RealtimeStatusStoreSnapshot = {
  payload: RealtimeStatusPayload | null;
  view: RealtimeStatusViewState | null;
  refreshed: boolean;
  message: string;
};

let latestSnapshot: RealtimeStatusStoreSnapshot = {
  payload: null,
  view: null,
  refreshed: false,
  message: "Realtime status has not been loaded yet.",
};

export function latestRealtimeStatusSnapshot(): RealtimeStatusStoreSnapshot {
  return latestSnapshot;
}

export function applyRealtimeStatusPayload(payload: RealtimeStatusPayload | null): RealtimeStatusStoreSnapshot {
  if (!payload) {
    latestSnapshot = {
      payload: null,
      view: null,
      refreshed: true,
      message: "Realtime status payload is unavailable.",
    };
    return latestSnapshot;
  }

  const view = realtimeStatusViewState(payload);
  latestSnapshot = {
    payload,
    view,
    refreshed: true,
    message: view.message,
  };
  return latestSnapshot;
}
