import {
  runtimeApi,
  type AudioDeviceProbeReport,
  type MeetingSessionActionResult,
  type MeetingSessionStatus,
} from "./runtimeApi";
import { defaultSettings, errorMessage } from "../shared/state";
import type {
  AudioDeviceListReport,
  GpuPolicyReport,
  HelperBridgeActionResult,
  HelperBridgeStatus,
  HelperBridgeWorkerResponse,
  InputPreparationStatus,
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
  asrReady: boolean;
  realtimeTranslationReady: boolean;
  qualityTranslationReady: boolean;
  ttsReady: boolean;
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

export type ProductMeetingState = {
  lifecycle: string;
  hasSession: boolean;
  applicationOwned: boolean;
  authorityActive: boolean;
  captureActive: boolean;
  live: boolean;
  paused: boolean;
  busy: boolean;
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  sessionId: string | null;
  generation: number | null;
  outboundStage: string;
  label: string;
  message: string;
  blocker: string;
};

export type ProductRuntimeSnapshot = {
  settings: RuntimeSettings;
  readiness: ProductReadiness;
  meeting: ProductMeetingState;
  meetingSession: MeetingSessionStatus | null;
  bundle: RuntimeStatusBundleReport | null;
  diagnostics: RuntimeDiagnostics | null;
  helper: HelperBridgeStatus | null;
  workerStatus: HelperBridgeWorkerResponse | null;
  modelInventory: ModelInventoryReport | null;
  gpuPolicy: GpuPolicyReport | null;
  inputStatus: InputPreparationStatus | null;
};

export type ProductMeetingAction = "start" | "pause" | "resume" | "stop";

export type ProductMeetingActionResult = {
  ok: boolean;
  action: ProductMeetingAction;
  state: string;
  message: string;
  meeting: ProductMeetingState;
};

export type ProductTranslationResult = {
  ok: boolean;
  source: string;
  translated: string;
  status: string;
  message: string;
};

export type ProductAudioDeviceKind = "microphone" | "meeting-sound";

export type ProductAudioDeviceProbe = {
  ok: boolean;
  kind: ProductAudioDeviceKind;
  deviceId: string | null;
  deviceName: string;
  message: string;
};

export type ProductAudioDeviceSelectionResult = ProductAudioDeviceProbe & {
  settings: RuntimeSettings;
};

export type ProductSetupAction = "start-helper" | "check-worker" | "verify-models" | "check-microphone";
export type ProductRecoveryAction = "fix-setup";

type WorkerCapabilitySnapshot = {
  responseAvailable: boolean;
  asrReady: boolean;
  realtimeTranslationReady: boolean;
  qualityTranslationReady: boolean;
  ttsReady: boolean;
  cudaDegraded: boolean;
  blocker: string;
  note: string;
};

type MeetingPreflightSnapshot = {
  readyForStart: boolean;
  meetingRouteReady: boolean;
  routeExecutionReady: boolean;
  outboundRuntimeConnected: boolean;
  blockers: string[];
  summary: string;
};

const APPLICATION_MEETING_OWNER_ID = "translateit_application_meeting";

function compact(value: unknown, fallback = "Unknown"): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > 180 ? `${text.slice(0, 179).trimEnd()}…` : text;
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => compact(value, "")).filter(Boolean)));
}

function parseWorkerCapabilities(workerStatus: HelperBridgeWorkerResponse | null): WorkerCapabilitySnapshot {
  if (!workerStatus?.worker_response_json) {
    return {
      responseAvailable: false,
      asrReady: false,
      realtimeTranslationReady: false,
      qualityTranslationReady: false,
      ttsReady: false,
      cudaDegraded: false,
      blocker: "",
      note: "",
    };
  }

  try {
    const payload = JSON.parse(workerStatus.worker_response_json) as Record<string, any>;
    const readiness = (payload.readiness ?? {}) as Record<string, any>;
    return {
      responseAvailable: payload.stage === "local_realtime_worker_preflight",
      asrReady: readiness.asr === true,
      realtimeTranslationReady: readiness.translation_realtime === true,
      qualityTranslationReady: readiness.translation_quality === true,
      ttsReady: readiness.tts === true,
      cudaDegraded: readiness.cuda_degraded === true,
      blocker: compact(payload.blocker, ""),
      note: compact(payload.note, ""),
    };
  } catch {
    return {
      responseAvailable: false,
      asrReady: false,
      realtimeTranslationReady: false,
      qualityTranslationReady: false,
      ttsReady: false,
      cudaDegraded: false,
      blocker: "helper_bridge:invalid_worker_status_response",
      note: "Worker capability response could not be parsed.",
    };
  }
}

