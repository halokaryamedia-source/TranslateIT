import type { HardwareMetric, RuntimeSettings } from "./types";

export function defaultSettings(): RuntimeSettings {
  return {
    schema_version: 3,
    language_focus_mode: "id-en-focus",
    runtime_profile: "Realtime",
    source_language: "id",
    target_language: "en",
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

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function languageName(code: string): string {
  if (code.toLowerCase().startsWith("id")) return "Indonesian";
  if (code.toLowerCase().startsWith("en")) return "English";
  return code.toUpperCase();
}

export function percentText(metric?: HardwareMetric): string {
  return typeof metric?.percent === "number" ? `${Math.round(metric.percent)}%` : "N/A";
}
