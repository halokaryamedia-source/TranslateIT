import { runtimeApi } from "./runtimeApi";
import { defaultSettings, errorMessage } from "../shared/state";
import type {
  GpuPolicyReport,
  HelperBridgeActionResult,
  HelperBridgeStatus,
  InputPreparationStatus,
  LiveMeetingRuntimeGateStatus,
  ModelInventoryReport,
  RuntimeDiagnostics,
  RuntimeSettings,
  RuntimeStatusBundleReport,
} from "../shared/types";

export type ProductReadinessLevel = "ready" | "partial" | "blocked" | "checking";

export type ProductReadiness = {
  level: ProductReadinessLevel;
  textReady: boolean;
  helperReady: boolean;
  providerReady: boolean;
  microphoneReady: boolean;
  modelsReady: boolean;
  voiceReady: boolean;
  meetingRouteReady: boolean;
  meetingReady: boolean;
  canTranslateText: boolean;
  canRecordVoice: boolean;
  recording: boolean;
  nextAction: string;
  blockers: string[];
  summary: string;
  textStatus: string;
  helperStatus: string;
  modelStatus: string;
  microphoneStatus: string;
  voiceStatus: string;
  meetingStatus: string;
  runtimeStatus: string;
};

export type ProductRuntimeSnapshot = {
  settings: RuntimeSettings;
  readiness: ProductReadiness;
  bundle: RuntimeStatusBundleReport | null;
  diagnostics: RuntimeDiagnostics | null;
  helper: HelperBridgeStatus | null;
  modelInventory: ModelInventoryReport | null;
  gpuPolicy: GpuPolicyReport | null;
  inputStatus: InputPreparationStatus | null;
};

export type ProductTranslationResult = {
  ok: boolean;
  source: string;
  translated: string;
  status: string;
  message: string;
};

export type ProductSetupAction = "start-helper" | "check-worker" | "verify-models" | "check-microphone";
export type ProductRecoveryAction = "fix-setup";

function compact(value: unknown, fallback = "Unknown"): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > 180 ? `${text.slice(0, 179).trimEnd()}…` : text;
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => compact(value, "")).filter(Boolean)));
}

function modelReady(modelInventory: ModelInventoryReport | null, bundle: RuntimeStatusBundleReport | null): boolean {
  if (modelInventory?.ok) return true;
  const manifest = bundle?.local_worker_manifest ?? bundle?.internal_validation_gate?.local_worker_manifest ?? null;
  if (!manifest) return false;
  return Boolean(
    manifest.ok ||
    (manifest.asr_model_ready && manifest.realtime_translation_model_ready) ||
    (manifest.realtime_translation_model_ready && manifest.quality_translation_model_ready),
  );
}

function meetingGate(bundle: RuntimeStatusBundleReport | null): LiveMeetingRuntimeGateStatus | null {
  return bundle?.live_meeting_runtime_gate ?? null;
}

function collectBlockers(
  bundle: RuntimeStatusBundleReport | null,
  helper: HelperBridgeStatus | null,
  modelInventory: ModelInventoryReport | null,
  inputStatus: InputPreparationStatus | null,
  diagnostics: RuntimeDiagnostics | null,
): string[] {
  const readiness = bundle?.readiness ?? {};
  const captureGate = bundle?.capture_gate ?? {};
  const liveMeetingGate = meetingGate(bundle);
  const manifest = bundle?.local_worker_manifest ?? bundle?.internal_validation_gate?.local_worker_manifest ?? {};
  return unique([
    ...(Array.isArray(liveMeetingGate?.blockers) ? liveMeetingGate.blockers : []),
    ...(Array.isArray(readiness.blockers) ? readiness.blockers : []),
    ...(Array.isArray(captureGate.blockers) ? captureGate.blockers : []),
    ...(Array.isArray(manifest.blockers) ? manifest.blockers : []),
    ...(Array.isArray(manifest.tts_blockers) ? manifest.tts_blockers : []),
    ...(Array.isArray(manifest.warnings) ? manifest.warnings : []),
    ...(Array.isArray(modelInventory?.blockers) ? modelInventory.blockers : []),
    ...(Array.isArray(modelInventory?.warnings) ? modelInventory.warnings : []),
    ...(Array.isArray(diagnostics?.blockers) ? diagnostics.blockers : []),
    helper?.last_error ?? null,
    inputStatus?.blocker ?? null,
  ]).slice(0, 8);
}

