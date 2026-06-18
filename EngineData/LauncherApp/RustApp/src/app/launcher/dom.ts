export type UiRefs = ReturnType<typeof bindUi>;

const UNSAFE_SELECTOR_DIAGNOSTIC_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;
const MAX_SELECTOR_DIAGNOSTIC_CHARS = 120;

function selectorDiagnosticLabel(selector: string): string {
  const clean = selector.replace(UNSAFE_SELECTOR_DIAGNOSTIC_CHARS, "").replace(/\s+/g, " ").trim();
  if (!clean) return "required UI element";
  return clean.length > MAX_SELECTOR_DIAGNOSTIC_CHARS ? `${clean.slice(0, MAX_SELECTOR_DIAGNOSTIC_CHARS - 1)}…` : clean;
}

export function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selectorDiagnosticLabel(selector)} was not found.`);
  return element;
}

export function bindUi() {
  return {
    warmupScreen: requireElement<HTMLElement>("#warmupScreen"),
    warmupFill: requireElement<HTMLDivElement>("#warmupFill"),
    warmupPercent: requireElement<HTMLSpanElement>("#warmupPercent"),
    warmupDetail: requireElement<HTMLParagraphElement>("#warmupDetail"),
    warmupSteps: requireElement<HTMLOListElement>("#warmupSteps"),
    mainApp: requireElement<HTMLElement>("#mainApp"),
    homePage: requireElement<HTMLElement>("#homePage"),
    settingsPage: requireElement<HTMLElement>("#settingsPage"),
    settingsContent: requireElement<HTMLElement>("#settingsContent"),
    settingsButton: requireElement<HTMLButtonElement>("#settingsButton"),
    backHomeButton: requireElement<HTMLButtonElement>("#backHomeButton"),
    messageInput: requireElement<HTMLTextAreaElement>("#messageInput"),
    attachmentInput: requireElement<HTMLInputElement>("#attachmentInput"),
    sendButton: requireElement<HTMLButtonElement>("#sendButton"),
    microphoneButton: requireElement<HTMLButtonElement>("#microphoneButton"),
    quickMicButton: requireElement<HTMLButtonElement>("#quickMicButton"),
    recordStatusButton: requireElement<HTMLButtonElement>("#recordStatusButton"),
    recordStatusText: requireElement<HTMLElement>("#recordStatusText"),
    assistantMessage: requireElement<HTMLParagraphElement>("#assistantMessage"),
    heroTitle: requireElement<HTMLHeadingElement>("#heroTitle"),
    heroSubtitle: requireElement<HTMLParagraphElement>("#heroSubtitle"),
    realtimeStatus: requireElement<HTMLSpanElement>("#realtimeStatus"),
    qualityStatus: requireElement<HTMLSpanElement>("#qualityStatus"),
    gpuStatus: requireElement<HTMLSpanElement>("#gpuStatus"),
    developerOutput: requireElement<HTMLPreElement>("#developerOutput"),
    userPresence: requireElement<HTMLSpanElement>("#userPresence"),
    newChatButton: requireElement<HTMLButtonElement>("#newChatButton"),
    composerPlusButton: requireElement<HTMLButtonElement>("#composerPlusButton"),
    recentChatButton: requireElement<HTMLButtonElement>("#recentChatButton"),
    unsavedChatButton: requireElement<HTMLButtonElement>("#unsavedChatButton"),
    savedChatButton: requireElement<HTMLButtonElement>("#savedChatButton"),
    localDataButton: requireElement<HTMLButtonElement>("#localDataButton"),
    micOptionsButton: requireElement<HTMLButtonElement>("#micOptionsButton"),
    voiceOutputButton: requireElement<HTMLButtonElement>("#voiceOutputButton"),
    voiceOptionsButton: requireElement<HTMLButtonElement>("#voiceOptionsButton"),
    chatList: requireElement<HTMLElement>("#chatList"),
    directionPill: requireElement<HTMLElement>("#directionPill"),
    settingsNavItems: Array.from(document.querySelectorAll<HTMLButtonElement>("[data-settings-tab]")),
    navItems: Array.from(document.querySelectorAll<HTMLButtonElement>(".nav-item")),
  };
}
