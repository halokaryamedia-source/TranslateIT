export const MAX_MANUAL_TRANSLATION_CHARS = 2_000;
export const MAX_COMPOSER_TEXTAREA_HEIGHT = 120;
export const MIN_COMPOSER_TEXTAREA_HEIGHT = 24;

export function exceedsManualTranslationLimit(value: string): boolean {
  let count = 0;
  for (const character of value) {
    if (character) count += 1;
    if (count > MAX_MANUAL_TRANSLATION_CHARS) return true;
  }
  return false;
}
