export const LANGUAGE_CODES = ["id", "en"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];
export type LanguageSelectorRole = "source" | "target";

export const LANGUAGE_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: "id", label: "Indonesian" },
  { code: "en", label: "English" },
];

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGE_CODES.some((code) => code === value);
}

export function nextLanguageCode(value: string): LanguageCode {
  const index = LANGUAGE_CODES.findIndex((code) => code === value.toLowerCase());
  return LANGUAGE_CODES[index >= 0 && index + 1 < LANGUAGE_CODES.length ? index + 1 : 0];
}
