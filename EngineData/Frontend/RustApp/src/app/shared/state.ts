import type { HardwareMetric, RuntimeSettings } from "./types";

const MAX_ERROR_MESSAGE_CHARS = 240;
const UNSAFE_DISPLAY_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;

export function defaultSettings(): RuntimeSettings {
  return {
    schema_version: 4,
    language_focus_mode: "id-en-focus",
    runtime_profile: "Realtime",
    source_language: "id",
    target_language: "en",
    history_enabled: true,
    audio: {
      input_device_id: null,
      output_device_id: null,
      sensitivity: 1,
      input_sensitivity: "Realtime",
      show_advanced_devices: false,
      allow_low_but_usable_input: true,
      allow_cpu_degraded_mode: false,
      auto_play_translation_voice: true,
      auto_play_out_voice: true,
      use_custom_voice_actor: true,
      voice_actor_profiles_root: "EngineData/VoiceActorProfiles",
    },
    voice_actor_profile_id: "marcel",
  };
}

function cleanDisplayText(value: string): string {
  return value.replace(UNSAFE_DISPLAY_CHARS, "").replace(/\s+/g, " ").trim();
}

export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const clean = cleanDisplayText(raw) || "Unknown error";
  return clean.length > MAX_ERROR_MESSAGE_CHARS ? `${clean.slice(0, MAX_ERROR_MESSAGE_CHARS - 1)}…` : clean;
}

export function languageName(code: string): string {
  const normalized = cleanDisplayText(code).toLowerCase();
  if (normalized.startsWith("id")) return "Indonesian";
  if (normalized.startsWith("en")) return "English";
  return normalized ? normalized.toUpperCase() : "Unknown";
}

export function percentText(metric?: HardwareMetric): string {
  if (typeof metric?.percent !== "number" || !Number.isFinite(metric.percent)) return "N/A";
  const rounded = Math.round(metric.percent);
  return `${Math.max(0, Math.min(999, rounded))}%`;
}
