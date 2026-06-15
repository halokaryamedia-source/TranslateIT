import { invoke } from "@tauri-apps/api/core";
import type { RuntimeCommandError } from "./types";

const recentCommandErrors: RuntimeCommandError[] = [];

export function getRuntimeCommandErrors(): RuntimeCommandError[] {
  return [...recentCommandErrors];
}

export async function runCommand<T>(name: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    if (args) return await invoke<T>(name, args);
    return await invoke<T>(name);
  } catch (error: unknown) {
    const detail = {
      command: name,
      message: error instanceof Error ? error.message : String(error),
      occurred_at: new Date().toISOString(),
    };
    recentCommandErrors.unshift(detail);
    recentCommandErrors.splice(20);
    console.error(`[Tauri command failed] ${name}: ${detail.message}`, error);
    return null;
  }
}
