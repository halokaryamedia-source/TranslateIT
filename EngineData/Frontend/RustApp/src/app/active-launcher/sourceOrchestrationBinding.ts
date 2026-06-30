import { virtualRouteApi } from "../bridge/virtualRouteApi";
import type { ProfessionalSourceReadinessOrchestrationStatus } from "../shared/types";

let clickHandler: ((event: MouseEvent) => void) | null = null;
let installedButton = false;

function setAssistantNotice(message: string): void {
  const assistant = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (assistant) assistant.textContent = message;
}

function summary(status: ProfessionalSourceReadinessOrchestrationStatus): string {
  const gaps = status.remaining_development_gaps.length
    ? status.remaining_development_gaps.join(" | ")
    : "none";
  const steps = status.steps
    .map((step) => `${step.name}:${step.ready ? "ready" : "blocked"}`)
    .join(" | ");
  return `Source orchestration ${status.state}: developmentOnly=${status.development_progress_percent_excluding_ci_local}%, next=${status.next_action}, gaps=${gaps}, steps=${steps}. CI/local/runtime proof is intentionally excluded from this percentage.`;
}

function ensureButton(): void {
  if (installedButton) return;
  const container = document.querySelector<HTMLElement>('[aria-label="Capture helper bridge preview controls"]');
  if (!container) return;
  if (container.querySelector('[data-source-orchestration-action="run"]')) {
    installedButton = true;
    return;
  }
  const button = document.createElement("button");
  button.className = "mic-test-button-v22 secondary";
  button.type = "button";
  button.dataset.sourceOrchestrationAction = "run";
  button.textContent = "Source Orchestration";
  container.appendChild(button);
  installedButton = true;
}

export function bindSourceOrchestrationUi(): () => void {
  ensureButton();
  clickHandler = (event: MouseEvent): void => {
    ensureButton();
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-source-orchestration-action="run"]');
    if (!button) return;
    button.disabled = true;
    void virtualRouteApi.runProfessionalSourceReadinessOrchestration()
      .then((status) => setAssistantNotice(summary(status)))
      .catch(() => setAssistantNotice("Source orchestration failed before returning a result."))
      .finally(() => {
        button.disabled = false;
      });
  };
  document.addEventListener("click", clickHandler);

  const retry = window.setTimeout(ensureButton, 800);
  return () => {
    window.clearTimeout(retry);
    if (clickHandler) document.removeEventListener("click", clickHandler);
    clickHandler = null;
  };
}
