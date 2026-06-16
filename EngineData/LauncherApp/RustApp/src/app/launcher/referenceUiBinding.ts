let bound = false;
let toastTimer: number | null = null;

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

function bindSettingsAutoSync(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (!target) return;
    if (target.closest("#sourceLanguageButton,#targetLanguageButton,#swapLanguageButton,#realtimeModeButton,#qualityModeButton,[data-language-role][data-language-code]")) {
      showToast("Saving translate settings...");
      clickSoon("#saveTranslateButton");
    }
    if (target.closest("#saveSettingsButton,#saveTranslateButton")) showToast("Saving settings...");
    if (target.closest("#runDiagnosticButton")) showToast("Running diagnostic...");
    if (target.closest("#micTestButton")) showToast("Testing microphone...");
  }, true);
}

export function bindReferenceUi(): void {
  if (bound) return;
  bound = true;
  bindSettingsAutoSync();
}