function meetingPreflight(meetingSession: MeetingSessionStatus | null): MeetingPreflightSnapshot {
  const preflight = meetingSession?.preflight ?? null;
  if (!preflight) {
    return {
      readyForStart: false,
      meetingRouteReady: false,
      routeExecutionReady: false,
      outboundRuntimeConnected: false,
      blockers: [],
      summary: "Meeting preflight has not been checked yet.",
    };
  }

  return {
    readyForStart: preflight.ready_for_start === true,
    meetingRouteReady: preflight.meeting_route_ready === true,
    routeExecutionReady: preflight.route_execution_guard_ready === true,
    outboundRuntimeConnected: preflight.outbound_runtime_connected === true,
    blockers: Array.isArray(preflight.blockers) ? preflight.blockers.map(String) : [],
    summary: compact(preflight.summary, "Meeting preflight checked."),
  };
}

function liveMeetingMessage(stage: string, fallback: string): string {
  if (stage === "transcribing" || stage === "translating" || stage === "synthesizing") {
    return "Translation is live and processing finalized speech locally.";
  }
  if (stage === "delivering") {
    return "Translation is live and sending translated voice to the Meeting microphone.";
  }
  if (stage === "attention_needed") {
    return compact(fallback, "Translation is live, but the latest outbound turn needs attention.");
  }
  return "Translation is live and listening for finalized Indonesian speech.";
}

export function mapProductMeetingState(status: MeetingSessionStatus | null): ProductMeetingState {
  const preflight = meetingPreflight(status);
  const hasSession = status?.has_session === true;
  const applicationOwned = hasSession && status?.owner_id === APPLICATION_MEETING_OWNER_ID;
  const authorityActive = applicationOwned && status?.authority_active === true;
  const rawLifecycle = compact(status?.lifecycle, hasSession ? "active" : "idle");
  const lifecycle = applicationOwned ? rawLifecycle : hasSession ? "runtime_conflict" : "idle";
  const live = applicationOwned && authorityActive && lifecycle === "live";
  const paused = applicationOwned && !authorityActive && lifecycle === "paused";
  const starting = applicationOwned && authorityActive && lifecycle === "starting";
  const resuming = applicationOwned && authorityActive && lifecycle === "resuming";
  const stopping = applicationOwned && lifecycle === "stopping";
  const busy = starting || resuming || stopping;
  const canStart = !hasSession && preflight.readyForStart;
  const canPause = live;
  const canResume = paused;
  const canStop = applicationOwned && hasSession && !starting && !resuming && !stopping;
  const outboundStage = compact(status?.outbound?.stage, "idle");
  const blocker = compact(
    status?.blocker || preflight.blockers[0],
    hasSession && !applicationOwned ? "meeting_session:active_runtime_conflict" : "",
  );

  let label = "Setup Needed";
  let message = preflight.summary;
  if (live) {
    label = "Live";
    message = liveMeetingMessage(outboundStage, status?.outbound?.note ?? status?.note ?? "");
  } else if (paused) {
    label = "Paused";
    message = "Translation is paused. Outbound capture and pending translated voice are stopped; Resume will create a fresh generation for this Meeting session.";
  } else if (starting) {
    label = "Starting";
    message = "Translation is starting and opening the required Meeting resources.";
  } else if (resuming) {
    label = "Resuming";
    message = "Translation is resuming with fresh generation authority and reopening required Meeting resources.";
  } else if (stopping) {
    label = "Stopping";
    message = "Translation is stopping and revoking the current Meeting session safely.";
  } else if (hasSession && !applicationOwned) {
    label = "In Use";
    message = "Another runtime session is using Meeting resources. Finish that operation before starting Translation.";
  } else if (canStart) {
    label = "Ready";
    message = "Required outbound Meeting capabilities are ready. Start Translation when you are ready.";
  }

  return {
    lifecycle,
    hasSession,
    applicationOwned,
    authorityActive,
    captureActive: applicationOwned && status?.capture_active === true,
    live,
    paused,
    busy,
    canStart,
    canPause,
    canResume,
    canStop,
    sessionId: applicationOwned ? status?.session_id ?? null : null,
    generation: applicationOwned ? status?.generation ?? null : null,
    outboundStage,
    label,
    message,
    blocker,
  };
}

