import { getRealtimeStatusPayload } from "../engineTranslate/realtimeStatusPayloadApi";
import { applyRealtimeStatusPayload, type RealtimeStatusStoreSnapshot } from "./realtimeStatusPayloadStore";

export async function refreshRealtimeStatusPayloadStore(): Promise<RealtimeStatusStoreSnapshot> {
  const payload = await getRealtimeStatusPayload();
  return applyRealtimeStatusPayload(payload);
}
