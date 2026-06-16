const HERO_TITLE = "How can I help translate today?";
const HERO_SUBTITLE = "Type a message, or press the microphone button on the right to record speech locally.";
const TOPBAR_SUBTITLE = "Speak Indonesian. Get translated English voice output.";
const COMPOSER_PLACEHOLDER = "Ask anything...";
const COMPOSER_HELP = "Type a message, or press the microphone button on the right to record speech locally.";
const ASSISTANT_READY = "Recording started. I will update this conversation when the voice translation result is ready.";

let bound = false;
let observer: MutationObserver | null = null;

function setText(selector: string, value: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element && element.textContent !== value) element.textContent = value;
}

function setInputPlaceholder(selector: string, value: string): void {
  const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (element && element.placeholder !== value) element.placeholder = value;
}

function setFeatureCardCopy(): void {
  const cards = document.querySelectorAll<HTMLElement>(".feature-card");
  const textCard = cards[0]?.querySelector<HTMLElement>("p");
  const voiceCard = cards[1]?.querySelector<HTMLElement>("p");
  const textCopy = "Type or paste Indonesian text and get an English translation in the conversation.";
  const voiceCopy = "Press the microphone button. A recording indicator appears while voice capture is active.";
  if (textCard && textCard.textContent !== textCopy) textCard.textContent = textCopy;
  if (voiceCard && voiceCard.textContent !== voiceCopy) voiceCard.textContent = voiceCopy;
}

function applyReferenceCopy(): void {
  setText(".topbar p", TOPBAR_SUBTITLE);
  setText("#heroTitle", HERO_TITLE);
  setText("#heroSubtitle", HERO_SUBTITLE);
  setInputPlaceholder("#messageInput", COMPOSER_PLACEHOLDER);
  setText(".composer-help", COMPOSER_HELP);
  setFeatureCardCopy();
  const assistant = document.querySelector<HTMLElement>("#assistantMessage");
  if (assistant && /warmup completed|local runtime warmup completed|startup warmup/i.test(assistant.textContent ?? "")) {
    assistant.textContent = ASSISTANT_READY;
  }
}

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
  applyReferenceCopy();
  bindSettingsAutoSync();
  observer = new MutationObserver(() => applyReferenceCopy());
  const app = document.querySelector("#app");
  if (app) observer.observe(app, { childList: true, subtree: true });
}

bindReferenceUi();
