import { runCommand } from "../shared/tauriBridge";
import type { LivePipelineSessionSnapshot, ProfessionalRuntimeReadinessGateStatus, VirtualMicOutputRouteRuntimeStubStatus, VirtualMicRouteContractStatus } from "../shared/types";

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

function professionalGateFallback(message: string): ProfessionalRuntimeReadinessGateStatus {
  const routeStub = routeStubFallback(message);
  const liveGate = {
    ready: false,
    state: "frontend_bridge_error",
    progress_percent: 0,
    blockers: ["frontend_bridge_unavailable"],
    next_action: "open_developer_diagnostics",
    summary: message,
    capture_ready: false,
    asr_ready: false,
    transcript_ready: false,
    translation_ready: false,
    tts_ready: false,
    audio_output_ready: false,
    virtual_mic_ready: false,
    virtual_mic_route_ready: false,
    virtual_mic_output_device: null,
    virtual_mic_input_device: null,
    evidence_path: null,
    runtime_claim: "frontend_bridge_unavailable",
    updated_unix_ms: Date.now(),
  };
  return {
    ok: false,
    state: "frontend_bridge_error",
    progress_percent: 0,
    blockers: ["frontend_bridge_unavailable"],
    next_action: "open_developer_diagnostics",
    summary: message,
    live_gate: liveGate,
    route_stub: routeStub,
    source_audio_path_ready: false,
    route_stub_ready: false,
    route_stub_source_audio_path: null,
    route_stub_evidence_path: null,
    route_stub_blocker: "frontend_bridge_unavailable",
    runtime_claim: "frontend_bridge_unavailable",
    updated_unix_ms: Date.now(),
  };
}

async function latestPipelineSourceAudioPath(): Promise<string | null> {
  const snapshot = await runCommand<LivePipelineSessionSnapshot>("get_live_pipeline_session_snapshot");
  return snapshot?.payload?.tts_audio_output_path?.trim() || null;
}

function safeDeviceName(value?: string | null): string | null {
  return value?.trim() || null;
}

export const virtualRouteApi = {
  async getVirtualMicRouteContractStatus(): Promise<VirtualMicRouteContractStatus> {
    const result = await runCommand<VirtualMicRouteContractStatus>("get_virtual_mic_route_contract_status");
    return result ?? routeStatusFallback("Virtual route status failed before reaching the Tauri command bridge.");
  },

  async setPreferredVirtualMicRouteDevices(outputDevice?: string | null, inputDevice?: string | null): Promise<VirtualMicRouteContractStatus> {
    const result = await runCommand<VirtualMicRouteContractStatus>(
      "set_preferred_virtual_mic_route_devices",
      {
        outputDevice: safeDeviceName(outputDevice),
        inputDevice: safeDeviceName(inputDevice),
      },
    );
    return result ?? routeStatusFallback("Virtual route preference save failed before reaching the Tauri command bridge.");
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

  async getProfessionalRuntimeReadinessGateStatus(): Promise<ProfessionalRuntimeReadinessGateStatus> {
    const result = await runCommand<ProfessionalRuntimeReadinessGateStatus>("get_professional_runtime_readiness_gate_status");
    return result ?? professionalGateFallback("Professional readiness gate failed before reaching the Tauri command bridge.");
  },
};
