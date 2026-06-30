import { virtualRouteApi } from "../bridge/virtualRouteApi";
import type { ProfessionalSourceReadinessOrchestrationStatus } from "../shared/types";
import { bindDiagnosticButton } from "./diagnosticButtonBinding";

function summary(status: ProfessionalSourceReadinessOrchestrationStatus): string {
  const gaps = status.remaining_development_gaps.length
    ? status.remaining_development_gaps.join(" | ")
    : "none";
  const steps = status.steps
    .map((step) => `${step.name}:${step.ready ? "ready" : "blocked"}`)
    .join(" | ");
  return `Source orchestration ${status.state}: developmentOnly=${status.development_progress_percent_excluding_ci_local}%, next=${status.next_action}, gaps=${gaps}, steps=${steps}. CI/local/runtime proof is intentionally excluded from this percentage.`;
}

export function bindSourceOrchestrationUi(): () => void {
  return bindDiagnosticButton({
    selector: '[data-source-orchestration-action="run"]',
    dataAttribute: "data-source-orchestration-action",
    dataValue: "run",
    label: "Source Orchestration",
    command: () => virtualRouteApi.runProfessionalSourceReadinessOrchestration(),
    summarize: summary,
    errorMessage: "Source orchestration failed before returning a result.",
    retryDelayMs: 800,
  });
}
