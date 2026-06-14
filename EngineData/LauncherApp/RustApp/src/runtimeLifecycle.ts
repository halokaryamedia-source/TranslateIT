import { invoke } from "@tauri-apps/api/core";

export type RuntimeHandoffSnapshot = {
  recorded_unix_ms: number;
  owner_id: string;
  session_id: string;
  ready_for_live_capture: boolean;
  ready_for_segment_runtime: boolean;
  ready_for_native_execution: boolean;
  ready_for_safe_save: boolean;
  ready_for_realtime_handoff: boolean;
  blocker_count: number;
  blockers: string[];
  note: string;
};

export type RuntimeHandoffStateReport = {
  has_snapshot: boolean;
  snapshot: RuntimeHandoffSnapshot | null;
  snapshot_age_ms: number | null;
  snapshot_stale: boolean;
  max_snapshot_age_ms: number;
  ready_for_start: boolean;
  blocker: string;
  note: string;
};

export type RuntimeLifecycleGateReport = {
  action: string;
  allowed: boolean;
  lifecycle_state: string;
  handoff_state: RuntimeHandoffStateReport;
  blocker: string;
  note: string;
};

export type RuntimeReadinessStage = {
  stage: string;
  ready: boolean;
  blocker: string;
  note: string;
};

export type RuntimeReadinessBundleReport = {
  ready_for_start_command: boolean;
  ready_for_live_capture_runtime: boolean;
  ready_for_native_inference_runtime: boolean;
  ready_for_transcript_persistence: boolean;
  ready_for_user_facing_runtime: boolean;
  diagnostics?: unknown;
  handoff_state: RuntimeHandoffStateReport;
  start_gate: RuntimeLifecycleGateReport;
  stop_gate: RuntimeLifecycleGateReport;
  stages: RuntimeReadinessStage[];
  blockers: string[];
  note: string;
};

export type MigrationClosureGateRequest = {
  manual_build_validation_passed: boolean;
  manual_runtime_smoke_passed: boolean;
  manual_ui_review_passed: boolean;
  manual_packaging_review_passed: boolean;
  explicit_owner_approval: boolean;
  allow_ready_for_review_transition: boolean;
  allow_release_candidate_claim: boolean;
};

export type MigrationClosureStage = {
  stage: string;
  passed: boolean;
  blocker: string;
  note: string;
};

export type MigrationClosureGateReport = {
  runtime: RuntimeReadinessBundleReport;
  ready_for_review: boolean;
  ready_for_release_candidate: boolean;
  ready_for_production_release: boolean;
  stages: MigrationClosureStage[];
  blockers: string[];
  note: string;
};

export type RuntimeLifecycleSummary = {
  label: string;
  allowed: boolean;
  lifecycle_state: string;
  details: string[];
};

export const blockedClosureGateRequest: MigrationClosureGateRequest = {
  manual_build_validation_passed: false,
  manual_runtime_smoke_passed: false,
  manual_ui_review_passed: false,
  manual_packaging_review_passed: false,
  explicit_owner_approval: false,
  allow_ready_for_review_transition: false,
  allow_release_candidate_claim: false,
};

export async function analyzeStartGate(): Promise<RuntimeLifecycleGateReport> {
  return invoke<RuntimeLifecycleGateReport>("analyze_start_gate");
}

export async function analyzeStopGate(): Promise<RuntimeLifecycleGateReport> {
  return invoke<RuntimeLifecycleGateReport>("analyze_stop_gate");
}

export async function analyzeRuntimeReadiness(): Promise<RuntimeReadinessBundleReport> {
  return invoke<RuntimeReadinessBundleReport>("analyze_runtime_readiness");
}

export async function analyzeMigrationClosure(
  request: MigrationClosureGateRequest = blockedClosureGateRequest,
): Promise<MigrationClosureGateReport> {
  return invoke<MigrationClosureGateReport>("analyze_migration_closure", { request });
}

