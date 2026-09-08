import {
  runtimeApi,
  type AudioDeviceProbeReport,
  type MeetingSessionActionResult,
  type MeetingSessionStatus,
} from "./runtimeApi";
import { defaultSettings, compact, errorMessage } from "../shared/state";
import { APPLICATION_MEETING_OWNER_ID } from "../shared/types";
import type {
  AudioDeviceListReport,
  HelperBridgeStatus,
  HelperBridgeWorkerResponse,
  InputPreparationStatus,
  RuntimeSettings,
} from "../shared/types";
import { myVoiceBuildApi } from "./myVoiceBuildApi";

export type ProductReadinessLevel = "ready" | "partial" | "blocked" | "checking" | "unavailable";

export type ProductReadiness = {
  level: ProductReadinessLevel;
  textReady: boolean;
  helperReady: boolean;
  providerReady: boolean;
  microphoneReady: boolean;
  modelsReady: boolean;
  functionalOutboundReady: boolean;
  asrReady: boolean;
  translationIdEnReady: boolean;
  translationEnIdReady: boolean;
  ttsReady: boolean;
  voiceReady: boolean;
  meetingRouteReady: boolean;
  meetingReady: boolean;
  approvedVoiceReady: boolean | null;
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
  busy: boolean;
  canStart: boolean;
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
  helper: HelperBridgeStatus | null;
  workerStatus: HelperBridgeWorkerResponse | null;
  inputStatus: InputPreparationStatus | null;
};

export type ProductMeetingAction = "start" | "stop";

export type ProductMeetingActionResult = {
  ok: boolean;
  action: ProductMeetingAction;
  state: string;
  message: string;
  meeting: ProductMeetingState;
  status: MeetingSessionStatus;
};

export type ProductTranslationResult = {
  ok: boolean;
  source: string;
  translated: string;
  status: string;
  message: string;
  blocker: string;
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

export type ProductSetupAction = "check-readiness" | "verify-models";
export type ProductRecoveryAction = "fix-setup";

export type WorkerCapabilitySnapshot = {
  responseAvailable: boolean;
  asrReady: boolean;
  translationIdEnReady: boolean;
  translationEnIdReady: boolean;
  ttsReady: boolean;
  blocker: string;
  note: string;
  asrDisplay: string;
  translationDisplay: string;
  voiceDisplay: string;
  executionDisplay: string;
};

type MeetingPreflightSnapshot = {
  readyForStart: boolean;
  startEligible: boolean;
  functionalOutboundReady: boolean;
  microphoneReady: boolean;
  modelsReady: boolean;
  helperReady: boolean;
  providerReady: boolean;
  meetingRouteReady: boolean;
  blockers: string[];
  summary: string;
};

type TranslationDirection = "id->en" | "en->id" | "unsupported";

const FRONTEND_BRIDGE_UNAVAILABLE = "frontend_bridge_unavailable";

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => compact(value, "")).filter(Boolean)));
}

function normalizeProductLanguage(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase().replace("_latn", "");
  if (text === "id" || text.startsWith("ind")) return "id";
  if (text === "en" || text.startsWith("eng")) return "en";
  return text;
}

function selectedTextDirection(settings: RuntimeSettings): TranslationDirection {
  const source = normalizeProductLanguage(settings.source_language);
  const target = normalizeProductLanguage(settings.target_language);
  if (source === "id" && target === "en") return "id->en";
  if (source === "en" && target === "id") return "en->id";
  return "unsupported";
}

function directionLabel(direction: TranslationDirection): string {
  if (direction === "id->en") return "Indonesian → English";
  if (direction === "en->id") return "English → Indonesian";
  return "Selected";
}

function helperBridgeUnavailable(helper: HelperBridgeStatus | null): boolean {
  return helper?.runtime_claim === FRONTEND_BRIDGE_UNAVAILABLE || helper?.state === "frontend_bridge_error";
}

export function meetingBridgeUnavailable(status: MeetingSessionStatus | null): boolean {
  return status?.runtime_claim === FRONTEND_BRIDGE_UNAVAILABLE || status?.lifecycle === "unavailable";
}

