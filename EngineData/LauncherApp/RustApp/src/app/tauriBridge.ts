import { invoke } from "@tauri-apps/api/core";

export async function runCommand<T>(name: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    if (args) {
      return await invoke<T>(name, args);
    }
    return await invoke<T>(name);
  } catch {
    return null;
  }
}
