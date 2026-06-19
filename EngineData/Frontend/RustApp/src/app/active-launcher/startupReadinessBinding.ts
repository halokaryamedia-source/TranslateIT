import { runtimeApi } from "../bridge/runtimeApi";
import type { GpuPolicyReport, HelperBridgeStatus, ModelInventoryReport, RealtimeStatusPayload } from "../shared/types";

const START_DELAY_MS = 1200;
const REFRESH_MS = 15000;
const COMMAND_TIMEOUT_MS = 8000;
const AUTO_START_KEY = "translateit.startup.helperAutoStarted";

let timer: number | null = null;
let running = false;

function text(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function title(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.title = value;
}

function notice(value: string): void {
  const element = document.querySelector<HTMLElement>("#assistantMessage");
  if (element) {
    element.textContent = value;
    element.title = value;
  }
}

function timeoutValue<T>(task: Promise<T>, fallback: T | null): Promise<T | null> {
  let timeoutId: number | undefined;
  const timeout = new Promise<T | null>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), COMMAND_TIMEOUT_MS);
  });
  return Promise.race([task.catch(() => fallback), timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

function modelsReady(inventory: ModelInventoryReport | null): boolean {
  if (!inventory) return false;
  if (inventory.ok || inventory.status === "PASS") return true;
  return inventory.items.filter((item) => item.required).every((item) => item.found);
}

function modelLabel(inventory: ModelInventoryReport | null): string {
  if (!inventory) return "models checking";
  if (modelsReady(inventory)) return "models ready";
  return inventory.blockers[0] ?? `models ${inventory.status}`;
}

function gpuLabel(policy: GpuPolicyReport | null): string {
  if (!policy) return "GPU checking";
  if (policy.gpu_primary) return "GPU primary";
  if (policy.cuda_available && !policy.cpu_fallback_active) return "CUDA available";
  if (policy.cpu_fallback_active) return "CPU fallback";
  return policy.status || "GPU unknown";
}

function latencyLabel(payload: RealtimeStatusPayload | null): string {
  const latency = payload?.latency;
  if (!latency) return "latency waiting";
  if (typeof latency.last_total_ms === "number" && latency.last_total_ms > 0) return `${Math.round(latency.last_total_ms)}ms`;
  if (typeof latency.p50_ms === "number" && latency.p50_ms > 0) return `p50 ${Math.round(latency.p50_ms)}ms`;
  return `target ${latency.target_ms}ms`;
}

function helperLabel(helper: HelperBridgeStatus | null): string {
  if (!helper) return "helper checking";
  if (helper.provider_ready) return helper.cuda_ready ? "helper CUDA ready" : "helper fallback ready";
  return `helper ${helper.state}`;
}

function canStartHelper(inventory: ModelInventoryReport | null, helper: HelperBridgeStatus | null): boolean {
  if (!modelsReady(inventory)) return false;
  if (!helper) return true;
  if (helper.provider_ready) return false;
  return ["not_started", "stopped", "blocked", "error"].includes(helper.state);
}

async function readinessPass(): Promise<void> {
  if (running) return;
  running = true;
  try {
    text("realtimeStatus", "Checking engine");
    const [inventory, gpu, helperStatus, payload] = await Promise.all([
      timeoutValue(runtimeApi.getModelInventory(), null),
      timeoutValue(runtimeApi.getGpuPolicy(), null),
      timeoutValue(runtimeApi.getHelperBridgeStatus(), null),
      timeoutValue(runtimeApi.getRealtimeStatusPayload(), null),
    ]);

    let helper = helperStatus;
    if (sessionStorage.getItem(AUTO_START_KEY) !== "true" && canStartHelper(inventory, helper)) {
      sessionStorage.setItem(AUTO_START_KEY, "true");
      notice("Models are visible. Starting the local helper so the app can be used without manual validation first.");
      await timeoutValue(runtimeApi.startHelperBridge(), null);
      helper = await timeoutValue(runtimeApi.getHelperBridgeStatus(), helper);
    }

    const modelReady = modelsReady(inventory);
    const ready = modelReady && Boolean(helper?.provider_ready);
    const gpuText = gpuLabel(gpu);
    const latencyText = latencyLabel(payload);
    const helperText = helperLabel(helper);
    const modelText = modelLabel(inventory);

    text("gpuStatus", gpuText);
    title("gpuStatus", gpu?.note ?? gpuText);
    text("qualityStatus", ready ? `Ready · ${latencyText}` : `${modelText} · ${latencyText}`);
    title("qualityStatus", `${modelText}; ${helperText}; ${latencyText}`);
    text("realtimeStatus", ready ? "Engine ready" : modelReady ? "Helper starting" : "Setup needed");
    text("userPresence", ready ? "Engine ready" : modelReady ? "Text ready" : "Setup needed");

    document.body.dataset.engineReady = ready ? "true" : "false";
    document.body.dataset.engineModelsReady = modelReady ? "true" : "false";
    document.body.dataset.engineGpuPolicy = gpuText;
    document.body.dataset.engineLatency = latencyText;
    document.body.dataset.engineHelperState = helper?.state ?? "unknown";

    if (ready) notice(`TranslateIT engine is ready. ${gpuText}. Latency ${latencyText}.`);
    else if (modelReady) notice(`Models are visible. ${helperText}. ${gpuText}. Translation will prefer the best local backend and fallback only when needed.`);
    else notice(`App opened, but runtime setup still needs attention: ${modelText}. Open Developer Diagnostics for details.`);
  } finally {
    running = false;
  }
}

export function startStartupReadiness(): () => void {
  window.setTimeout(() => void readinessPass(), START_DELAY_MS);
  timer = window.setInterval(() => void readinessPass(), REFRESH_MS);
  return stopStartupReadiness;
}

export function stopStartupReadiness(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  running = false;
}