export function mapProductReadiness(input: {
  bundle: RuntimeStatusBundleReport | null;
  diagnostics: RuntimeDiagnostics | null;
  helper: HelperBridgeStatus | null;
  modelInventory: ModelInventoryReport | null;
  inputStatus: InputPreparationStatus | null;
}): ProductReadiness {
  const { bundle, diagnostics, helper, modelInventory, inputStatus } = input;
  const manifest = bundle?.local_worker_manifest ?? bundle?.internal_validation_gate?.local_worker_manifest ?? null;
  const liveMeetingGate = meetingGate(bundle);
  const helperReady = helper?.state === "ready" || Boolean(helper?.provider_ready);
  const providerReady = Boolean(helper?.provider_ready);
  const microphoneReady = Boolean(inputStatus?.ready || inputStatus?.prepared || bundle?.capture_gate?.ready_for_capture_start);
  const modelsReady = modelReady(modelInventory, bundle);
  const recording = Boolean(bundle?.live_capture?.stream_active);
  const runtimeReady = Boolean(bundle?.readiness?.ready_for_user_facing_runtime || bundle?.engine_status?.lifecycle_state === "Idle");
  const textReady = Boolean(runtimeReady || modelsReady || helperReady || manifest?.realtime_translation_model_ready || manifest?.quality_translation_model_ready);
  const canTranslateText = true;
  const voiceReady = Boolean(helperReady && providerReady && microphoneReady && modelsReady);
  const meetingRouteReady = Boolean(liveMeetingGate?.virtual_mic_route_ready);
  const meetingReady = Boolean(liveMeetingGate?.ready && meetingRouteReady);
  const canRecordVoice = voiceReady && !recording;
  const blockers = collectBlockers(bundle, helper, modelInventory, inputStatus, diagnostics);
  const hasRuntimeEvidence = Boolean(bundle || helper || modelInventory || inputStatus || diagnostics);
  const nextAction = meetingReady
    ? "Meeting Voice is ready."
    : "Retry readiness, use Fix Setup, or open Developer Diagnostics for technical details.";
  const level: ProductReadinessLevel = meetingReady ? "ready" : textReady ? "partial" : hasRuntimeEvidence ? "blocked" : "checking";
  const summary = meetingReady
    ? "Meeting Voice is ready."
    : textReady
      ? "Text translation is available. Meeting Voice still needs setup."
      : hasRuntimeEvidence
        ? "Setup is needed before Meeting Voice can be used."
        : "Product readiness is still checking.";

  return {
    level,
    textReady,
    helperReady,
    providerReady,
    microphoneReady,
    modelsReady,
    voiceReady,
    meetingRouteReady,
    meetingReady,
    canTranslateText,
    canRecordVoice,
    recording,
    nextAction,
    blockers,
    summary,
    textStatus: textReady ? "Ready" : level === "checking" ? "Checking" : "Setup Needed",
    helperStatus: helperReady ? "Helper ready" : compact(helper?.state ?? helper?.message, "Helper not ready"),
    modelStatus: modelsReady ? "Models ready" : compact(modelInventory?.status ?? manifest?.note, "Models need setup"),
    microphoneStatus: microphoneReady ? compact(inputStatus?.selected_device_name, "Microphone ready") : compact(inputStatus?.blocker ?? inputStatus?.note, "Microphone not checked"),
    voiceStatus: voiceReady ? "Local voice pipeline ready" : "Local voice setup needed",
    meetingStatus: meetingReady ? "Ready" : level === "checking" ? "Checking" : "Setup Needed",
    runtimeStatus: compact(bundle?.engine_status?.lifecycle_state ?? bundle?.engine_status?.runtime_stage ?? helper?.state, "Checking"),
  };
}