function collectBlockers(input: {
  helper: HelperBridgeStatus | null;
  worker: WorkerCapabilitySnapshot;
  modelInventory: ModelInventoryReport | null;
  inputStatus: InputPreparationStatus | null;
  meeting: MeetingPreflightSnapshot;
  textReady: boolean;
  meetingReady: boolean;
}): string[] {
  const { helper, worker, modelInventory, inputStatus, meeting, textReady, meetingReady } = input;
  return unique([
    ...(!meetingReady ? meeting.blockers : []),
    ...(!textReady && worker.blocker ? [worker.blocker] : []),
    ...(Array.isArray(modelInventory?.blockers) ? modelInventory.blockers : []),
    helper?.state !== "ready" ? helper?.last_error ?? null : null,
    inputStatus?.blocker ?? null,
  ]).slice(0, 8);
}

export function mapProductReadiness(input: {
  settings?: RuntimeSettings | null;
  bundle: RuntimeStatusBundleReport | null;
  diagnostics?: RuntimeDiagnostics | null;
  helper: HelperBridgeStatus | null;
  workerStatus?: HelperBridgeWorkerResponse | null;
  modelInventory: ModelInventoryReport | null;
  inputStatus: InputPreparationStatus | null;
  meetingSession?: MeetingSessionStatus | null;
}): ProductReadiness {
  const { bundle, helper, modelInventory, inputStatus } = input;
  const worker = parseWorkerCapabilities(input.workerStatus ?? null);
  const meeting = meetingPreflight(input.meetingSession ?? null);
  const productMeeting = mapProductMeetingState(input.meetingSession ?? null);

  const helperReady = helper?.state === "ready";
  const microphoneReady = Boolean(inputStatus?.ready || inputStatus?.prepared);
  // Installation evidence only. It is deliberately not used as inference readiness.
  const modelsReady = Boolean(modelInventory?.ok);
  const asrReady = helperReady && worker.asrReady;
  const realtimeTranslationReady = helperReady && worker.realtimeTranslationReady;
  const qualityTranslationReady = helperReady && worker.qualityTranslationReady;
  const ttsReady = helperReady && worker.ttsReady;
  const providerReady = asrReady && realtimeTranslationReady && ttsReady;

  // Standalone Text owns Quality. Meeting owns Realtime independently.
  const currentTextMode = "Quality";
  const textReady = qualityTranslationReady;
  const canTranslateText = textReady;

  const voiceReady = microphoneReady && providerReady;
  const meetingRouteReady = meeting.meetingRouteReady && meeting.routeExecutionReady;
  const meetingReady = meeting.readyForStart || productMeeting.live || productMeeting.paused;
  const recording = productMeeting.captureActive;
  const canRecordVoice = voiceReady && !recording && !productMeeting.hasSession;
  const blockers = collectBlockers({
    helper,
    worker,
    modelInventory,
    inputStatus,
    meeting,
    textReady,
    meetingReady,
  });

  const hasRuntimeEvidence = Boolean(
    helper || worker.responseAvailable || modelInventory || inputStatus || bundle || input.meetingSession,
  );
  const level: ProductReadinessLevel = meetingReady
    ? "ready"
    : textReady
      ? "partial"
      : hasRuntimeEvidence
        ? "blocked"
        : "checking";
  const nextAction = productMeeting.live
    ? "Translation is live. Pause it temporarily or stop the Meeting session when needed."
    : productMeeting.paused
      ? "Translation is paused. Resume when ready or stop the Meeting session."
      : meeting.readyForStart
        ? "Meeting Translation is ready to start."
        : textReady
          ? "Text translation is available. Meeting setup/runtime still needs attention."
          : "Check the local translation runtime or use Fix Setup; technical detail remains in Diagnostics.";
  const summary = productMeeting.live
    ? "Meeting Translation is live."
    : productMeeting.paused
      ? "Meeting Translation is paused."
      : meeting.readyForStart
        ? "Required outbound Meeting capabilities are ready."
        : textReady
          ? `Text ${currentTextMode} translation is available. Meeting Translation is not ready yet.`
          : hasRuntimeEvidence
            ? `Text ${currentTextMode} translation is unavailable and Meeting Translation is not ready.`
            : "Product readiness is still checking.";

  return {
    level,
    textReady,
    helperReady,
    providerReady,
    microphoneReady,
    modelsReady,
    asrReady,
    realtimeTranslationReady,
    qualityTranslationReady,
    ttsReady,
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
    helperStatus: helperReady
      ? worker.responseAvailable
        ? "Local worker running"
        : "Worker running; capability check unavailable"
      : compact(helper?.state ?? helper?.message, "Local worker not running"),
    modelStatus: modelsReady
      ? "Required model assets installed"
      : compact(modelInventory?.note ?? modelInventory?.status, "Required model assets need setup"),
    microphoneStatus: microphoneReady
      ? compact(inputStatus?.selected_device_name, "Microphone ready")
      : compact(inputStatus?.blocker ?? inputStatus?.note, "Microphone not checked"),
    voiceStatus: voiceReady ? "Required local outbound AI capabilities available" : "Local voice runtime needs setup",
    meetingStatus: productMeeting.live
      ? "Live"
      : productMeeting.paused
        ? "Paused"
        : productMeeting.busy
          ? productMeeting.label
          : meeting.readyForStart
            ? "Ready"
            : level === "checking"
              ? "Checking"
              : "Setup Needed",
    runtimeStatus: productMeeting.lifecycle !== "idle"
      ? productMeeting.lifecycle
      : compact(helper?.state, "Checking"),
  };
}