function inputBridgeUnavailable(status: InputPreparationStatus | null): boolean {
  return status?.blocker === FRONTEND_BRIDGE_UNAVAILABLE;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function parseWorkerCapabilities(workerStatus: HelperBridgeWorkerResponse | null): WorkerCapabilitySnapshot {
  if (!workerStatus?.worker_response_json) {
    return {
      responseAvailable: false,
      asrReady: false,
      translationIdEnReady: false,
      translationEnIdReady: false,
      ttsReady: false,
      blocker: "",
      note: "",
      asrDisplay: "Not checked",
      translationDisplay: "Not checked",
      voiceDisplay: "Not checked",
      executionDisplay: "Not verified",
    };
  }

  try {
    const payload = jsonRecord(JSON.parse(workerStatus.worker_response_json) as unknown);
    const readiness = jsonRecord(payload["readiness"]);
    const loaded = jsonRecord(payload["loaded"]);
    const gpu = jsonRecord(payload["gpu"]);
    const asrSelected = String(payload["selected_device"] ?? gpu["selected_device"] ?? "not verified");
    const translationSelected = String(
      payload["selected_translation_device"] ?? gpu["selected_translation_device"] ?? "not verified",
    );
    const rawDirections = loaded["translation_directions"];
    const directions = Array.isArray(rawDirections)
      ? rawDirections.map((value: unknown) => String(value)).filter(Boolean)
      : [];
    return {
      responseAvailable: payload["stage"] === "local_realtime_worker_preflight",
      asrReady: readiness["asr"] === true,
      translationIdEnReady: readiness["translation_id_en"] === true,
      translationEnIdReady: readiness["translation_en_id"] === true,
      ttsReady: readiness["voice_actor_tts"] === true,
      blocker: compact(payload["blocker"], ""),
      note: compact(payload["note"], ""),
      asrDisplay: loaded["asr"] === true
        ? `${String(loaded["asr_model_id"] ?? "ASR")} · ${String(loaded["asr_device"] ?? "unknown")} / ${String(loaded["asr_compute_type"] ?? "unknown")}`
        : `Not loaded · selected ${asrSelected}`,
      translationDisplay: directions.length > 0
        ? `${directions.join(", ")} · ${translationSelected}`
        : `Not loaded · selected ${translationSelected}`,
      voiceDisplay: loaded["voice_actor"] === true
        ? `Loaded · ${String(loaded["voice_actor_device"] ?? "unknown")}`
        : "Not loaded",
      executionDisplay: `ASR ${asrSelected} · Translation ${translationSelected}`,
    };
  } catch {
    return {
      responseAvailable: false,
      asrReady: false,
      translationIdEnReady: false,
      translationEnIdReady: false,
      ttsReady: false,
      blocker: "helper_bridge:invalid_worker_status_response",
      note: "Worker capability response could not be parsed.",
      asrDisplay: "Not checked",
      translationDisplay: "Not checked",
      voiceDisplay: "Not checked",
      executionDisplay: "Worker status could not be parsed",
    };
  }
}

function meetingPreflight(meetingSession: MeetingSessionStatus | null): MeetingPreflightSnapshot {
  const preflight = meetingSession?.preflight ?? null;
  if (!preflight) {
    return {
      readyForStart: false,
      startEligible: false,
      functionalOutboundReady: false,
      microphoneReady: false,
      modelsReady: false,
      helperReady: false,
      providerReady: false,
      meetingRouteReady: false,
      blockers: [],
      summary: "Meeting preflight has not been checked yet.",
    };
  }

  return {
    readyForStart: preflight.ready_for_start === true,
    startEligible: preflight.start_eligible === true,
    functionalOutboundReady: preflight.functional_outbound_ready === true,
    microphoneReady: preflight.microphone_ready === true,
    modelsReady: preflight.models_ready === true,
    helperReady: preflight.helper_ready === true,
    providerReady: preflight.provider_ready === true,
    meetingRouteReady: preflight.meeting_route_ready === true,
    blockers: Array.isArray(preflight.blockers) ? preflight.blockers.map(String) : [],
    summary: compact(preflight.summary, "Meeting preflight checked."),
  };
}

function liveMeetingMessage(stage: string): string {
  if (stage === "transcribing" || stage === "translating" || stage === "synthesizing") {
    return "Translation is live and preparing the English voice for your meeting.";
  }
  if (stage === "delivering") {
    return "Translation is live and speaking English to your meeting.";
  }
  if (stage === "attention_needed") {
    return "Translation is live, but the latest phrase needs attention. Check Diagnostics if this continues.";
  }
  return "Translation is live and listening for your next phrase.";
}

export function mapProductMeetingState(status: MeetingSessionStatus | null): ProductMeetingState {
  const preflight = meetingPreflight(status);
  const unavailable = meetingBridgeUnavailable(status);
  const hasSession = status?.has_session === true;
  const applicationOwned = hasSession && status?.owner_id === APPLICATION_MEETING_OWNER_ID;
  const authorityActive = applicationOwned && status?.authority_active === true;
  const rawLifecycle = unavailable ? "unavailable" : compact(status?.lifecycle, hasSession ? "active" : "idle");
  const lifecycle = unavailable ? "unavailable" : applicationOwned ? rawLifecycle : hasSession ? "runtime_conflict" : "idle";
  const live = applicationOwned && authorityActive && lifecycle === "live";
  const starting = applicationOwned && authorityActive && lifecycle === "starting";
  const stopping = applicationOwned && lifecycle === "stopping";
  const busy = starting || stopping;
  const canStart = !unavailable && !hasSession && preflight.startEligible;
  const canStop = !unavailable && applicationOwned && hasSession && !starting && !stopping;
  const outboundStage = compact(status?.outbound?.stage, unavailable ? "unavailable" : "idle");
  const blocker = compact(
    status?.blocker || preflight.blockers[0],
    unavailable
      ? FRONTEND_BRIDGE_UNAVAILABLE
      : hasSession && !applicationOwned
        ? "meeting_session:active_runtime_conflict"
        : "",
  );

  let label = "Setup Needed";
  let message = "Meeting setup needs attention.";
  if (unavailable) {
    label = "Unavailable";
    message = "Meeting status is unavailable. Try the check again when TranslateIT is available.";
  } else if (live) {
    label = "Live";
    message = liveMeetingMessage(outboundStage);
  } else if (starting) {
    label = "Starting";
    message = "Translation is starting.";
  } else if (stopping) {
    label = "Stopping";
    message = "Translation is stopping safely.";
  } else if (applicationOwned && lifecycle === "cleanup_incomplete") {
    label = "Stop Needed";
    message = "Translation output is stopped, but cleanup still needs attention. Try Stop again.";
  } else if (hasSession && !applicationOwned) {
    label = "In Use";
    message = "Meeting audio is already in use. Finish that operation before starting Translation.";
  } else if (applicationOwned && hasSession) {
    label = "Active";
    message = "Meeting translation is still active. Stop it before starting a new session.";
  } else if (canStart) {
    label = "Ready";
    message = "Ready to translate. Start when your meeting is open.";
  }

  return {
    lifecycle,
    hasSession,
    applicationOwned,
    authorityActive,
    captureActive: applicationOwned && status?.capture_active === true,
    live,
    busy,
    canStart,
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
  inputStatus: InputPreparationStatus | null;
  meeting: MeetingPreflightSnapshot;
  textReady: boolean;
  textDirection: TranslationDirection;
  meetingReady: boolean;
}): string[] {
  const { helper, worker, inputStatus, meeting, textReady, textDirection, meetingReady } = input;
  return unique([
    ...(!meetingReady ? meeting.blockers : []),
    ...(!textReady && worker.blocker ? [worker.blocker] : []),
    ...(!textReady && textDirection !== "unsupported" ? ["text_translation:selected_direction_not_ready"] : []),
    ...(textDirection === "unsupported" ? ["text_translation:unsupported_direction"] : []),
    helper?.state !== "ready" ? helper?.last_error ?? null : null,
    inputStatus?.blocker ?? null,
  ]).slice(0, 8);
}

export function mapProductReadiness(input: {
  settings?: RuntimeSettings | null;
  helper: HelperBridgeStatus | null;
  workerStatus?: HelperBridgeWorkerResponse | null;
  inputStatus: InputPreparationStatus | null;
  meetingSession?: MeetingSessionStatus | null;
  approvedVoiceReady?: boolean | null;
}): ProductReadiness {
  const helper = input.helper;
  const inputStatus = input.inputStatus;
  const settings = input.settings ?? defaultSettings();
  const worker = parseWorkerCapabilities(input.workerStatus ?? null);
  const meeting = meetingPreflight(input.meetingSession ?? null);
  const productMeeting = mapProductMeetingState(input.meetingSession ?? null);

  const helperUnavailable = helperBridgeUnavailable(helper);
  const meetingUnavailable = meetingBridgeUnavailable(input.meetingSession ?? null);
  const inputUnavailable = inputBridgeUnavailable(inputStatus);
  const runtimeUnavailable = helperUnavailable && meetingUnavailable && inputUnavailable;

  const workerHelperReady = helper?.state === "ready";
  const helperReady = meeting.helperReady;
  const microphoneReady = meeting.microphoneReady;
  const asrReady = workerHelperReady && worker.asrReady;
  const translationIdEnReady = workerHelperReady && worker.translationIdEnReady;
  const translationEnIdReady = workerHelperReady && worker.translationEnIdReady;
  const ttsReady = workerHelperReady && worker.ttsReady;
  const providerReady = meeting.providerReady;
  const modelsReady = meeting.modelsReady;
  const functionalOutboundReady = meeting.functionalOutboundReady;

  const textDirection = selectedTextDirection(settings);
  const textReady = textDirection === "id->en"
    ? translationIdEnReady
    : textDirection === "en->id"
      ? translationEnIdReady
      : false;
  const canTranslateText = textReady;

  const voiceReady = microphoneReady && providerReady;
  const meetingRouteReady = meeting.meetingRouteReady;
  const approvedVoiceReady = typeof input.approvedVoiceReady === "boolean" ? input.approvedVoiceReady : null;
  const approvedVoiceConfirmed = approvedVoiceReady === true;
  const meetingReady = productMeeting.live || (meeting.readyForStart && approvedVoiceConfirmed);
  const recording = productMeeting.captureActive;
  const canRecordVoice = voiceReady && !recording && !productMeeting.hasSession;
  const blockers = collectBlockers({
    helper,
    worker,
    inputStatus,
    meeting,
    textReady,
    textDirection,
    meetingReady,
  });

  const hasRuntimeEvidence = Boolean(helper || worker.responseAvailable || inputStatus || input.meetingSession);
  const level: ProductReadinessLevel = runtimeUnavailable
    ? "unavailable"
    : meetingReady
      ? "ready"
      : textReady
        ? "partial"
        : hasRuntimeEvidence
          ? "blocked"
          : "checking";
  const textDirectionLabel = directionLabel(textDirection);
  const nextAction = runtimeUnavailable
    ? "TranslateIT is unavailable right now. Try the status check again before using translation."
    : productMeeting.live
      ? "Translation is live. Stop the Meeting session when you are finished."
      : meeting.readyForStart && approvedVoiceReady === null
        ? "Checking the selected Meeting voice before starting."
        : meeting.readyForStart && !approvedVoiceConfirmed
          ? "Choose a Meeting voice before starting Meeting translation."
          : meeting.readyForStart
            ? "Meeting Translation is ready to start."
            : productMeeting.canStart
              ? "Start Translation will run a quick final translation check before going live."
              : textReady
                ? "Text translation is available. Meeting setup still needs attention."
                : textDirection === "unsupported"
                  ? "Choose Indonesian → English or English → Indonesian for Text translation."
                  : "The selected Text translation direction is not ready. Check Setup or Diagnostics if needed.";
  const summary = runtimeUnavailable
    ? "TranslateIT is unavailable right now. Try the status check again."
    : productMeeting.live
      ? "Meeting Translation is live."
      : meeting.readyForStart && approvedVoiceReady === null
        ? "Meeting Translation is checking the selected Meeting voice."
        : meeting.readyForStart && !approvedVoiceConfirmed
          ? "Choose a Meeting voice before starting Meeting Translation."
          : meeting.readyForStart
            ? "Meeting Translation is ready."
            : productMeeting.canStart
              ? "Meeting setup is available; the final local translation check has not passed for this helper session yet."
              : textReady
                ? `${textDirectionLabel} Text translation is available. Meeting Translation is not ready yet.`
                : hasRuntimeEvidence
                  ? `${textDirectionLabel} Text translation is not ready. Meeting Translation is not ready yet.`
                  : "Product readiness is still checking.";

  return {
    level,
    textReady,
    helperReady,
    providerReady,
    microphoneReady,
    modelsReady,
    functionalOutboundReady,
    asrReady,
    translationIdEnReady,
    translationEnIdReady,
    ttsReady,
    voiceReady,
    meetingRouteReady,
    meetingReady,
    approvedVoiceReady,
    canTranslateText,
    canRecordVoice,
    recording,
    nextAction,
    blockers,
    summary,
    textStatus: helperUnavailable
      ? "Unavailable"
      : textReady
        ? "Ready"
        : level === "checking"
          ? "Checking"
          : "Setup Needed",
    helperStatus: helperUnavailable
      ? "Unavailable"
      : helperReady
        ? worker.responseAvailable
          ? "Local worker running"
          : "Worker running; capability check unavailable"
        : compact(helper?.state ?? helper?.message, "Local worker not running"),
    modelStatus: helperUnavailable
      ? "Unavailable"
      : modelsReady && functionalOutboundReady
        ? "Required outbound translation check passed"
        : modelsReady
          ? "Final local translation check pending"
          : worker.responseAvailable
            ? "Required outbound model runtime needs setup"
            : "Worker capability not checked",
    microphoneStatus: inputUnavailable && meetingUnavailable
      ? "Unavailable"
      : microphoneReady
        ? compact(inputStatus?.selected_device_name, "Microphone ready")
        : "Setup Needed",
    voiceStatus: runtimeUnavailable
      ? "Unavailable"
      : voiceReady
        ? "Required local outbound AI capabilities available"
        : "Local voice runtime needs setup",
    meetingStatus: productMeeting.label === "Unavailable"
      ? "Unavailable"
      : productMeeting.live
        ? "Live"
        : productMeeting.busy
          ? productMeeting.label
          : meeting.readyForStart && approvedVoiceConfirmed
            ? "Ready"
            : meeting.readyForStart && approvedVoiceReady === null
              ? "Checking"
              : level === "checking"
                ? "Checking"
                : "Setup Needed",
    runtimeStatus: runtimeUnavailable
      ? "Unavailable"
      : productMeeting.lifecycle !== "idle"
        ? productMeeting.lifecycle
        : compact(helper?.state, "Checking"),
  };
}

function helperNeedsLazyStart(helper: HelperBridgeStatus): boolean {
  return helper.state === "not_started" || helper.state === "stopped";
}

async function ensurePostSetupHelperLifecycle(settings: RuntimeSettings): Promise<HelperBridgeStatus> {
  const helper = await runtimeApi.getHelperBridgeStatus();
  if (
    settings.meeting_setup_state === "new" ||
    helperBridgeUnavailable(helper) ||
    !helperNeedsLazyStart(helper)
  ) {
    return helper;
  }

  // Normal post-setup product use should not require a manual Check Setup after
  // every app restart. Reuse the guarded public helper owner, but only for known
  // inactive lifecycle states; do not turn arbitrary helper errors into blind retry.
  await runtimeApi.startHelperBridge();
  return runtimeApi.getHelperBridgeStatus();
}

async function loadApprovedVoiceReady(): Promise<boolean | null> {
  try {
    const build = await myVoiceBuildApi.getStatus();
    if (build.phase === "unavailable") return null;
    return build.approved_voice_ready;
  } catch {
    return null;
  }
}

export async function loadProductRuntimeSnapshot(knownSettings?: RuntimeSettings): Promise<ProductRuntimeSnapshot> {
  const settings = knownSettings ?? await runtimeApi.loadSettings();
  if (!settings) throw new Error("TranslateIT settings are unavailable.");

  // App.svelte intentionally does not enter this normal snapshot while fresh setup
  // remains `new`. The explicit guard above preserves that Python-free First Setup
  // boundary even if this facade is called directly with fresh settings later.
  const helper = await ensurePostSetupHelperLifecycle(settings);
  const [meetingSession, inputStatus, approvedVoiceReady] = await Promise.all([
    runtimeApi.getMeetingSessionStatus(),
    runtimeApi.getInputStatus(),
    loadApprovedVoiceReady(),
  ]);
  const workerStatus = helper.state === "ready"
    ? await runtimeApi.helperBridgeWorkerStatus()
    : null;
  const meeting = mapProductMeetingState(meetingSession);
  const readiness = mapProductReadiness({
    settings,
    helper,
    workerStatus,
    inputStatus,
    meetingSession,
    approvedVoiceReady,
  });
  return { settings, readiness, meeting, meetingSession, helper, workerStatus, inputStatus };
}

export async function runProductMeetingAction(action: ProductMeetingAction): Promise<ProductMeetingActionResult> {
  const result: MeetingSessionActionResult = action === "start"
    ? await runtimeApi.startMeetingTranslation()
    : await runtimeApi.stopMeetingTranslation();
  const fallbackMessage = action === "start" ? "Start Translation finished." : "Stop Translation finished.";
  return {
    ok: Boolean(result.ok),
    action,
    state: compact(result.state, result.ok ? "completed" : "blocked"),
    message: compact(result.message, fallbackMessage),
    meeting: mapProductMeetingState(result.status),
    status: result.status,
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
    const ok = status.functional_verified === true;
    return {
      ok,
      kind,
      deviceId: normalizedDeviceId,
      deviceName: compact(status.selected_device_name ?? normalizedDeviceId, normalizedDeviceId ? "Selected microphone" : "Windows Default"),
      message: ok ? "Microphone is available." : "This microphone can't be used right now. Choose another microphone or Windows Default.",
    };
  }

  const status: AudioDeviceProbeReport = await runtimeApi.probeOutputDeviceCandidate(normalizedDeviceId);
  return {
    ok: Boolean(status.ok),
    kind,
    deviceId: normalizedDeviceId,
    deviceName: compact(status.resolved_device_name ?? normalizedDeviceId, normalizedDeviceId ? "Selected Meeting sound" : "Windows Default"),
    message: status.ok ? "Meeting sound is available." : "This meeting sound device can't be used right now. Choose another device or Windows Default.",
  };
}

export async function selectProductAudioDevice(
  kind: ProductAudioDeviceKind,
  deviceId: string | null,
  currentSettings: RuntimeSettings,
): Promise<ProductAudioDeviceSelectionResult> {
  const normalizedDeviceId = String(deviceId ?? "").trim() || null;
  const result = await runtimeApi.selectAudioDevice(kind, normalizedDeviceId);
  if (!result) {
    return {
      ok: false,
      kind,
      deviceId: normalizedDeviceId,
      deviceName: normalizedDeviceId ?? "Windows Default",
      message: "Audio settings are unavailable right now. The previous device preference was kept.",
      settings: currentSettings,
    };
  }

  return {
    ok: result.ok,
    kind,
    deviceId: result.device_id,
    deviceName: compact(result.device_name, result.device_id ?? "Windows Default"),
    message: compact(result.message, result.ok ? "Audio device saved." : "Audio device was not changed."),
    settings: result.settings,
  };
}

export async function runProductTranslation(source: string): Promise<ProductTranslationResult> {
  const cleaned = source.trim();
  if (!cleaned) {
    return {
      ok: false,
      source,
      translated: "",
      status: "empty",
      message: "Type or paste something to translate.",
      blocker: "text_translation:empty_input",
    };
  }
  try {
    const result = await runtimeApi.translateText(cleaned);
    return {
      ok: Boolean(result.ok),
      source: cleaned,
      translated: result.translated_text,
      status: result.state,
      message: result.user_message,
      blocker: result.blocker,
    };
  } catch (error) {
    return {
      ok: false,
      source: cleaned,
      translated: "",
      status: "frontend_bridge_error",
      message: "Translation is unavailable right now. Try again or check Diagnostics.",
      blocker: errorMessage(error),
    };
  }
}

export async function runProductSetupAction(action: ProductSetupAction): Promise<string> {
  if (action === "check-readiness") {
    const result = await runtimeApi.verifyRequiredOutboundAiReadiness().catch(() => null);
    return result?.ok
      ? "The final local translation check passed."
      : "The final local translation check still needs attention. Open Diagnostics if this continues.";
  }

  const result = await runtimeApi.verifyModels().catch(() => null);
  const blockers = Array.isArray(result?.blockers) ? result.blockers.join("; ") : "";
  return compact(
    result?.note ?? blockers,
    result?.ok ? "Full product release asset inventory is complete." : "Release asset inventory inspection finished with blockers.",
  );
}

export async function runProductRecoveryAction(action: ProductRecoveryAction): Promise<string> {
  if (action !== "fix-setup") return "No product recovery action was selected.";

  let helper = await runtimeApi.getHelperBridgeStatus().catch(() => null);
  if (helper && helperNeedsLazyStart(helper)) {
    const started = await runtimeApi.startHelperBridge().catch(() => null);
    if (!started?.ok) return "Setup still needs attention. Open Diagnostics for technical details.";
    helper = await runtimeApi.getHelperBridgeStatus().catch(() => null);
  }
  const readiness = helper?.state === "ready"
    ? await runtimeApi.verifyRequiredOutboundAiReadiness().catch(() => null)
    : null;
  const input = await runtimeApi.getInputStatus().catch(() => null);
  const workerStatus = helper?.state === "ready"
    ? await runtimeApi.helperBridgeWorkerStatus().catch(() => null)
    : null;
  const worker = parseWorkerCapabilities(workerStatus);
  const hasProblem = Boolean(
    !helper ||
    helper.state !== "ready" ||
    !readiness?.ok ||
    input?.blocker ||
    (worker.responseAvailable && !worker.translationIdEnReady),
  );

  if (hasProblem) return "Setup still needs attention. Open Diagnostics for technical details.";
  return "The local translation check passed. Check Meeting again; the Meeting microphone may still need attention.";
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