import { virtualRouteApi } from "../bridge/virtualRouteApi";
import type { VirtualMicRouteContractStatus } from "../shared/types";

export type VirtualRouteSelectionOption = {
  label: string;
  value: string;
  selected: boolean;
  preferred: boolean;
};

export type VirtualRouteSelectionSurfaceState = {
  ok: boolean;
  route_ready: boolean;
  output_options: VirtualRouteSelectionOption[];
  input_options: VirtualRouteSelectionOption[];
  selected_output_device: string | null;
  selected_input_device: string | null;
  preferred_output_device: string | null;
  preferred_input_device: string | null;
  blocker: string;
  next_action: string;
  evidence_path: string | null;
  summary: string;
  runtime_claim: string;
};

function option(name: string, selected: string | null, preferred: string | null): VirtualRouteSelectionOption {
  return {
    label: name,
    value: name,
    selected: selected === name,
    preferred: preferred === name,
  };
}

function stateFromStatus(status: VirtualMicRouteContractStatus): VirtualRouteSelectionSurfaceState {
  const outputOptions = status.available_output_devices.map((name) =>
    option(name, status.selected_output_device, status.preferred_output_device),
  );
  const inputOptions = status.available_input_devices.map((name) =>
    option(name, status.selected_input_device, status.preferred_input_device),
  );
  return {
    ok: status.ok,
    route_ready: status.route_ready,
    output_options: outputOptions,
    input_options: inputOptions,
    selected_output_device: status.selected_output_device,
    selected_input_device: status.selected_input_device,
    preferred_output_device: status.preferred_output_device,
    preferred_input_device: status.preferred_input_device,
    blocker: status.blocker,
    next_action: status.next_action,
    evidence_path: status.evidence_path,
    summary: status.route_ready
      ? "Virtual route devices are selected. This is still route-selection evidence, not audio runtime proof."
      : "Virtual route selection needs an existing virtual output/input device before runtime validation.",
    runtime_claim: "virtual_route_selection_surface_source_side_not_audio_runtime_proof",
  };
}

export async function loadVirtualRouteSelectionSurfaceState(): Promise<VirtualRouteSelectionSurfaceState> {
  const status = await virtualRouteApi.getVirtualMicRouteContractStatus();
  return stateFromStatus(status);
}

export async function saveVirtualRouteSelectionSurfaceSelection(
  outputDevice?: string | null,
  inputDevice?: string | null,
): Promise<VirtualRouteSelectionSurfaceState> {
  const status = await virtualRouteApi.setPreferredVirtualMicRouteDevices(outputDevice, inputDevice);
  return stateFromStatus(status);
}
