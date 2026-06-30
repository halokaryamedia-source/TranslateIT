import { runCommand } from "../shared/tauriBridge";
import type { LivePipelineSessionSnapshot, VirtualMicOutputRouteRuntimeStubStatus, VirtualMicRouteContractStatus } from "../shared/types";

function routeStatusFallback(message: string): VirtualMicRouteContractStatus {
  return {
    ok: false,
    route_ready: false,
    selected_output_device: null,
    selected_input_device: null,
    preferred_output_device: null,
    preferred_input_device: null,
    output_device_found: false,
    input_device_found: false,
    preference_persisted: false,
    preference_path: null,
    evidence_path: null,
    route_output_contract_json: "{}",
    available_output_devices: [],
    available_input_devices: [],
    blocker: "frontend_bridge_unavailable",
    next_action: "open_developer_diagnostics",
    runtime_claim: "frontend_bridge_unavailable",
    updated_unix_ms: Date.now(),
  };
}

function routeStubFallback(message: string, sourceAudioPath: string | null = null): VirtualMicOutputRouteRuntimeStubStatus {
  return {
    ok: false,
    route_stub_ready: false,
    source_audio_path: sourceAudioPath,
    selected_output_device: null,
    selected_input_device: null,
    route_ready: false,
    source_audio_ready: Boolean(sourceAudioPath),
    blocker: "frontend_bridge_unavailable",
    next_action: "open_developer_diagnostics",
    runtime_claim: "frontend_bridge_unavailable",
    route_output_contract_json: JSON.stringify({
      schema: "translateit.virtual_route.runtime_stub_contract.frontend_fallback.v1",
      source_audio_path: sourceAudioPath,
      blocker: "frontend_bridge_unavailable",
      runtime_claim: "frontend_bridge_unavailable",
      note: message,
    }),
    evidence_path: null,
    updated_unix_ms: Date.now(),
  };
}

async function latestPipelineSourceAudioPath(): Promise<string | null> {
  const snapshot = await runCommand<LivePipelineSessionSnapshot>("get_live_pipeline_session_snapshot");
  return snapshot?.payload?.tts_audio_output_path?.trim() || null;
}

export const virtualRouteApi = {
  async getVirtualMicRouteContractStatus(): Promise<VirtualMicRouteContractStatus> {
    const result = await runCommand<VirtualMicRouteContractStatus>("get_virtual_mic_route_contract_status");
    return result ?? routeStatusFallback("Virtual route status failed before reaching the Tauri command bridge.");
  },

  async prepareVirtualMicOutputRouteRuntimeStub(sourceAudioPath?: string | null): Promise<VirtualMicOutputRouteRuntimeStubStatus> {
    const safeSourceAudioPath = sourceAudioPath?.trim() || null;
    const result = await runCommand<VirtualMicOutputRouteRuntimeStubStatus>(
      "prepare_virtual_mic_output_route_runtime_stub",
      { sourceAudioPath: safeSourceAudioPath },
    );
    return result ?? routeStubFallback("Virtual route runtime stub failed before reaching the Tauri command bridge.", safeSourceAudioPath);
  },

  async prepareVirtualMicOutputRouteRuntimeStubFromLatestPipeline(): Promise<VirtualMicOutputRouteRuntimeStubStatus> {
    const sourceAudioPath = await latestPipelineSourceAudioPath();
    const result = await runCommand<VirtualMicOutputRouteRuntimeStubStatus>(
      "prepare_virtual_mic_output_route_runtime_stub",
      { sourceAudioPath },
    );
    return result ?? routeStubFallback(
      "Virtual route runtime stub from latest pipeline failed before reaching the Tauri command bridge.",
      sourceAudioPath,
    );
  },
};
