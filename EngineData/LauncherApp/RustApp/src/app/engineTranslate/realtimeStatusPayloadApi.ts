import { runCommand } from "../shared/tauriBridge";
import type { RealtimeStatusPayload } from "../shared/types";

let pendingRealtimeStatusPayload: Promise<RealtimeStatusPayload | null> | null = null;

export function getRealtimeStatusPayload(): Promise<RealtimeStatusPayload | null> {
  if (pendingRealtimeStatusPayload) return pendingRealtimeStatusPayload;
  pendingRealtimeStatusPayload = runCommand<RealtimeStatusPayload>("get_realtime_status_payload")
    .finally(() => {
      pendingRealtimeStatusPayload = null;
    });
  return pendingRealtimeStatusPayload;
}
