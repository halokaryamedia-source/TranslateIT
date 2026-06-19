import { runtimeApi } from "../bridge/runtimeApi";

const HEALTH_INTERVAL_MS = 20_000;
const FIRST_HEALTH_DELAY_MS = 4_000;
const MIN_HEALTH_GAP_MS = 8_000;
let healthCheckTimer: number | null = null;
let firstHealthTimer: number | null = null;
let healthCheckPending = false;
let lastHealthStartedAt = 0;
let lastWarning = "";

function publishHealthWarning(message: string): void {
  document.body.dataset.helperBridgeHealthWarning = message;
}

function shouldSkipHealthCheck(): boolean {
  if (document.hidden) return true;
  if (healthCheckPending) return true;
  return Date.now() - lastHealthStartedAt < MIN_HEALTH_GAP_MS;
}

async function checkOnce(): Promise<void> {
  if (shouldSkipHealthCheck()) return;
  healthCheckPending = true;
  lastHealthStartedAt = Date.now();
  document.body.dataset.helperBridgeHealthCheck = "pending";
  try {
    const status = await runtimeApi.getHelperBridgeStatus();
    if (!status || status.state !== "ready") {
      document.body.dataset.helperBridgeHealthCheck = "not-ready";
      return;
    }
    const result = await runtimeApi.checkHelperBridgeHealth();
    document.body.dataset.helperBridgeHealthCheck = result?.ok ? "ok" : "warning";
    if (result && !result.ok && result.message !== lastWarning) {
      lastWarning = result.message;
      publishHealthWarning(result.message);
    }
  } catch {
    document.body.dataset.helperBridgeHealthCheck = "unavailable";
  } finally {
    healthCheckPending = false;
  }
}

export function startHelperBridgeHealthMonitor(): () => void {
  if (healthCheckTimer !== null) return stopHelperBridgeHealthMonitor;
  firstHealthTimer = window.setTimeout(() => void checkOnce(), FIRST_HEALTH_DELAY_MS);
  healthCheckTimer = window.setInterval(() => void checkOnce(), HEALTH_INTERVAL_MS);
  return stopHelperBridgeHealthMonitor;
}

export function stopHelperBridgeHealthMonitor(): void {
  if (firstHealthTimer !== null) window.clearTimeout(firstHealthTimer);
  if (healthCheckTimer !== null) window.clearInterval(healthCheckTimer);
  firstHealthTimer = null;
  healthCheckTimer = null;
  healthCheckPending = false;
  lastWarning = "";
}