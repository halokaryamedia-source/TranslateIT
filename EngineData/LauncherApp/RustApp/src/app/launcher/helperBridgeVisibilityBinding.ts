import { runtimeApi } from "../engineTranslate/runtimeApi";
import type { HelperBridgeStatus } from "../shared/types";

let started = false;
let refreshPending = false;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function tone(status: HelperBridgeStatus): string {
  if (status.provider_ready && status.cuda_ready) return "good";
  if (status.degraded_mode) return "warning";
  if (status.state === "blocked" || status.state === "error") return "error";
  return "neutral";
}

function summary(status: HelperBridgeStatus): string {
  if (status.provider_ready && status.cuda_ready) return "Helper provider ready with CUDA.";
  if (status.provider_ready && status.degraded_mode) return "Helper provider ready in degraded CPU/fallback mode.";
  if (status.degraded_mode) return "Helper is running in degraded mode. CUDA/provider acceleration is not fully ready.";
  if (status.state === "ready") return "Helper worker is running, but provider readiness is incomplete.";
  return status.message;
}

function render(panel: HTMLElement, status: HelperBridgeStatus): void {
  let detail = summary(status);
  if (status.last_error) detail += ` Error: ${status.last_error}.`;
  if (status.stderr_log_path) detail += ` Log: ${status.stderr_log_path}`;
  panel.innerHTML = `
    <p class="developer-log-row"><strong>Helper readiness</strong><span class="status-badge status-badge--${tone(status)}">${escapeHtml(status.state)}</span></p>
    <p class="developer-log-row"><strong>CUDA</strong><span>${status.cuda_ready ? "ready" : "not ready"}</span></p>
    <p class="developer-log-row"><strong>Provider</strong><span>${status.provider_ready ? "ready" : "not ready"}</span></p>
    <p class="developer-log-row"><strong>Mode</strong><span>${status.degraded_mode ? "degraded" : "normal/unknown"}</span></p>
    <p class="developer-log-summary">${escapeHtml(detail)}</p>
  `;
}

async function refreshPanel(panel: HTMLElement): Promise<void> {
  if (refreshPending) return;
  refreshPending = true;
  try {
    const status = await runtimeApi.getHelperBridgeStatus();
    if (status) render(panel, status);
  } finally {
    refreshPending = false;
  }
}

function ensurePanel(): HTMLElement | null {
  const architecturePanel = document.querySelector<HTMLElement>('[aria-label="Architecture and runtime status"]');
  if (!architecturePanel) return null;
  let panel = document.querySelector<HTMLElement>('[aria-label="Helper bridge detailed readiness"]');
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "developer-log-body";
    panel.setAttribute("aria-label", "Helper bridge detailed readiness");
    architecturePanel.insertAdjacentElement("afterend", panel);
  }
  return panel;
}

export function bindHelperBridgeVisibilityUi(): void {
  if (started) return;
  started = true;
  const refresh = () => {
    const panel = ensurePanel();
    if (panel) void refreshPanel(panel);
  };
  refresh();
  const root = document.querySelector<HTMLElement>("#settingsContent") ?? document.body;
  const observer = new MutationObserver(refresh);
  observer.observe(root, { childList: true, subtree: true });
}
