export const DIAGNOSTIC_BUTTON_CLASS = "mic-test-button-v22 secondary";
export const DIAGNOSTIC_CONTROLS_SELECTOR = '[aria-label="Capture helper bridge preview controls"]';

export type DiagnosticButtonBindingOptions<Result> = {
  selector: string;
  dataKey: string;
  dataValue: string;
  label: string;
  command(): Promise<Result>;
  summarize(result: Result): string;
  errorMessage: string;
  retryDelayMs?: number;
};

export function getDiagnosticsControlsContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(DIAGNOSTIC_CONTROLS_SELECTOR);
}

export function setAssistantNotice(message: string): void {
  const assistant = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (assistant) assistant.textContent = message;
}

function ensureDiagnosticButton<Result>(options: DiagnosticButtonBindingOptions<Result>): void {
  const container = getDiagnosticsControlsContainer();
  if (!container) return;
  if (container.querySelector(options.selector)) return;
  const button = document.createElement("button");
  button.className = DIAGNOSTIC_BUTTON_CLASS;
  button.type = "button";
  button.dataset[options.dataKey] = options.dataValue;
  button.textContent = options.label;
  container.appendChild(button);
}

export function bindDiagnosticButton<Result>(options: DiagnosticButtonBindingOptions<Result>): () => void {
  ensureDiagnosticButton(options);
  const onClick = (event: MouseEvent): void => {
    ensureDiagnosticButton(options);
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(options.selector);
    if (!button) return;
    button.disabled = true;
    void options.command()
      .then((result) => setAssistantNotice(options.summarize(result)))
      .catch(() => setAssistantNotice(options.errorMessage))
      .finally(() => {
        button.disabled = false;
      });
  };
  document.addEventListener("click", onClick);
  const retry = window.setTimeout(() => ensureDiagnosticButton(options), options.retryDelayMs ?? 900);
  return () => {
    window.clearTimeout(retry);
    document.removeEventListener("click", onClick);
  };
}
