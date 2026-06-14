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

export type RuntimeSessionSnapshot = {
  started_unix_ms: number;
  owner_id: string;
  session_id: string;
  handoff_recorded_unix_ms: number;
  phase: string;
  live_capture_stream_active: boolean;
  native_execution_active: boolean;
  transcript_persistence_active: boolean;
  safe_to_stop: boolean;
  note: string;
};

export type RuntimeSessionStateReport = {
  has_active_session: boolean;
  snapshot: RuntimeSessionSnapshot | null;
  active_age_ms: number | null;
  ready_for_stop: boolean;
  blocker: string;
  note: string;
};

export type NativeCaptureBridgeRequest = {
  require_active_session: boolean;
  require_safe_to_stop: boolean;
  requested_sample_rate_hz: number;
  requested_channels: number;
  requested_frame_ms: number;
};

export type NativeCaptureBridgeReport = {
  ready_for_stream_creation: boolean;
  active_session_required: boolean;
  active_session_present: boolean;
  safe_to_stop_ready: boolean;
  requested_sample_rate_hz: number;
  requested_channels: number;
  requested_frame_ms: number;
  backend: string;
  blockers: string[];
  note: string;
};

export const defaultNativeCaptureBridgeRequest: NativeCaptureBridgeRequest = {
  require_active_session: true,
  require_safe_to_stop: true,
  requested_sample_rate_hz: 16000,
  requested_channels: 1,
  requested_frame_ms: 20,
};

export type RuntimeLifecycleGateReport = {
  action: string;
  allowed: boolean;
  lifecycle_state: string;
  handoff_state: RuntimeHandoffStateReport;
  session_state: RuntimeSessionStateReport;
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
  ready_for_stop_command: boolean;
  ready_for_capture_stream_creation: boolean;
  ready_for_live_capture_runtime: boolean;
  ready_for_native_inference_runtime: boolean;
  ready_for_transcript_persistence: boolean;
  ready_for_user_facing_runtime: boolean;
  diagnostics?: unknown;
  handoff_state: RuntimeHandoffStateReport;
  session_state: RuntimeSessionStateReport;
  capture_bridge: NativeCaptureBridgeReport;
  start_gate: RuntimeLifecycleGateReport;
  stop_gate: RuntimeLifecycleGateReport;
  stages: RuntimeReadinessStage[];
  blockers: string[];
  note: string;
};

