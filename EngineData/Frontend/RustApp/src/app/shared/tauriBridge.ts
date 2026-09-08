import { invoke } from "@tauri-apps/api/core";
import { sanitizeDiagnosticText } from "./diagnosticPrivacy";
import type { RuntimeCommandError } from "./types";

const MAX_RECENT_COMMAND_ERRORS = 12;
const MAX_ERROR_MESSAGE_LENGTH = 360;
const recentCommandErrors: RuntimeCommandError[] = [];

function compactErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return sanitizeDiagnosticText(message, "Unknown runtime error.", MAX_ERROR_MESSAGE_LENGTH);
}

function rememberCommandError(detail: RuntimeCommandError): void {
  const latest = recentCommandErrors[0];
  if (latest?.command === detail.command && latest.message === detail.message) {
    recentCommandErrors[0] = detail;
    return;
  }
  recentCommandErrors.unshift(detail);
  recentCommandErrors.splice(MAX_RECENT_COMMAND_ERRORS);
}

export function getRuntimeCommandErrors(): RuntimeCommandError[] {
  return recentCommandErrors.slice();
}

export async function runCommand<T>(name: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    return args ? await invoke<T>(name, args) : await invoke<T>(name);
  } catch (error: unknown) {
    rememberCommandError({
      command: name,
      message: compactErrorMessage(error),
      occurred_at: new Date().toISOString(),
    });
    return null;
  }
}
