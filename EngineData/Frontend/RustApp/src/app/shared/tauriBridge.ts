import { invoke } from "@tauri-apps/api/core";
import type { RuntimeCommandError } from "./types";

const MAX_RECENT_COMMAND_ERRORS = 12;
const MAX_ERROR_MESSAGE_LENGTH = 360;
const recentCommandErrors: RuntimeCommandError[] = [];

function redactLocalPaths(value: string): string {
  return value
    .replace(/[A-Z]:\\(?:[^\s"'<>|]+\\)*[^\s"'<>|]*/gi, "<local-path>")
    .replace(/\/(?:Users|home|mnt)\/(?:[^\s"'<>|]+\/)*[^\s"'<>|]*/gi, "<local-path>");
}

function compactErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const singleLine = redactLocalPaths(message.replace(/\s+/g, " ").trim());
  return singleLine.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${singleLine.slice(0, MAX_ERROR_MESSAGE_LENGTH - 1)}…`
    : singleLine;
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
