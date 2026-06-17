import type { RealtimeStatusStoreSnapshot } from "./realtimeStatusPayloadStore";

export type RealtimeStatusUiTextPatch = {
  directionPill: string;
  realtimeStatus: string;
  gpuStatus: string;
  assistantNotice: string;
};

export function realtimeStatusUiTextPatch(snapshot: RealtimeStatusStoreSnapshot): RealtimeStatusUiTextPatch {
  if (!snapshot.view) {
    return {
      directionPill: "ID > EN",
      realtimeStatus: "Checking",
      gpuStatus: "Checking",
      assistantNotice: snapshot.message,
    };
  }

  return {
    directionPill: snapshot.view.direction,
    realtimeStatus: snapshot.view.realtimeLabel,
    gpuStatus: snapshot.view.gpuLabel,
    assistantNotice: snapshot.view.message,
  };
}
