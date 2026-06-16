let bound = false;

function clickSoon(selector: string): void {
  window.setTimeout(() => document.querySelector<HTMLButtonElement>(selector)?.click(), 80);
}

function bindSettingsAutoSync(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (!target) return;
    if (target.closest("#sourceLanguageButton,#targetLanguageButton,#swapLanguageButton,#realtimeModeButton,#qualityModeButton,[data-language-role][data-language-code]")) {
      clickSoon("#saveTranslateButton");
    }
  }, true);
}

export function bindReferenceUi(): void {
  if (bound) return;
  bound = true;
  bindSettingsAutoSync();
}
