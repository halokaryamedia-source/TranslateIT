const SAVE_DELAY_MS = 220;
let bound = false;
let timer: number | null = null;
let clickHandler: ((event: MouseEvent) => void) | null = null;

const SETTING_CONTROL_SELECTOR = [
  "#runtimeProfileButton",
  "#languageFocusButton",
  "#audioVoiceToggleButton",
  "#audioSensitivityButton",
  "#realtimeModeButton",
  "#qualityModeButton",
  "#swapLanguageButton",
  "[data-language-role]",
].join(",");

function saveButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>("#saveSettingsButton,#saveTranslateButton");
}

function notice(message: string): void {
  const element = document.querySelector<HTMLElement>("#assistantMessage");
  if (element) element.textContent = message;
}

function scheduleSave(): void {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    const button = saveButton();
    if (!button) return;
    notice("Saving settings automatically...");
    button.click();
  }, SAVE_DELAY_MS);
}

export function bindSettingsAutosaveUi(): () => void {
  if (bound) return unbindSettingsAutosaveUi;
  bound = true;
  clickHandler = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target?.closest(SETTING_CONTROL_SELECTOR)) return;
    scheduleSave();
  };
  document.addEventListener("click", clickHandler, true);
  return unbindSettingsAutosaveUi;
}

export function unbindSettingsAutosaveUi(): void {
  if (!bound) return;
  if (clickHandler) document.removeEventListener("click", clickHandler, true);
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  clickHandler = null;
  bound = false;
}
