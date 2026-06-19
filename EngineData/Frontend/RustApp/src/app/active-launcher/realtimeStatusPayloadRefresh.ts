import { runtimeApi } from "../bridge/runtimeApi";

const REFRESH_INTERVAL_MS = 10_000;
let timer: number | null = null;
let pending = false;

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function safeStatus(value: string | null | undefined, fallback: string): string {
  const clean = value?.replace(/\s+/g, " ").trim();
  return clean || fallback;
}

async function refreshOnce(): Promise<void> {
  if (pending) return;
  pending = true;
  try {
    const payload = await runtimeApi.getRealtimeStatusPayload();
    if (!payload) return;
    setText("realtimeStatus", safeStatus(payload.status, "Checking"));
    if (payload.assets?.tts_ready && payload.assets.translation_ready) {
      setText("qualityStatus", "Quality ready");
    } else if (payload.assets?.missing?.length > 0) {
      setText("qualityStatus", "Needs setup");
    }
    document.body.dataset.realtimeStatusPayload = payload.message ?? payload.status ?? "checking";
  } catch {
    document.body.dataset.realtimeStatusPayload = "unavailable";
  } finally {
    pending = false;
  }
}

export function startRealtimeStatusPayloadAutoRefresh(): () => void {
  if (timer !== null) return stopRealtimeStatusPayloadAutoRefresh;
  void refreshOnce();
  timer = window.setInterval(() => void refreshOnce(), REFRESH_INTERVAL_MS);
  return stopRealtimeStatusPayloadAutoRefresh;
}

export function stopRealtimeStatusPayloadAutoRefresh(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  pending = false;
}