export async function getRuntimeHandoffState(): Promise<RuntimeHandoffStateReport> {
  return invoke<RuntimeHandoffStateReport>("get_runtime_handoff_state");
}

export function summarizeLifecycleGate(report: RuntimeLifecycleGateReport): RuntimeLifecycleSummary {
  const snapshot = report.handoff_state.snapshot;
  const details = [
    `Action: ${report.action}`,
    `Allowed: ${report.allowed}`,
    `Lifecycle state: ${report.lifecycle_state}`,
    `Has handoff snapshot: ${report.handoff_state.has_snapshot}`,
    `Snapshot stale: ${report.handoff_state.snapshot_stale}`,
    `Snapshot age: ${report.handoff_state.snapshot_age_ms ?? "none"} ms`,
    `Max snapshot age: ${report.handoff_state.max_snapshot_age_ms} ms`,
    `Ready for start: ${report.handoff_state.ready_for_start}`,
    `Blocker: ${report.blocker || report.handoff_state.blocker || "none"}`,
    report.note,
  ];

  if (snapshot) {
    details.push(`Owner: ${snapshot.owner_id}`);
    details.push(`Session: ${snapshot.session_id}`);
    details.push(`Live capture ready: ${snapshot.ready_for_live_capture}`);
    details.push(`Segment runtime ready: ${snapshot.ready_for_segment_runtime}`);
    details.push(`Native execution ready: ${snapshot.ready_for_native_execution}`);
    details.push(`Safe save ready: ${snapshot.ready_for_safe_save}`);
    details.push(...snapshot.blockers.map((blocker) => `Snapshot blocker: ${blocker}`));
  }

  return {
    label: report.allowed ? `${report.action}: allowed` : `${report.action}: blocked`,
    allowed: report.allowed,
    lifecycle_state: report.lifecycle_state,
    details,
  };
}

export function summarizeReadinessBundle(report: RuntimeReadinessBundleReport): RuntimeLifecycleSummary {
  const details = [
    `Ready for Start command: ${report.ready_for_start_command}`,
    `Ready for live capture runtime: ${report.ready_for_live_capture_runtime}`,
    `Ready for native inference runtime: ${report.ready_for_native_inference_runtime}`,
    `Ready for transcript persistence: ${report.ready_for_transcript_persistence}`,
    `Ready for user-facing runtime: ${report.ready_for_user_facing_runtime}`,
    `Handoff state: ${report.handoff_state.note}`,
    `Start gate: ${report.start_gate.note}`,
    `Stop gate: ${report.stop_gate.note}`,
    ...report.stages.map((stage) => `${stage.stage}: ready=${stage.ready}, blocker=${stage.blocker || "none"}`),
    ...report.blockers.map((blocker) => `Blocker: ${blocker}`),
    report.note,
  ];

  return {
    label: report.ready_for_user_facing_runtime ? "runtime: user-facing ready" : "runtime: blocked",
    allowed: report.ready_for_start_command,
    lifecycle_state: report.ready_for_user_facing_runtime ? "ready" : "blocked",
    details,
  };
}

export function summarizeMigrationClosure(report: MigrationClosureGateReport): RuntimeLifecycleSummary {
  const details = [
    `Ready for review: ${report.ready_for_review}`,
    `Ready for release candidate: ${report.ready_for_release_candidate}`,
    `Ready for production release: ${report.ready_for_production_release}`,
    `Runtime user-facing ready: ${report.runtime.ready_for_user_facing_runtime}`,
    ...report.stages.map((stage) => `${stage.stage}: passed=${stage.passed}, blocker=${stage.blocker || "none"}`),
    ...report.blockers.map((blocker) => `Blocker: ${blocker}`),
    report.note,
  ];

  return {
    label: report.ready_for_release_candidate
      ? "closure: release-candidate allowed"
      : report.ready_for_review
        ? "closure: ready-for-review allowed"
        : "closure: blocked",
    allowed: report.ready_for_review,
    lifecycle_state: report.ready_for_production_release ? "production-ready" : "draft-or-review-gated",
    details,
  };
}
