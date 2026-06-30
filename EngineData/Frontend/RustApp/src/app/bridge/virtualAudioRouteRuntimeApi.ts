import { runCommand } from "../shared/tauriBridge";
import type { LivePipelineSessionSnapshot } from "../shared/types";

export type VirtualAudioRouteRuntimeStatus = {
  ok: boolean;
  state: string;
  route_runtime_ready: boolean;
  route_execution_attempted: boolean;
  route_execution_enabled: boolean;
  source_audio_path: string | null;
  source_audio_ready: boolean;
  selected_output_device: string | null;
  selected_input_device: string | null;
  route_ready: boolean;
  blocker: string;
  next_action: string;
  route_runtime_contract_json: string;
  evidence_path: string | null;
  provider_script_path?: string | null;
  provider_payload_path?: string | null;
  provider_exit_code?: number | null;
  provider_response_json?: string;
  runtime_claim: string;
  updated_unix_ms: number;
};

function fallback(message: string, sourceAudioPath: string | null = null): VirtualAudioRouteRuntimeStatus {
  return {
    ok: false,
    state: "frontend_bridge_error",
    route_runtime_ready: false,
    route_execution_attempted: false,
    route_execution_enabled: false,
    source_audio_path: sourceAudioPath,
    source_audio_ready: Boolean(sourceAudioPath),
    selected_output_device: null,
    selected_input_device: null,
    route_ready: false,
    blocker: "frontend_bridge_unavailable",
    next_action: "open_developer_diagnostics",
    route_runtime_contract_json: JSON.stringify({
      schema: "translateit.virtual_audio_route.runtime_handoff.frontend_fallback.v1",
      source_audio_path: sourceAudioPath,
      blocker: "frontend_bridge_unavailable",
      runtime_claim: "frontend_bridge_unavailable",
      note: message,
    }),
    evidence_path: null,
    provider_script_path: null,
    provider_payload_path: null,
    provider_exit_code: null,
    provider_response_json: "{}",
    runtime_claim: "frontend_bridge_unavailable",
    updated_unix_ms: Date.now(),
  };
}

async function latestTtsOutputPath(): Promise<string | null> {
  const snapshot = await runCommand<LivePipelineSessionSnapshot>("get_live_pipeline_session_snapshot");
  return snapshot?.payload?.tts_audio_output_path?.trim() || null;
}

export const virtualAudioRouteRuntimeApi = {
  async prepareGuardedVirtualAudioRouteRuntime(
    sourceAudioPath?: string | null,
    enableRouteRuntime = false,
  ): Promise<VirtualAudioRouteRuntimeStatus> {
    const safeSourceAudioPath = sourceAudioPath?.trim() || null;
    const result = await runCommand<VirtualAudioRouteRuntimeStatus>(
      "prepare_guarded_virtual_audio_route_runtime",
      {
        sourceAudioPath: safeSourceAudioPath,
        enableRouteRuntime,
      },
    );
    return result ?? fallback(
      "Virtual audio route runtime handoff failed before reaching the Tauri command bridge.",
      safeSourceAudioPath,
    );
  },

  async prepareFromLatestPipeline(enableRouteRuntime = false): Promise<VirtualAudioRouteRuntimeStatus> {
    const sourceAudioPath = await latestTtsOutputPath();
    return this.prepareGuardedVirtualAudioRouteRuntime(sourceAudioPath, enableRouteRuntime);
  },

  async dispatchGuardedProvider(
    sourceAudioPath?: string | null,
    enableRouteRuntime = false,
    dryRun = true,
  ): Promise<VirtualAudioRouteRuntimeStatus> {
    const safeSourceAudioPath = sourceAudioPath?.trim() || null;
    const result = await runCommand<VirtualAudioRouteRuntimeStatus>(
      "dispatch_guarded_virtual_audio_route_provider",
      {
        sourceAudioPath: safeSourceAudioPath,
        enableRouteRuntime,
        dryRun,
      },
    );
    return result ?? fallback(
      "Virtual audio route provider dispatch failed before reaching the Tauri command bridge.",
      safeSourceAudioPath,
    );
  },

  async dispatchProviderFromLatestPipeline(enableRouteRuntime = false, dryRun = true): Promise<VirtualAudioRouteRuntimeStatus> {
    const sourceAudioPath = await latestTtsOutputPath();
    return this.dispatchGuardedProvider(sourceAudioPath, enableRouteRuntime, dryRun);
  },
};
