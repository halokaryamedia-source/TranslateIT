import { runtimeApi } from "../bridge/runtimeApi";
import type { GpuPolicyReport, RealtimeStatusPayload } from "../shared/types";

const REFRESH_INTERVAL_MS = 5_000;
let timer: number | null = null;
let pending = false;

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setTitle(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.title = value;
}

function safeStatus(value: string | null | undefined, fallback: string): string {
  const clean = value?.replace(/\s+/g, " ").trim();
  return clean || fallback;
}

function latencyLabel(payload: RealtimeStatusPayload): string {
  const latency = payload.latency;
  const last = latency?.last_total_ms;
  const p50 = latency?.p50_ms;
  const target = latency?.target_ms ?? 1_500;
  if (typeof last === "number" && last > 0) return `Latency ${Math.round(last)}ms / target ${target}ms`;
  if (typeof p50 === "number" && p50 > 0) return `Latency p50 ${Math.round(p50)}ms / target ${target}ms`;
  return `Latency target ${target}ms`;
}

function gpuLabel(policy: GpuPolicyReport | null, payload: RealtimeStatusPayload | null): string {
  if (policy?.gpu_primary) return "GPU primary";
  if (policy?.cuda_available && !policy.cpu_fallback_active) return "CUDA ready";
  if (policy?.cpu_fallback_active) return "CPU fallback";
  if (payload?.worker?.device) return payload.worker.fallback_active ? `Fallback ${payload.worker.device}` : payload.worker.device;
  return "GPU checking";
}

function gpuDetail(policy: GpuPolicyReport | null, payload: RealtimeStatusPayload | null): string {
  const parts = [
    policy?.note,
    policy?.fallback_label ? `Fallback: ${policy.fallback_label}` : "",
    policy?.blockers?.length ? `Blockers: ${policy.blockers.join(", ")}` : "",
    payload?.worker?.device ? `Worker device: ${payload.worker.device}` : "",
    payload?.worker?.last_command ? `Last command: ${payload.worker.last_command}` : "",
  ].filter(Boolean);
  return parts.join(" | ") || "GPU policy has not reported yet.";
}

function qualityLabel(payload: RealtimeStatusPayload): string {
  const latency = latencyLabel(payload);
  if (payload.assets?.tts_ready && payload.assets.translation_ready) return `Quality ready · ${latency}`;
  if (payload.assets?.missing?.length > 0) return `Needs setup · ${latency}`;
  return latency;
}

async function refreshOnce(): Promise<void> {
  if (pending) return;
  pending = true;
  try {
    const [payload, gpuPolicy] = await Promise.all([
      runtimeApi.getRealtimeStatusPayload(),
      runtimeApi.getGpuPolicy().catch(() => null),
    ]);
    if (!payload) return;
    setText("realtimeStatus", safeStatus(payload.status, "Checking"));
    setText("qualityStatus", qualityLabel(payload));
    setText("gpuStatus", gpuLabel(gpuPolicy, payload));
    setTitle("qualityStatus", latencyLabel(payload));
    setTitle("gpuStatus", gpuDetail(gpuPolicy, payload));
    document.body.dataset.realtimeStatusPayload = payload.message ?? payload.status ?? "checking";
    document.body.dataset.realtimeLatency = latencyLabel(payload);
    document.body.dataset.gpuPolicy = gpuLabel(gpuPolicy, payload);
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
