import {
  analyzeMigrationClosure,
  blockedClosureGateRequest,
  getRuntimeStatusBundle,
  type MigrationClosureGateReport,
  type RuntimeLifecycleSummary,
  type RuntimeStatusBundleReport,
  summarizeMigrationClosure,
  summarizeRuntimeStatusBundle,
} from "./runtimeLifecycle";

export type RuntimePanelModel = {
  status: RuntimeStatusBundleReport;
  statusSummary: RuntimeLifecycleSummary;
  closure: MigrationClosureGateReport;
  closureSummary: RuntimeLifecycleSummary;
  primaryAction: string;
  canStart: boolean;
  canStop: boolean;
  canPrepareCaptureStream: boolean;
  hasTargetInputConfig: boolean;
  canMoveToReview: boolean;
  visibleWarnings: string[];
};

export async function loadRuntimePanelModel(): Promise<RuntimePanelModel> {
  const status = await getRuntimeStatusBundle();
  const closure = await analyzeMigrationClosure(blockedClosureGateRequest);
  const statusSummary = summarizeRuntimeStatusBundle(status);
  const closureSummary = summarizeMigrationClosure(closure);
  const primaryAction = status.next_action;
  const canStart = status.readiness.ready_for_start_command && !status.readiness.session_state.has_active_session;
  const canStop = status.readiness.ready_for_stop_command || status.readiness.session_state.has_active_session;
  const canPrepareCaptureStream = status.readiness.ready_for_capture_stream_creation;
  const hasTargetInputConfig = status.readiness.capture_bridge.input_config_probe.supports_target_format;
  const canMoveToReview = closure.ready_for_review;
  const visibleWarnings = buildVisibleWarnings(status, closure);

  return {
    status,
    statusSummary,
    closure,
    closureSummary,
    primaryAction,
    canStart,
    canStop,
    canPrepareCaptureStream,
    hasTargetInputConfig,
    canMoveToReview,
    visibleWarnings,
  };
}

export function renderRuntimePanelText(model: RuntimePanelModel): string {
  const lines = [
    `Primary action: ${model.primaryAction}`,
    `Can start: ${model.canStart}`,
    `Can stop: ${model.canStop}`,
    `Can prepare capture stream: ${model.canPrepareCaptureStream}`,
    `Has target input config: ${model.hasTargetInputConfig}`,
    `Can move to review: ${model.canMoveToReview}`,
    model.status.summary,
    model.status.readiness.capture_bridge.input_config_probe.note,
    model.status.readiness.capture_bridge.note,
    model.status.readiness.note,
    model.closure.note,
    ...model.visibleWarnings.map((warning) => `Warning: ${warning}`),
  ];

  return lines.join("\n");
}

function buildVisibleWarnings(
  status: RuntimeStatusBundleReport,
  closure: MigrationClosureGateReport,
): string[] {
  const warnings = [
    ...status.readiness.blockers,
    ...closure.blockers,
  ];
  const inputConfig = status.readiness.capture_bridge.input_config_probe;

  if (!inputConfig.ready_for_capture_bridge) {
    warnings.push(`Input config blocked: ${inputConfig.note}`);
  }
  if (!status.readiness.ready_for_capture_stream_creation) {
    warnings.push(`Capture bridge blocked: ${status.readiness.capture_bridge.note}`);
  }
  if (!status.readiness.ready_for_user_facing_runtime) {
    warnings.push("User-facing runtime is not ready; real capture/inference/output work remains.");
  }
  if (!closure.ready_for_review) {
    warnings.push("PR must remain draft until manual checks and owner approval pass.");
  }
  if (closure.ready_for_production_release) {
    warnings.push("Unexpected production-ready flag detected; migration gate should keep production release blocked.");
  }

  return [...new Set(warnings.filter(Boolean))];
}
