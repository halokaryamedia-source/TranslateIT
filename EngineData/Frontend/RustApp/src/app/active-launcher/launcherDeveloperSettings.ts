import { percentText } from "../shared/state";
import type { CaptureHelperDispatchStatus, GpuPolicyReport, HardwareUsageReport, HelperBridgeStatus, ModelInventoryReport, RuntimeDiagnostics, RuntimeStatusBundleReport } from "../shared/types";
import { buildDeveloperLogRows } from "./launcherDeveloperLog";
import { developerSettingsView } from "./settingsViews";

export function renderDeveloperSettingsView(args: {
  latestBundle: RuntimeStatusBundleReport | null;
  latestDiagnostics: RuntimeDiagnostics | null;
  latestHardware: HardwareUsageReport | null;
  latestGpuPolicy: GpuPolicyReport | null;
  latestHelperBridgeStatus: HelperBridgeStatus | null;
  latestCaptureHelperDispatchStatus: CaptureHelperDispatchStatus | null;
  logsExpanded: boolean;
  latestModelInventory: ModelInventoryReport | null;
  commandErrors: { command: string; message: string }[];
}): string {
  const worker = args.latestBundle?.local_worker_manifest ?? args.latestBundle?.internal_validation_gate?.local_worker_manifest ?? null;
  const progress = args.latestBundle?.live_pipeline_gate?.progress_percent ?? args.latestBundle?.internal_validation_gate?.progress_percent ?? 0;
  const cpu = percentText(args.latestHardware?.cpu);
  const ram = percentText(args.latestHardware?.ram);
  const gpu = percentText(args.latestHardware?.gpu);
  const gpuStatus = args.latestGpuPolicy
    ? `GPU=${args.latestGpuPolicy.gpu_primary}; CUDA=${args.latestGpuPolicy.cuda_available}; status=${args.latestGpuPolicy.status}`
    : args.latestDiagnostics?.cuda_probe.gpu_summary ?? "GPU status unavailable";
  const logRows = buildDeveloperLogRows({
    runtimeLoaded: Boolean(args.latestBundle),
    worker,
    cpu,
    ram,
    gpu,
    gpuStatus,
    nextAction: args.latestBundle?.next_action ?? "Waiting for next diagnostic result.",
    commandErrors: args.commandErrors,
  });
  return developerSettingsView({
    progress,
    cpu,
    ram,
    gpu,
    gpuStatus,
    logRows,
    note: args.latestHardware?.note ?? "Run diagnostic to refresh hardware usage.",
    logsExpanded: args.logsExpanded,
    engineGood: Boolean(args.latestBundle),
    helperStatus: args.latestHelperBridgeStatus,
    captureHelperDispatchStatus: args.latestCaptureHelperDispatchStatus,
  });
}
