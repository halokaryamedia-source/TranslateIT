import { runtimeApi } from "../../bridge/runtimeApi";
import type { RuntimeSettings } from "../../shared/types";
import { translationResultView } from "../chatViews";
import { MAX_MANUAL_TRANSLATION_CHARS, exceedsManualTranslationLimit } from "../launcherTextRules";
import { traceUserFlow } from "../userFlowTrace";

export type TextTranslationControllerArgs = {
  source: string;
  currentSettings: RuntimeSettings | null;
  saveChatMessage: (role: "user" | "assistant", content: string) => Promise<void>;
  setAssistantNotice: (message: string) => void;
  voiceOutputStatus: () => string;
};

export type TextTranslationControllerResult = {
  ok: boolean;
  source: string;
  response: string;
  voiceStatus: string;
  html: string;
  notice: string;
};

export function validateTextTranslationSource(source: string): string | null {
  if (!source.trim()) return "Type some text to translate first.";
  if (exceedsManualTranslationLimit(source)) return `Text is too long. Limit: ${MAX_MANUAL_TRANSLATION_CHARS} characters.`;
  return null;
}

export async function runTextTranslationFlow(args: TextTranslationControllerArgs): Promise<TextTranslationControllerResult> {
  const source = args.source.trim();
  await args.saveChatMessage("user", source);
  args.setAssistantNotice("Translating text locally...");
  const result = await runtimeApi.translateText(source).catch(() => null);
  const response = result?.ok
    ? result.message
    : result?.message ?? "Translation command failed. Open Settings > Developer for diagnostics.";
  const voiceStatus = result?.ok ? args.voiceOutputStatus() : "Error";

  if (!result?.ok) {
    traceUserFlow("error.user_visible", { reason: "translation_failed", message: result?.message ?? "unknown" });
    return {
      ok: false,
      source,
      response,
      voiceStatus,
      html: translationResultView(source, response, voiceStatus),
      notice: `Translation failed. ${response}`,
    };
  }

  await args.saveChatMessage("assistant", response);
  return {
    ok: true,
    source,
    response,
    voiceStatus,
    html: translationResultView(source, response, voiceStatus),
    notice: "Translation completed. Result is shown above.",
  };
}
