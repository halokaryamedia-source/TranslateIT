import { percentText } from "../../shared/state";
import type { HelperBridgeStatus, ModelInventoryReport, RuntimeDiagnostics, RuntimeStatusBundleReport } from "../../shared/types";
import { buildDeveloperLogRows } from "./launcherDeveloperLog";
import { developerSettingsView } from "./settingsViews";

export function renderDeveloperSettingsView(args: {
  latestBundle: RuntimeStatusBundleReport | null;
  latestDiagnostics: RuntimeDiagnostics | null;
  latestHardware: { cpu?: string | number | null; ram?: string | number | null; gpu?: string | number | null; note?: string } | null;
  latestGpuPolicy: { gpu_primary?: boolean; cuda_available?: boolean; status: string } | null;
  latestHelperBridgeStatus: HelperBridgeStatus | null;
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
    ? `${args.latestGpuPolicy.gpu_primary ? "GPU primary" : "CPU fallback"}; CUDA=${args.latestGpuPolicy.cuda_available}; status=${args.latestGpuPolicy.status}`
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
  });
}
