import { defaultSettings } from "../shared/state";
import type { RuntimeSettings } from "../shared/types";

export function toggleVoiceOutput(settings: RuntimeSettings | null): { settings: RuntimeSettings; notice: string } {
  const next = settings ?? defaultSettings();
  next.audio.auto_play_out_voice = !next.audio.auto_play_out_voice;
  next.audio.auto_play_translation_voice = next.audio.auto_play_out_voice;
  return { settings: next, notice: next.audio.auto_play_out_voice ? "Voice output enabled." : "Voice output disabled." };
}

export function setRuntimeProfile(settings: RuntimeSettings | null, profile: "Realtime" | "Quality"): { settings: RuntimeSettings; notice: string } {
  const next = settings ?? defaultSettings();
  next.runtime_profile = profile;
  next.audio.input_sensitivity = profile;
  return { settings: next, notice: `Translate mode set to ${profile}.` };
}

export function swapLanguages(settings: RuntimeSettings | null): { settings: RuntimeSettings; notice: string } {
  const next = settings ?? defaultSettings();
  const source = next.source_language;
  next.source_language = next.target_language;
  next.target_language = source;
  return {
    settings: next,
    notice: `Language pair changed to ${next.source_language.toUpperCase()} > ${next.target_language.toUpperCase()}.`,
  };
}
