import { virtualAudioRouteRuntimeApi, type VirtualAudioRouteRuntimeStatus } from "../bridge/virtualAudioRouteRuntimeApi";
import { bindDiagnosticButton } from "./diagnosticButtonBinding";

type ProviderResponseSummary = {
  blocker?: unknown;
  next_action?: unknown;
  runtime_claim?: unknown;
  audio_route_ready?: unknown;
  route_execution_attempted?: unknown;
};

type ProviderResponseField = readonly [label: string, value: unknown];

function compact(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).slice(0, 240);
}

function providerResponseSummary(raw: string | undefined): string {
  if (!raw || raw === "{}") return "providerResponse=none";
  try {
    const parsed = JSON.parse(raw) as ProviderResponseSummary;
    const fields: ProviderResponseField[] = [
      ["providerBlocker", parsed.blocker],
      ["providerNext", parsed.next_action],
      ["providerClaim", parsed.runtime_claim],
      ["providerAudioReady", parsed.audio_route_ready],
      ["providerAttempted", parsed.route_execution_attempted],
    ];
    const details = fields
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

export function bindVirtualAudioRouteProviderUi(): () => void {
  return bindDiagnosticButton({
    selector: '[data-virtual-audio-provider-action="dry-run"]',
    dataAttribute: "data-virtual-audio-provider-action",
    dataValue: "dry-run",
    label: "Provider Dry Run",
    command: () => virtualAudioRouteRuntimeApi.dispatchProviderFromLatestPipeline(false, true),
    summarize: summary,
    errorMessage: "Provider dry run failed before returning a result.",
    retryDelayMs: 900,
  });
}
