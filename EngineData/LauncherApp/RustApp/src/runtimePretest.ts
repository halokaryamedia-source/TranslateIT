import {
  analyzeMigrationClosure,
  blockedClosureGateRequest,
  getRuntimeStatusBundle,
  type MigrationClosureGateReport,
  type RuntimeStatusBundleReport,
} from "./runtimeLifecycle";

type CaptureGateSummary = {
  ready_for_capture_start: boolean;
  stream_open_requested: boolean;
  stream_open_performed: boolean;
  blockers: string[];
  note: string;
};

export type RuntimePretestingReadiness = {
  status: RuntimeStatusBundleReport;
  closure: MigrationClosureGateReport;
  captureGate: CaptureGateSummary | null;
  readyForTestingPhase: boolean;
  mustRemainDraft: boolean;
  blockers: string[];
  notes: string[];
};

export async function loadRuntimePretestingReadiness(): Promise<RuntimePretestingReadiness> {
  const status = await getRuntimeStatusBundle();
  const closure = await analyzeMigrationClosure(blockedClosureGateRequest);
  const captureGate = readCaptureGate(status);
  const blockers = [
    ...status.readiness.blockers,
    ...closure.blockers,
    ...(captureGate?.blockers ?? []),
  ].filter(Boolean);
  const uniqueBlockers = [...new Set(blockers)];
  const readyForTestingPhase = Boolean(
    status.readiness.handoff_state.has_snapshot ||
      status.readiness.session_state.has_active_session ||
      captureGate,
  );
  const mustRemainDraft = !closure.ready_for_review;
  const notes = [
    status.summary,
    status.readiness.note,
    captureGate?.note ?? "Capture gate was not included in the runtime status bundle.",
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

function readCaptureGate(status: RuntimeStatusBundleReport): CaptureGateSummary | null {
  return (status as unknown as { capture_gate?: CaptureGateSummary }).capture_gate ?? null;
}
