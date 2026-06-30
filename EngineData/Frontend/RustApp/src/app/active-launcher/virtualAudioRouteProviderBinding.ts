import { virtualAudioRouteRuntimeApi, type VirtualAudioRouteRuntimeStatus } from "../bridge/virtualAudioRouteRuntimeApi";

type ProviderResponseSummary = {
  blocker?: unknown;
  next_action?: unknown;
  runtime_claim?: unknown;
  audio_route_ready?: unknown;
  route_execution_attempted?: unknown;
};

let clickHandler: ((event: MouseEvent) => void) | null = null;
let installedButton = false;

function setAssistantNotice(message: string): void {
  const assistant = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (assistant) assistant.textContent = message;
}

function compact(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).slice(0, 240);
}

function providerResponseSummary(raw: string | undefined): string {
  if (!raw || raw === "{}") return "providerResponse=none";
  try {
    const parsed = JSON.parse(raw) as ProviderResponseSummary;
    const details = [
      ["providerBlocker", parsed.blocker],
      ["providerNext", parsed.next_action],
      ["providerClaim", parsed.runtime_claim],
      ["providerAudioReady", parsed.audio_route_ready],
      ["providerAttempted", parsed.route_execution_attempted],
    ]
      .map(([label, value]) => {
        const result = compact(value);
        return result ? `${label}=${result}` : null;
      })
      .filter((value): value is string => Boolean(value));
    return details.length ? details.join(", ") : "providerResponse=present";
  } catch {
    return "providerResponse=unparsed";
  }
}

function summary(status: VirtualAudioRouteRuntimeStatus): string {
  const provider = status.provider_exit_code === undefined || status.provider_exit_code === null
    ? "providerExit=none"
    : `providerExit=${status.provider_exit_code}`;
  const evidence = status.evidence_path ? ` evidence=${status.evidence_path}` : "";
  const payload = status.provider_payload_path ? ` payload=${status.provider_payload_path}` : "";
  const script = status.provider_script_path ? ` script=${status.provider_script_path}` : "";
  const response = providerResponseSummary(status.provider_response_json);
  return `Provider dry run ${status.state}: ok=${status.ok}, routeReady=${status.route_ready}, sourceReady=${status.source_audio_ready}, ${provider}, next=${status.next_action}, blocker=${status.blocker || "none"}, ${response}.${script}${payload}${evidence} This is dry-run/source evidence, not Windows audio route proof.`;
}

function ensureButton(): void {
  if (installedButton) return;
  const container = document.querySelector<HTMLElement>('[aria-label="Capture helper bridge preview controls"]');
  if (!container) return;
  if (container.querySelector('[data-virtual-audio-provider-action="dry-run"]')) {
    installedButton = true;
    return;
  }
  const button = document.createElement("button");
  button.className = "mic-test-button-v22 secondary";
  button.type = "button";
  button.dataset.virtualAudioProviderAction = "dry-run";
  button.textContent = "Provider Dry Run";
  container.appendChild(button);
  installedButton = true;
}

export function bindVirtualAudioRouteProviderUi(): () => void {
  ensureButton();
  clickHandler = (event: MouseEvent): void => {
    ensureButton();
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-virtual-audio-provider-action="dry-run"]');
    if (!button) return;
    button.disabled = true;
    void virtualAudioRouteRuntimeApi.dispatchProviderFromLatestPipeline(false, true)
      .then((status) => setAssistantNotice(summary(status)))
      .catch(() => setAssistantNotice("Provider dry run failed before returning a result."))
      .finally(() => {
        button.disabled = false;
      });
  };
  document.addEventListener("click", clickHandler);

  const retry = window.setTimeout(ensureButton, 900);
  return () => {
    window.clearTimeout(retry);
    if (clickHandler) document.removeEventListener("click", clickHandler);
    clickHandler = null;
  };
}
