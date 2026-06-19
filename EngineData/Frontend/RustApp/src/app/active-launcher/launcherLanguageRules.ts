export const LANGUAGE_CODES = ["id", "en"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];
export type LanguageSelectorRole = "source" | "target";

export const LANGUAGE_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: "id", label: "Indonesian" },
  { code: "en", label: "English" },
];

const UNSAFE_LANGUAGE_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;

function normalizeLanguageCode(value: string): string {
  return value.replace(UNSAFE_LANGUAGE_CHARS, "").trim().toLowerCase();
}

export function isLanguageCode(value: string): value is LanguageCode {
  const normalized = normalizeLanguageCode(value);
  return LANGUAGE_CODES.some((code) => code === normalized);
}

export function nextLanguageCode(value: string): LanguageCode {
  const normalized = normalizeLanguageCode(value);
  const index = LANGUAGE_CODES.findIndex((code) => code === normalized);
  return LANGUAGE_CODES[index >= 0 && index + 1 < LANGUAGE_CODES.length ? index + 1 : 0];
}