export type RuntimeStatusBundleReport = {
  engine_status: unknown;
  readiness: RuntimeReadinessBundleReport;
  next_action: string;
  summary: string;
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

export async function analyzeNativeCaptureBridge(
  request: NativeCaptureBridgeRequest = defaultNativeCaptureBridgeRequest,
): Promise<NativeCaptureBridgeReport> {
  return invoke<NativeCaptureBridgeReport>("analyze_native_capture_bridge_state", { request });
}

export async function getRuntimeStatusBundle(): Promise<RuntimeStatusBundleReport> {
  return invoke<RuntimeStatusBundleReport>("get_runtime_status_bundle");
}

export async function analyzeMigrationClosure(
  request: MigrationClosureGateRequest = blockedClosureGateRequest,
): Promise<MigrationClosureGateReport> {
  return invoke<MigrationClosureGateReport>("analyze_migration_closure", { request });
}

export async function getRuntimeHandoffState(): Promise<RuntimeHandoffStateReport> {
  return invoke<RuntimeHandoffStateReport>("get_runtime_handoff_state");
}

export async function getRuntimeSessionState(): Promise<RuntimeSessionStateReport> {
  return invoke<RuntimeSessionStateReport>("get_runtime_session_state");
}

export function summarizeLifecycleGate(report: RuntimeLifecycleGateReport): RuntimeLifecycleSummary {
  const handoff = report.handoff_state.snapshot;
  const session = report.session_state.snapshot;
  const details = [
    `Action: ${report.action}`,
    `Allowed: ${report.allowed}`,
    `Lifecycle state: ${report.lifecycle_state}`,
    `Has handoff snapshot: ${report.handoff_state.has_snapshot}`,
    `Handoff stale: ${report.handoff_state.snapshot_stale}`,
    `Handoff age: ${report.handoff_state.snapshot_age_ms ?? "none"} ms`,
    `Ready for start: ${report.handoff_state.ready_for_start}`,
    `Has active session: ${report.session_state.has_active_session}`,
    `Session ready for stop: ${report.session_state.ready_for_stop}`,
    `Session age: ${report.session_state.active_age_ms ?? "none"} ms`,
    `Blocker: ${report.blocker || report.handoff_state.blocker || report.session_state.blocker || "none"}`,
    report.note,
  ];

  if (handoff) {
    details.push(`Handoff owner: ${handoff.owner_id}`);
    details.push(`Handoff session: ${handoff.session_id}`);
    details.push(`Live capture ready: ${handoff.ready_for_live_capture}`);
    details.push(`Native execution ready: ${handoff.ready_for_native_execution}`);
    details.push(...handoff.blockers.map((blocker) => `Snapshot blocker: ${blocker}`));
  }

  if (session) {
    details.push(`Active session owner: ${session.owner_id}`);
    details.push(`Active session id: ${session.session_id}`);
    details.push(`Active session phase: ${session.phase}`);
    details.push(`Safe to stop: ${session.safe_to_stop}`);
  }

  return {
    label: report.allowed ? `${report.action}: allowed` : `${report.action}: blocked`,
    allowed: report.allowed,
    lifecycle_state: report.lifecycle_state,
    details,
  };
}

export function summarizeSessionState(report: RuntimeSessionStateReport): RuntimeLifecycleSummary {
  const details = [
    `Has active session: ${report.has_active_session}`,
    `Active age: ${report.active_age_ms ?? "none"} ms`,
    `Ready for stop: ${report.ready_for_stop}`,
    `Blocker: ${report.blocker || "none"}`,
    report.note,
  ];

  if (report.snapshot) {
    details.push(`Owner: ${report.snapshot.owner_id}`);
    details.push(`Session: ${report.snapshot.session_id}`);
    details.push(`Phase: ${report.snapshot.phase}`);
    details.push(`Live capture stream active: ${report.snapshot.live_capture_stream_active}`);
    details.push(`Native execution active: ${report.snapshot.native_execution_active}`);
    details.push(`Transcript persistence active: ${report.snapshot.transcript_persistence_active}`);
    details.push(`Safe to stop: ${report.snapshot.safe_to_stop}`);
  }

  return {
    label: report.has_active_session ? "runtime session: active" : "runtime session: inactive",
    allowed: report.ready_for_stop,
    lifecycle_state: report.snapshot?.phase ?? "idle",
    details,
  };
}

export function summarizeReadinessBundle(report: RuntimeReadinessBundleReport): RuntimeLifecycleSummary {
  const details = [
    `Ready for Start command: ${report.ready_for_start_command}`,
    `Ready for Stop command: ${report.ready_for_stop_command}`,
    `Ready for capture stream creation: ${report.ready_for_capture_stream_creation}`,
    `Ready for live capture runtime: ${report.ready_for_live_capture_runtime}`,
    `Ready for native inference runtime: ${report.ready_for_native_inference_runtime}`,
    `Ready for transcript persistence: ${report.ready_for_transcript_persistence}`,
    `Ready for user-facing runtime: ${report.ready_for_user_facing_runtime}`,
    `Capture bridge: ${report.capture_bridge.note}`,
    `Handoff state: ${report.handoff_state.note}`,
    `Session state: ${report.session_state.note}`,
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

export function summarizeRuntimeStatusBundle(report: RuntimeStatusBundleReport): RuntimeLifecycleSummary {
  const readiness = summarizeReadinessBundle(report.readiness);
  return {
    label: `status: ${report.next_action}`,
    allowed: readiness.allowed,
    lifecycle_state: readiness.lifecycle_state,
    details: [report.summary, `Next action: ${report.next_action}`, ...readiness.details],
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
