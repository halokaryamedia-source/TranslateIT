import { invoke } from "@tauri-apps/api/core";
import type { RuntimeCommandError } from "./types";

const MAX_RECENT_COMMAND_ERRORS = 12;
const MAX_ERROR_MESSAGE_LENGTH = 360;
const MAX_COMMAND_ARGS_CHARS = 220;
const recentCommandErrors: RuntimeCommandError[] = [];

function describeBridgeEnvironment(): Record<string, unknown> {
  const scope = globalThis as typeof globalThis & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  return {
    hasInvoke: typeof invoke === "function",
    hasWindowTauri: Boolean(scope.__TAURI__),
    hasWindowTauriInternals: Boolean(scope.__TAURI_INTERNALS__),
    href: typeof window !== "undefined" ? window.location.href : "n/a",
  };
}

function summarizeArgs(args?: Record<string, unknown>): string {
  if (!args) return "{}";
  try {
    const body = JSON.stringify(args);
    if (body.length <= MAX_COMMAND_ARGS_CHARS) return body;
    return `${body.slice(0, MAX_COMMAND_ARGS_CHARS - 1)}â€¦`;
  } catch {
    return "{unserializable}";
  }
}

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
  return recentCommandErrors.slice(0, MAX_RECENT_COMMAND_ERRORS);
}

export async function runCommand<T>(name: string, args?: Record<string, unknown>): Promise<T | null> {
  const startedAt = performance.now();
  console.info(`[TranslateIT Bridge] ${name}:start`, {
    args: summarizeArgs(args),
    bridge: describeBridgeEnvironment(),
  });
  try {
    const result = args ? await invoke<T>(name, args) : await invoke<T>(name);
    console.info(`[TranslateIT Bridge] ${name}:resolved`, {
      durationMs: Math.round(performance.now() - startedAt),
      resultType: result === null ? "null" : typeof result,
    });
    return result;
  } catch (error: unknown) {
    const detail = {
      command: name,
      message: compactErrorMessage(error),
      occurred_at: new Date().toISOString(),
    };
    rememberCommandError(detail);
    console.error(`[Tauri command failed] ${name}: ${detail.message}`);
    console.info(`[TranslateIT Bridge] ${name}:rejected`, {
      durationMs: Math.round(performance.now() - startedAt),
      error: detail.message,
      bridge: describeBridgeEnvironment(),
    });
    return null;
  }
}
