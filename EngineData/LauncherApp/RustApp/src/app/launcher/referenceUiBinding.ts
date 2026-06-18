let bound = false;
let toastTimer: number | null = null;
let clickHandler: ((event: MouseEvent) => void) | null = null;

function clickSoon(selector: string): void {
  window.setTimeout(() => document.querySelector<HTMLButtonElement>(selector)?.click(), 80);
}

function toastElement(): HTMLElement {
  let toast = document.querySelector<HTMLElement>("#uiToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "uiToast";
    toast.className = "ui-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    document.body.appendChild(toast);
  }
  return toast;
}

function showToast(message: string): void {
  const toast = toastElement();
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

async function copyTranslation(button: HTMLButtonElement): Promise<void> {
  const value = button.dataset.copyTranslation ?? "";
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    showToast("Translated text copied.");
  } catch (_error) {
    showToast("Copy failed. Select the translated text manually.");
  }
}

function handleReferenceClick(event: MouseEvent): void {
  const target = event.target as Element | null;
  if (!target) return;
  const copyButton = target.closest<HTMLButtonElement>("[data-copy-translation]");
  if (copyButton) {
    void copyTranslation(copyButton);
    return;
  }
  if (target.closest("#sourceLanguageButton,#targetLanguageButton,#swapLanguageButton,#realtimeModeButton,#qualityModeButton,[data-language-role][data-language-code]")) {
    showToast("Saving translate settings...");
    clickSoon("#saveTranslateButton");
  }
  if (target.closest("#saveSettingsButton,#saveTranslateButton")) showToast("Saving settings...");
  if (target.closest("#runDiagnosticButton")) showToast("Running diagnostic...");
  if (target.closest("#micTestButton")) showToast("Testing microphone...");
}

export function bindReferenceUi(): () => void {
  if (bound) return unbindReferenceUi;
  bound = true;
  clickHandler = handleReferenceClick;
  document.addEventListener("click", clickHandler, true);
  return unbindReferenceUi;
}

export function unbindReferenceUi(): void {
  if (!bound || !clickHandler) return;
  document.removeEventListener("click", clickHandler, true);
  clickHandler = null;
  bound = false;
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = null;
}
