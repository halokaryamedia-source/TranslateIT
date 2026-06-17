let bound = false;

function setAssistantMessage(message: string): void {
  const element = document.querySelector<HTMLElement>("#assistantMessage");
  if (element) element.textContent = message;
}

async function copyText(value: string): Promise<void> {
  if (!value.trim()) {
    setAssistantMessage("There is no text to copy yet.");
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    setAssistantMessage("Copied to clipboard.");
  } catch (_error) {
    setAssistantMessage("Clipboard copy is unavailable in this runtime. Select the text manually.");
  }
}

export function bindCopyTranslationResultUi(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    const button = target?.closest<HTMLButtonElement>("[data-copy-translation]");
    if (!button) return;
    event.preventDefault();
    void copyText(button.dataset.copyTranslation ?? "");
  });
}