export async function loadProductRuntimeSnapshot(): Promise<ProductRuntimeSnapshot> {
  const settings = await runtimeApi.loadSettings().catch(() => defaultSettings());
  const [bundle, diagnostics, helper, modelInventory, gpuPolicy, inputStatus] = await Promise.all([
    runtimeApi.getStatusBundle().catch(() => null),
    runtimeApi.getDiagnostics().catch(() => null),
    runtimeApi.getHelperBridgeStatus().catch(() => null),
    runtimeApi.getModelInventory().catch(() => null),
    runtimeApi.getGpuPolicy().catch(() => null),
    runtimeApi.getInputStatus().catch(() => null),
  ]);
  const readiness = mapProductReadiness({ bundle, diagnostics, helper, modelInventory, inputStatus });
  return { settings, readiness, bundle, diagnostics, helper, modelInventory, gpuPolicy, inputStatus };
}

export async function runProductTranslation(source: string): Promise<ProductTranslationResult> {
  const cleaned = source.trim();
  if (!cleaned) {
    return { ok: false, source, translated: "", status: "empty", message: "Type text before translating." };
  }
  try {
    const result = await runtimeApi.translateText(cleaned);
    return {
      ok: Boolean(result?.ok),
      source: cleaned,
      translated: result?.message ?? "",
      status: result?.state ?? (result?.ok ? "translated" : "blocked"),
      message: result?.message ?? "Translation command returned no message.",
    };
  } catch (error) {
    return {
      ok: false,
      source: cleaned,
      translated: "",
      status: "frontend_bridge_error",
      message: errorMessage(error),
    };
  }
}

export async function runProductSetupAction(action: ProductSetupAction): Promise<string> {
  if (action === "start-helper") {
    const result: HelperBridgeActionResult | null = await runtimeApi.startHelperBridge().catch(() => null);
    return compact(result?.message ?? result?.state, "Helper start command finished.");
  }
  if (action === "check-worker") {
    const status = await runtimeApi.getHelperBridgeStatus().catch(() => null);
    return compact(status?.message ?? status?.state, "Worker status checked.");
  }
  if (action === "verify-models") {
    const result = await runtimeApi.verifyModels().catch(() => null);
    const blockers = Array.isArray(result?.blockers) ? result.blockers.join("; ") : "";
    return compact(result?.note ?? blockers, result?.ok ? "Models verified." : "Model verification finished with blockers.");
  }
  const status = await runtimeApi.getInputStatus().catch(() => null);
  return compact(status?.note ?? status?.blocker ?? status?.selected_device_name, "Microphone status checked.");
}

export async function runProductRecoveryAction(action: ProductRecoveryAction): Promise<string> {
  if (action !== "fix-setup") return "No product recovery action was selected.";

  const helper = await runtimeApi.startHelperBridge().catch(() => null);
  const models = await runtimeApi.verifyModels().catch(() => null);
  const input = await runtimeApi.getInputStatus().catch(() => null);
  const hasProblem = Boolean(
    (helper && !helper.ok) ||
    (Array.isArray(models?.blockers) && models.blockers.length > 0) ||
    input?.blocker,
  );

  if (hasProblem) return "Setup still needs attention. Open Developer Diagnostics for technical details.";
  return "Local setup checks completed. Retry readiness; Meeting Voice may still require meeting-route setup.";
}

export const runtimeProductFacade = {
  loadProductRuntimeSnapshot,
  mapProductReadiness,
  runProductTranslation,
  runProductSetupAction,
  runProductRecoveryAction,
};
