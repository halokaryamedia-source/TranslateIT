import { getRealtimeStatusPayload } from "../engineTranslate/realtimeStatusPayloadApi";
import { applyRealtimeStatusPayload, type RealtimeStatusStoreSnapshot } from "./realtimeStatusPayloadStore";

const REALTIME_STATUS_REFRESH_MS = 2_500;
const AUDIO_DEVICE_OUTPUT_PRESERVE_MS = 15_000;
let realtimeStatusRefreshTimer: number | null = null;
let preservedDeveloperOutput = "";
let preservedDeveloperOutputUntil = 0;
let visibilityChangeHandler: (() => void) | null = null;

function setText(id: string, value: string | null | undefined): void {
  if (!value) return;
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function isAudioDeviceOutput(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("microphones:") || normalized.startsWith("audio devices unavailable:");
}

function shouldPreserveDeveloperOutput(value: string): boolean {
  if (!isAudioDeviceOutput(value)) return false;
  const now = Date.now();
  if (value !== preservedDeveloperOutput) {
    preservedDeveloperOutput = value;
    preservedDeveloperOutputUntil = now + AUDIO_DEVICE_OUTPUT_PRESERVE_MS;
    return true;
  }
  return now <= preservedDeveloperOutputUntil;
}

function applyRealtimeStatusSnapshotToDom(snapshot: RealtimeStatusStoreSnapshot): void {
  const view = snapshot.view;
  if (!view) return;

  document.body.dataset.realtimeStatus = snapshot.payload?.status ?? "unavailable";
  setText("directionPill", view.direction);
  setText("realtimeStatus", view.realtimeLabel);
  setText("gpuStatus", view.gpuLabel);

  const developerOutput = document.getElementById("developerOutput");
  if (developerOutput && !shouldPreserveDeveloperOutput(developerOutput.textContent ?? "")) {
    const latency = snapshot.payload?.latency.last_total_ms ?? "none";
    developerOutput.textContent = `realtime=${view.realtimeLabel}; gpu=${view.gpuLabel}; missing=${view.missingCount}; latency=${latency}; message=${view.message}`;
  }
}

export async function refreshRealtimeStatusPayloadStore(): Promise<RealtimeStatusStoreSnapshot> {
  const payload = await getRealtimeStatusPayload();
  const snapshot = applyRealtimeStatusPayload(payload);
  applyRealtimeStatusSnapshotToDom(snapshot);
  return snapshot;
}

export function startRealtimeStatusPayloadAutoRefresh(): () => void {
  if (realtimeStatusRefreshTimer !== null) return stopRealtimeStatusPayloadAutoRefresh;

  void refreshRealtimeStatusPayloadStore();
  realtimeStatusRefreshTimer = window.setInterval(() => {
    if (document.hidden) return;
    void refreshRealtimeStatusPayloadStore();
  }, REALTIME_STATUS_REFRESH_MS);

  visibilityChangeHandler = () => {
    if (!document.hidden) void refreshRealtimeStatusPayloadStore();
  };
  document.addEventListener("visibilitychange", visibilityChangeHandler);

  return stopRealtimeStatusPayloadAutoRefresh;
}

export function stopRealtimeStatusPayloadAutoRefresh(): void {
  if (realtimeStatusRefreshTimer !== null) {
    window.clearInterval(realtimeStatusRefreshTimer);
    realtimeStatusRefreshTimer = null;
  }
  if (visibilityChangeHandler) {
    document.removeEventListener("visibilitychange", visibilityChangeHandler);
    visibilityChangeHandler = null;
  }
}