export async function loadProductRuntimeSnapshot(): Promise<ProductRuntimeSnapshot> {
  const settings = await runtimeApi.loadSettings().catch(() => defaultSettings());
  // RuntimeStatusBundle remains available for Diagnostics. Normal Meeting lifecycle
  // uses the canonical Meeting session command directly instead of a duplicate frontend state.
  const [bundle, meetingSession, diagnostics, helper, modelInventory, gpuPolicy, inputStatus] = await Promise.all([
    runtimeApi.getStatusBundle().catch(() => null),
    runtimeApi.getMeetingSessionStatus().catch(() => null),
    runtimeApi.getDiagnostics().catch(() => null),
    runtimeApi.getHelperBridgeStatus().catch(() => null),
    runtimeApi.getModelInventory().catch(() => null),
    runtimeApi.getGpuPolicy().catch(() => null),
    runtimeApi.getInputStatus().catch(() => null),
  ]);
  const workerStatus = helper?.state === "ready"
    ? await runtimeApi.helperBridgeWorkerStatus().catch(() => null)
    : null;
  const meeting = mapProductMeetingState(meetingSession);
  const readiness = mapProductReadiness({
    settings,
    bundle,
    diagnostics,
    helper,
    workerStatus,
    modelInventory,
    inputStatus,
    meetingSession,
  });
  return {
    settings,
    readiness,
    meeting,
    meetingSession,
    bundle,
    diagnostics,
    helper,
    workerStatus,
    modelInventory,
    gpuPolicy,
    inputStatus,
  };
}

export async function runProductMeetingAction(action: ProductMeetingAction): Promise<ProductMeetingActionResult> {
  let result: MeetingSessionActionResult;
  if (action === "start") {
    result = await runtimeApi.startMeetingTranslation();
  } else if (action === "pause") {
    result = await runtimeApi.pauseMeetingTranslation();
  } else if (action === "resume") {
    result = await runtimeApi.resumeMeetingTranslation();
  } else {
    result = await runtimeApi.stopMeetingTranslation();
  }
  const fallbackMessage = action === "start"
    ? "Start Translation finished."
    : action === "pause"
      ? "Pause Translation finished."
      : action === "resume"
        ? "Resume Translation finished."
        : "Stop Translation finished.";
  return {
    ok: Boolean(result.ok),
    action,
    state: compact(result.state, result.ok ? "completed" : "blocked"),
    message: compact(result.message, fallbackMessage),
    meeting: mapProductMeetingState(result.status ?? null),
  };
}

export async function loadProductAudioDevices(): Promise<AudioDeviceListReport> {
  return runtimeApi.listAudioDevices();
}

