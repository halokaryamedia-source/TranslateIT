import { invoke } from "@tauri-apps/api/core";
import type { RuntimeCommandError } from "./types";

const MAX_RECENT_COMMAND_ERRORS = 12;
const MAX_ERROR_MESSAGE_LENGTH = 360;
const recentCommandErrors: RuntimeCommandError[] = [];

function compactErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const singleLine = message.replace(/\s+/g, " ").trim();
  return singleLine.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${singleLine.slice(0, MAX_ERROR_MESSAGE_LENGTH - 1)}…`
    : singleLine;
}

export function getRuntimeCommandErrors(): RuntimeCommandError[] {
  return recentCommandErrors.slice(0, MAX_RECENT_COMMAND_ERRORS);
}

export async function runCommand<T>(name: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    if (args) return await invoke<T>(name, args);
    return await invoke<T>(name);
  } catch (error: unknown) {
    const detail = {
      command: name,
      message: compactErrorMessage(error),
      occurred_at: new Date().toISOString(),
    };
    recentCommandErrors.unshift(detail);
    recentCommandErrors.splice(MAX_RECENT_COMMAND_ERRORS);
    console.error(`[Tauri command failed] ${name}: ${detail.message}`);
    return null;
  }
}
