import { runtimeApi } from "../engineTranslate/runtimeApi";

const HEALTH_INTERVAL_MS = 15_000;
let started = false;
let healthCheckPending = false;
let lastWarning = "";

function publishHealthWarning(message: string): void {
  document.body.dataset.helperBridgeHealthWarning = message;
  const detail = document.querySelector<HTMLElement>('[aria-label="Helper bridge detailed readiness"] .developer-log-summary');
  if (detail && document.body.classList.contains("settings-open")) {
    const base = detail.textContent?.replace(/ Health: .*$/u, "") ?? "";
    detail.textContent = `${base} Health: ${message}`.trim();
  }
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

export function startHelperBridgeHealthMonitor(): void {
  if (started) return;
  started = true;
  window.setInterval(() => void checkOnce(), HEALTH_INTERVAL_MS);
}
