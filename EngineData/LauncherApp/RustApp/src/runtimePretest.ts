import {
  analyzeMigrationClosure,
  blockedClosureGateRequest,
  getRuntimeStatusBundle,
  type MigrationClosureGateReport,
  type NativeCaptureGateReport,
  type RuntimeStatusBundleReport,
} from "./runtimeLifecycle";

export type RuntimePretestingReadiness = {
  status: RuntimeStatusBundleReport;
  closure: MigrationClosureGateReport;
  captureGate: NativeCaptureGateReport;
  readyForTestingPhase: boolean;
  mustRemainDraft: boolean;
  blockers: string[];
  notes: string[];
};

export async function loadRuntimePretestingReadiness(): Promise<RuntimePretestingReadiness> {
  const status = await getRuntimeStatusBundle();
  const closure = await analyzeMigrationClosure(blockedClosureGateRequest);
  const captureGate = status.capture_gate;
  const blockers = [
    ...status.readiness.blockers,
    ...closure.blockers,
    ...captureGate.blockers,
  ].filter(Boolean);
  const uniqueBlockers = [...new Set(blockers)];
  const readyForTestingPhase = Boolean(
    status.readiness.handoff_state.has_snapshot ||
      status.readiness.session_state.has_active_session ||
      captureGate.ready_for_capture_start,
  );
  const mustRemainDraft = !closure.ready_for_review;
  const notes = [
    status.summary,
    status.readiness.note,
    captureGate.note,
    closure.note,
    "This helper prepares the pre-testing handoff only; it does not run build, tests, CI, or final validation.",
  ];

  return {
    status,
    closure,
    captureGate,
    readyForTestingPhase,
    mustRemainDraft,
    blockers: uniqueBlockers,
    notes,
  };
}
