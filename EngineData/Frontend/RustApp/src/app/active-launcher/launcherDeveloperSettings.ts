import type { HelperBridgeStatus } from "../shared/types";
import { developerSettingsView } from "./settingsViews";

type CommandErrorLike = {
  command: string;
  message: string;
};

const MAX_RECENT_ERRORS = 6;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function errorRows(errors: CommandErrorLike[], expanded: boolean): string {
  const limit = expanded ? errors.length : MAX_RECENT_ERRORS;
  const rows = errors.slice(0, limit).map((error) =>
    `<p class="developer-log-row"><strong>${escapeHtml(error.command)}</strong><span>${escapeHtml(error.message)}</span></p>`,
  );
  if (!rows.length) {
    rows.push('<p class="developer-log-row"><strong>OK</strong><span>No recent frontend/Tauri command errors.</span></p>');
  }
  if (!expanded && errors.length > limit) {
    rows.push(`<p class="developer-log-row"><strong>More</strong><span>${errors.length - limit} older error(s) hidden.</span></p>`);
  }
  return rows.join("");
}

export function renderDeveloperSettingsView(args: {
  latestHelperBridgeStatus: HelperBridgeStatus | null;
  logsExpanded: boolean;
  commandErrors: CommandErrorLike[];
}): string {
  return developerSettingsView({
    helperStatus: args.latestHelperBridgeStatus,
    logRows: errorRows(args.commandErrors, args.logsExpanded),
    logsExpanded: args.logsExpanded,
  });
}
