import type { HelperBridgeStatus } from "../shared/types";
import {
  primaryButton,
  settingsActions,
  settingsCard,
  settingsPage,
  settingsSection,
  statusBadge,
} from "./uiPageFactory";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function helperTone(status: HelperBridgeStatus | null): "neutral" | "good" | "warning" | "error" {
  if (!status) return "neutral";
  if (status.state === "error" || status.state === "blocked") return "error";
  if (status.provider_ready) return status.degraded_mode ? "warning" : "good";
  return "warning";
}

function helperLabel(status: HelperBridgeStatus | null): string {
  if (!status) return "Not checked";
  if (status.provider_ready) return status.degraded_mode ? "Ready · degraded" : "Ready";
  if (status.state === "ready") return "Worker running · setup needed";
  return status.state || "Unavailable";
}

export function developerSettingsView(args: {
  helperStatus: HelperBridgeStatus | null;
  logRows: string;
  logsExpanded: boolean;
}): string {
  const helper = args.helperStatus;
  const helperNote = escapeHtml(helper?.message ?? "Refresh status to check the local worker.");
  const provider = helper?.provider_ready ? "Available" : "Setup Needed";
  const providerTone = helper?.provider_ready ? "good" : "warning";
  const device = helper?.cuda_ready ? "CUDA" : helper?.degraded_mode ? "CPU / degraded" : "Not verified";

  return settingsPage(
    "Diagnostics",
    "Technical status for troubleshooting. Normal translation controls stay in Meeting and Text.",
    "settings-view--developer",
    `${settingsSection("Local runtime", "Read-only status from the current helper/runtime boundary.", true)}${settingsCard(
      "settings-card--diagnostic",
      `<div class="settings-grid-v22"><div class="settings-field-v22"><span>Worker</span><div class="settings-status-row">${statusBadge(helperLabel(helper), helperTone(helper))}</div></div><div class="settings-field-v22"><span>Required outbound provider</span><div class="settings-status-row">${statusBadge(provider, providerTone)}</div></div><div class="settings-field-v22"><span>Execution device</span><div class="settings-status-row">${statusBadge(device, helper?.cuda_ready ? "good" : "neutral")}</div></div></div><p class="diagnostic-note">${helperNote}</p>${settingsActions(`${primaryButton("Refresh Status", { id: "runDiagnosticButton", class: "secondary" })}${primaryButton("Verify Models", { id: "refreshModelInventoryButton", class: "secondary" })}`, true)}`,
    )}${settingsSection("Recent command errors", "Frontend/Tauri command failures only; conversation bodies are not shown here.")}${settingsCard(
      "settings-card--diagnostic",
      `<div class="developer-log-list">${args.logRows}</div>${settingsActions(primaryButton(args.logsExpanded ? "Show Recent" : "See All Logs", { id: "seeAllLogsButton", class: "secondary" }), true)}`,
    )}`,
  );
}