export async function probeProductAudioDevice(
  kind: ProductAudioDeviceKind,
  deviceId: string | null,
): Promise<ProductAudioDeviceProbe> {
  const normalizedDeviceId = String(deviceId ?? "").trim() || null;
  if (kind === "microphone") {
    const status = await runtimeApi.probeInputDeviceCandidate(normalizedDeviceId);
    const ok = Boolean(status.ready || status.prepared);
    return {
      ok,
      kind,
      deviceId: normalizedDeviceId,
      deviceName: compact(status.selected_device_name ?? normalizedDeviceId, normalizedDeviceId ? "Selected microphone" : "Windows Default"),
      message: compact(status.note ?? status.blocker, ok ? "Microphone is available." : "Microphone is not available."),
    };
  }

  const status: AudioDeviceProbeReport = await runtimeApi.probeOutputDeviceCandidate(normalizedDeviceId);
  return {
    ok: Boolean(status.ok),
    kind,
    deviceId: normalizedDeviceId,
    deviceName: compact(status.resolved_device_name ?? normalizedDeviceId, normalizedDeviceId ? "Selected Meeting sound" : "Windows Default"),
    message: compact(status.note ?? status.blocker, status.ok ? "Meeting sound device is available." : "Meeting sound device is not available."),
  };
}

export async function selectProductAudioDevice(
  kind: ProductAudioDeviceKind,
  deviceId: string | null,
): Promise<ProductAudioDeviceSelectionResult> {
  const currentSettings = await runtimeApi.loadSettings().catch(() => defaultSettings());
  const probe = await probeProductAudioDevice(kind, deviceId);
  if (!probe.ok) {
    return {
      ...probe,
      settings: currentSettings,
      message: `${probe.message} The previous device preference was kept.`,
    };
  }

  const candidateSettings: RuntimeSettings = {
    ...currentSettings,
    audio: { ...currentSettings.audio },
  };
  if (kind === "microphone") {
    candidateSettings.audio.input_device_id = probe.deviceId;
  } else {
    candidateSettings.audio.output_device_id = probe.deviceId;
  }

  const saveResult = await runtimeApi.saveSettings(candidateSettings);
  if (!saveResult.ok) {
    return {
      ...probe,
      ok: false,
      settings: currentSettings,
      message: `${compact(saveResult.message, "The device preference could not be saved.")} The previous device preference was kept.`,
    };
  }

  const savedSettings = await runtimeApi.loadSettings().catch(() => candidateSettings);
  const label = kind === "microphone" ? "Microphone" : "Meeting sound";
  return {
    ...probe,
    ok: true,
    settings: savedSettings,
    message: `${label} set to ${probe.deviceId ? probe.deviceName : "Windows Default"}.`,
  };
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
    const status = await runtimeApi.helperBridgeWorkerStatus().catch(() => null);
    if (status?.worker_response_json) {
      const capability = parseWorkerCapabilities(status);
      return capability.responseAvailable
        ? compact(capability.note || capability.blocker, "Worker capability status checked.")
        : compact(status.message ?? status.state, "Worker status checked.");
    }
    return compact(status?.message ?? status?.state, "Worker status checked.");
  }
  if (action === "verify-models") {
    const result = await runtimeApi.verifyModels().catch(() => null);
    const blockers = Array.isArray(result?.blockers) ? result.blockers.join("; ") : "";
    return compact(
      result?.note ?? blockers,
      result?.ok ? "Required model assets are installed." : "Model inventory inspection finished with blockers.",
    );
  }
  const status = await runtimeApi.getInputStatus().catch(() => null);
  return compact(status?.note ?? status?.blocker ?? status?.selected_device_name, "Microphone status checked.");
}

export async function runProductRecoveryAction(action: ProductRecoveryAction): Promise<string> {
  if (action !== "fix-setup") return "No product recovery action was selected.";

  const helper = await runtimeApi.startHelperBridge().catch(() => null);
  const models = await runtimeApi.verifyModels().catch(() => null);
  const input = await runtimeApi.getInputStatus().catch(() => null);
  const workerStatus = helper?.ok ? await runtimeApi.helperBridgeWorkerStatus().catch(() => null) : null;
  const worker = parseWorkerCapabilities(workerStatus);
  const hasProblem = Boolean(
    (helper && !helper.ok) ||
    (Array.isArray(models?.blockers) && models.blockers.length > 0) ||
    input?.blocker ||
    (worker.responseAvailable && !worker.realtimeTranslationReady),
  );

  if (hasProblem) return "Setup still needs attention. Open Developer Diagnostics for technical details.";
  return "Local setup checks completed. Retry readiness; Meeting may still require Meeting Microphone or outbound-runtime setup.";
}

export const runtimeProductFacade = {
  loadProductRuntimeSnapshot,
  loadProductAudioDevices,
  probeProductAudioDevice,
  selectProductAudioDevice,
  mapProductMeetingState,
  mapProductReadiness,
  runProductMeetingAction,
  runProductTranslation,
  runProductSetupAction,
  runProductRecoveryAction,
};
