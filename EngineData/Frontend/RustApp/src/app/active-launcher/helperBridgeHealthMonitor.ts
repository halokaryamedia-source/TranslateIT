import { runtimeApi } from "../bridge/runtimeApi";

const HEALTH_INTERVAL_MS = 15_000;
let healthCheckTimer: number | null = null;
let healthCheckPending = false;
let lastWarning = "";

function publishHealthWarning(message: string): void {
  document.body.dataset.helperBridgeHealthWarning = message;
}

async function checkOnce(): Promise<void> {
  if (healthCheckPending) return;
  healthCheckPending = true;
  try {
    const status = await runtimeApi.getHelperBridgeStatus();
    if (!status || status.state !== "ready") return;
    const result = await runtimeApi.checkHelperBridgeHealth();
    if (result && !result.ok && result.message !== lastWarning) {
      lastWarning = result.message;
      publishHealthWarning(result.message);
    }
  } catch {
    // Health monitor is best-effort and must not interrupt the launcher UI.
  } finally {
    healthCheckPending = false;
  }
}

export function startHelperBridgeHealthMonitor(): () => void {
  if (healthCheckTimer !== null) return stopHelperBridgeHealthMonitor;
  void checkOnce();
  healthCheckTimer = window.setInterval(() => void checkOnce(), HEALTH_INTERVAL_MS);
  return stopHelperBridgeHealthMonitor;
}

export function stopHelperBridgeHealthMonitor(): void {
  if (healthCheckTimer === null) return;
  window.clearInterval(healthCheckTimer);
  healthCheckTimer = null;
  healthCheckPending = false;
  lastWarning = "";
}

