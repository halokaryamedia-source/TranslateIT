import { defaultSettings } from "../shared/state";
import type { RuntimeSettings } from "../shared/types";

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
