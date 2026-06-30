import { invoke } from "@tauri-apps/api/core";
import { asrPayloadApi, type AsrAudioPayloadRequestStatus } from "../bridge/asrPayloadApi";
import { runtimeApi } from "../bridge/runtimeApi";
import type { AsrHandoffRequestStatus, CaptureHelperBridgeRequestPreview, CaptureHelperDispatchStatus, CaptureTranscriptBoundaryStatus, HelperBridgeActionResult, HelperBridgeWorkerResponse, LivePipelineSessionSnapshot, PipelineHandoffRequestStatus } from "../shared/types";

let bound = false;
let clickHandler: ((event: MouseEvent) => void) | null = null;

type HelperTaskResult = HelperBridgeActionResult | HelperBridgeWorkerResponse;
type CaptureTaskResult = CaptureHelperBridgeRequestPreview | HelperBridgeActionResult | CaptureTranscriptBoundaryStatus | AsrHandoffRequestStatus | AsrAudioPayloadRequestStatus | PipelineHandoffRequestStatus | PipelineHandoffRequestStatus[] | LivePipelineSessionSnapshot | null;
type WorkerPayload = Record<string, unknown>;
type CaptureDispatchGlobal = typeof globalThis & {
  __translateitCaptureHelperDispatchStatus?: CaptureHelperDispatchStatus;
  __translateitCaptureTranscriptBoundaryStatus?: CaptureTranscriptBoundaryStatus;
  __translateitLivePipelineHandoffStatus?: PipelineHandoffRequestStatus[];
};

function workerSmokeFallback(message: string): HelperBridgeWorkerResponse {
  return {
    ok: false,
    state: "frontend_bridge_error",
    task: "dev_pipeline_contract_smoke",
    message,
    generation_token: 0,
    runtime_claim: "frontend_bridge_unavailable",
    worker_response_json: JSON.stringify({
      ok: false,
      stage: "dev_pipeline_contract_smoke",
      blocker: "frontend_bridge_unavailable",
      runtime_claim: "frontend_bridge_unavailable",
      note: message,
    }),
  };
}

async function workerPipelineSmokeTask(): Promise<HelperBridgeWorkerResponse> {
  try {
    return await invoke<HelperBridgeWorkerResponse>("helper_bridge_pipeline_contract_smoke");
  } catch {
    return workerSmokeFallback("Worker pipeline smoke failed before reaching the Tauri command bridge.");
  }
}

function helperTask(action: string | undefined): Promise<HelperTaskResult> {
  if (action === "start") return runtimeApi.startHelperBridge();
  if (action === "stop") return runtimeApi.stopHelperBridge();
  if (action === "status") return runtimeApi.helperBridgeWorkerStatus();
  if (action === "preload-asr") return runtimeApi.helperBridgePreloadAsr();
  if (action === "preload-translation") return runtimeApi.helperBridgePreloadTranslation("Realtime");
  if (action === "tts-preflight") return runtimeApi.helperBridgeTtsPreflight();
  if (action === "worker-pipeline-smoke") return workerPipelineSmokeTask();
  if (action === "synthesize-test") return runtimeApi.helperBridgeSynthesizeText("TranslateIT local voice test.");
  return runtimeApi.cancelHelperBridgeTask();
}

function capturePreviewTask(action: string | undefined): Promise<CaptureTaskResult> {
  if (action === "stop-preview") return runtimeApi.prepareCaptureStopRequest();
  if (action === "start-dispatch") return runtimeApi.dispatchCaptureStartRequest();
  if (action === "stop-dispatch") return runtimeApi.dispatchCaptureStopRequest();
  if (action === "boundary-status") return runtimeApi.getCaptureTranscriptBoundaryStatus();
  if (action === "asr-prepare") return runtimeApi.prepareAsrHandoffRequest();
  if (action === "asr-dispatch") return runtimeApi.dispatchAsrHandoffRequest();
  if (action === "asr-payload-latest") return asrPayloadApi.getLatestAsrAudioPayloadStatus();
  if (action === "asr-payload-prepare") return asrPayloadApi.prepareAsrAudioPayloadRequest();
  if (action === "asr-decode-dispatch") return asrPayloadApi.dispatchAsrDecodeRequest();
  if (action === "asr-promote-transcript") return invoke<LivePipelineSessionSnapshot>("promote_latest_asr_payload_transcript");
  if (action === "seed-transcript") return runtimeApi.seedDevAsrTranscript("Hello from the developer seeded ASR transcript.");
  if (action === "seed-translation") return runtimeApi.seedDevTranslatedText("Halo dari seed teks terjemahan developer.");
  if (action === "pipeline-smoke") return runtimeApi.runDevPipelineContractSmoke();
  if (action === "translation-prepare") return runtimeApi.prepareTranslationHandoffRequest();
  if (action === "translation-dispatch") return runtimeApi.dispatchTranslationHandoffRequest();
  if (action === "tts-prepare") return runtimeApi.prepareTtsHandoffRequest();
  if (action === "tts-dispatch") return runtimeApi.dispatchTtsHandoffRequest();
  if (action === "pipeline-status") return runtimeApi.getLivePipelineHandoffStatus();
  if (action === "pipeline-snapshot") return runtimeApi.getLivePipelineSessionSnapshot();
  if (action === "pipeline-reset") return runtimeApi.resetLivePipelineHandoffStatus();
  return runtimeApi.prepareCaptureStartRequest();
}

function setAssistantNotice(message: string): void {
  const assistant = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (assistant) assistant.textContent = message;
}

function setCaptureDispatchGlobal(status: CaptureHelperDispatchStatus): void {
  (globalThis as CaptureDispatchGlobal).__translateitCaptureHelperDispatchStatus = status;
}

function setCaptureTranscriptBoundaryGlobal(status: CaptureTranscriptBoundaryStatus): void {
  (globalThis as CaptureDispatchGlobal).__translateitCaptureTranscriptBoundaryStatus = status;
}

function setLivePipelineGlobal(status: PipelineHandoffRequestStatus[]): void {
  (globalThis as CaptureDispatchGlobal).__translateitLivePipelineHandoffStatus = status;
}

async function refreshCaptureDispatchStatus(): Promise<void> {
  const status = await runtimeApi.getCaptureHelperDispatchStatus().catch(() => null);
  if (status) setCaptureDispatchGlobal(status);
}

async function refreshCaptureTranscriptBoundaryStatus(): Promise<void> {
  const status = await runtimeApi.getCaptureTranscriptBoundaryStatus().catch(() => null);
  if (status) setCaptureTranscriptBoundaryGlobal(status);
}

async function refreshLivePipelineStatus(): Promise<void> {
  const status = await runtimeApi.getLivePipelineHandoffStatus().catch(() => null);
  if (status) setLivePipelineGlobal(status);
}

function compactValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : null;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function parseWorkerJson(raw: string | undefined): WorkerPayload | null {
  if (!raw || raw === "{}") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as WorkerPayload : null;
  } catch {
    return { raw };
  }
}

function workerPayload(result: HelperTaskResult): WorkerPayload | null {
  if (!("worker_response_json" in result)) return null;
  return parseWorkerJson(result.worker_response_json);
}

function workerDetail(payload: WorkerPayload | null): string {
  if (!payload) return "";
  const details: Array<[string, unknown]> = [
    ["blocker", payload.blocker],
    ["warnings", payload.warnings],
    ["translation_contract", payload.translation_contract_ok],
    ["tts_contract", payload.tts_contract_ok],
    ["runtime_claim", payload.runtime_claim],
    ["model", payload.model_id ?? payload.asr_active_model_id],
    ["device", payload.device ?? payload.selected_device],
    ["compute", payload.compute_type ?? payload.selected_compute_type],
    ["fallback", payload.fallback_reason ?? payload.translation_fallback_reason],
    ["provider", payload.provider],
    ["output", payload.output_path],
    ["audio", payload.resolved_audio_path],
  ];
  const compactDetails = details
    .map(([label, value]) => {
      const compact = compactValue(value);
      return compact ? `${label}: ${compact}` : null;
    })
    .filter((value): value is string => Boolean(value));
  return compactDetails.length ? ` Details: ${compactDetails.join(" | ")}` : "";
}

function helperSummary(result: HelperTaskResult | null | undefined): string {
  if (!result) return "Helper bridge command did not return a result.";
  const task = "task" in result ? ` [${result.task}]` : "";
  const state = result.ok ? "evidence returned" : "blocked";
  const payload = workerPayload(result);
  const contractNote = payload?.runtime_claim === "worker_pipeline_contract_smoke_no_model_runtime_claim"
    ? " Worker smoke only verifies nested translation/TTS contract handlers; no provider readiness is implied."
    : "";
  return `Helper${task} ${state}: ${result.message}${workerDetail(payload)}${contractNote} This is diagnostic evidence, not a local runtime readiness claim.`;
}

function isCapturePreview(result: CaptureTaskResult): result is CaptureHelperBridgeRequestPreview {
  return Boolean(result && !Array.isArray(result) && "payload_json" in result && "migration_ready" in result);
}

function isCaptureTranscriptBoundary(result: CaptureTaskResult): result is CaptureTranscriptBoundaryStatus {
  return Boolean(result && !Array.isArray(result) && "transcript_handoff_ready" in result && "ready_for_target_asr_frame" in result);
}

function isAsrHandoff(result: CaptureTaskResult): result is AsrHandoffRequestStatus {
  return Boolean(result && !Array.isArray(result) && "request_prepared" in result && "boundary_ready" in result && "dispatch_ok" in result && "frames_received" in result);
}

function isAsrAudioPayload(result: CaptureTaskResult): result is AsrAudioPayloadRequestStatus {
  return Boolean(result && !Array.isArray(result) && "schema_prepared" in result && "audio_payload_ready" in result && "pcm_format" in result && "evidence_json" in result);
}

function isPipelineHandoff(result: CaptureTaskResult): result is PipelineHandoffRequestStatus {
  return Boolean(result && !Array.isArray(result) && "stage" in result && "prerequisite_stage" in result && "dispatch_ok" in result);
}

function isLivePipelineSnapshot(result: CaptureTaskResult): result is LivePipelineSessionSnapshot {
  return Boolean(result && !Array.isArray(result) && "progress_percent" in result && "stages" in result && "active_stage" in result);
}

function ensureAsrDecodeControls(): void {
  const container = document.querySelector<HTMLElement>('[aria-label="Capture helper bridge preview controls"]');
  if (!container || container.querySelector('[data-capture-bridge-action="asr-payload-prepare"]')) return;
  const latest = document.createElement("button");
  latest.className = "mic-test-button-v22 secondary";
  latest.type = "button";
  latest.dataset.captureBridgeAction = "asr-payload-latest";
  latest.textContent = "Latest ASR Payload";
  const prepare = document.createElement("button");
  prepare.className = "mic-test-button-v22 secondary";
  prepare.type = "button";
  prepare.dataset.captureBridgeAction = "asr-payload-prepare";
  prepare.textContent = "Prepare ASR Payload";
  const dispatch = document.createElement("button");
  dispatch.className = "mic-test-button-v22 secondary";
  dispatch.type = "button";
  dispatch.dataset.captureBridgeAction = "asr-decode-dispatch";
  dispatch.textContent = "Dispatch ASR Decode";
  const promote = document.createElement("button");
  promote.className = "mic-test-button-v22 secondary";
  promote.type = "button";
  promote.dataset.captureBridgeAction = "asr-promote-transcript";
  promote.textContent = "Promote ASR Transcript";
  const anchor = container.querySelector('[data-capture-bridge-action="asr-dispatch"]');
  if (anchor?.nextSibling) {
    container.insertBefore(latest, anchor.nextSibling);
    container.insertBefore(prepare, latest.nextSibling);
    container.insertBefore(dispatch, prepare.nextSibling);
    container.insertBefore(promote, dispatch.nextSibling);
  } else {
    container.append(latest, prepare, dispatch, promote);
  }
}

function previewSummary(result: CaptureTaskResult): string {
  if (!result) return "Capture helper bridge request did not return a result.";
  if (Array.isArray(result)) {
    const summary = result.map((item) => `${item.stage}:${item.state}:${item.next_action}`).join(" | ");
    return `Live pipeline handoff status: ${summary}. This is source-side wiring evidence, not runtime proof.`;
  }
  if (isLivePipelineSnapshot(result)) {
    setLivePipelineGlobal(result.stages);
    const payload = `payload transcript=${result.payload.transcript_available}, translation=${result.payload.translation_available}, tts=${result.payload.tts_text_available}`;
    return `Live pipeline snapshot ${result.state}: ${result.progress_percent}% source-side progress, active=${result.active_stage}, next=${result.next_action}, blocker=${result.active_blocker || "none"}, ${payload}. ${result.summary} This is not runtime proof.`;
  }
  if (isPipelineHandoff(result)) {
    const state = result.dispatch_attempted ? (result.dispatch_ok ? "dispatch accepted" : "dispatch blocked") : (result.request_prepared ? "request prepared" : "blocked before request");
    return `${result.stage} ${state}: prerequisite=${result.prerequisite_stage}/${result.prerequisite_ready}, next=${result.next_action}, blocker=${result.blocker || "none"}. This is pipeline handoff stub evidence, not runtime proof.`;
  }
  if (isAsrAudioPayload(result)) {
    const state = result.dispatch_attempted ? (result.dispatch_ok ? "worker accepted" : "worker blocked") : (result.request_prepared ? "payload ready" : result.schema_prepared ? "schema ready" : result.state);
    const audio = result.audio_path ? `audio=${result.audio_path}` : "audio=none";
    const worker = parseWorkerJson(result.worker_response_json);
    const interpreted = `workerStage=${result.worker_stage || "none"}, workerBlocker=${result.worker_blocker || result.blocker || "none"}, transcriptPresent=${result.transcript_text_present}, transcriptChars=${result.transcript_char_count}`;
    return `ASR payload ${state}: boundary=${result.boundary_ready}, audioReady=${result.audio_payload_ready}, ${audio}, format=${result.pcm_format}, samples=${result.frame_count}, duration=${result.duration_ms}ms, next=${result.next_action}, blocker=${result.blocker || "none"}, ${interpreted}.${workerDetail(worker)} This is ASR audio payload/worker-response evidence, not transcript or Windows runtime proof.`;
  }
  if (isAsrHandoff(result)) {
    const state = result.dispatch_attempted ? (result.dispatch_ok ? "dispatch accepted" : "dispatch blocked") : (result.request_prepared ? "request prepared" : "blocked before request");
    return `ASR handoff ${state}: boundary=${result.boundary_ready}, frames=${result.frames_received}, buffer=${result.buffered_duration_ms}ms, next=${result.next_action}, blocker=${result.blocker || "none"}. This is ASR handoff stub evidence, not transcript proof.`;
  }
  if (isCaptureTranscriptBoundary(result)) {
    const state = result.transcript_handoff_ready ? "ready for ASR handoff" : "blocked before ASR handoff";
    return `Capture transcript boundary ${state}: frames=${result.frames_received}, buffer=${result.buffered_duration_ms}ms, next=${result.next_action}, blocker=${result.blocker || "none"}. This is boundary evidence, not transcript/runtime proof.`;
  }
  if (!isCapturePreview(result)) {
    const state = result.ok ? "dispatch response returned" : "dispatch blocked";
    return `Capture helper ${state}: ${result.message} This dispatch only tests helper command wiring and is not a capture readiness claim.`;
  }
  const state = result.migration_ready ? "migration envelope ready" : "migration blocked";
  const preview = result.preview_only ? "Preview only; capture was not started or stopped." : "Runtime execution requested.";
  return `Capture ${result.command} ${state}. Helper task: ${result.helper_task}. Provider required: ${result.requires_provider_ready}. Provider evidence flag: ${result.provider_ready}. CUDA evidence flag: ${result.cuda_ready}. ${preview} This is not a readiness claim. ${result.message}`;
}

export function bindDeveloperHelperBridgeUi(): () => void {
  if (bound) return unbindDeveloperHelperBridgeUi;
  bound = true;
  ensureAsrDecodeControls();
  clickHandler = (event: MouseEvent) => {
    ensureAsrDecodeControls();
    const helperButton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-helper-bridge-action]");
    if (helperButton) {
      const action = helperButton.dataset.helperBridgeAction;
      helperButton.disabled = true;
      void helperTask(action)
        .then((result) => {
          setAssistantNotice(helperSummary(result));
        })
        .catch(() => {
          setAssistantNotice("Helper bridge command failed before returning a result.");
        })
        .finally(() => {
          helperButton.disabled = false;
        });
      return;
    }

    const captureButton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-capture-bridge-action]");
    if (!captureButton) return;
    const action = captureButton.dataset.captureBridgeAction;
    captureButton.disabled = true;
    void capturePreviewTask(action)
      .then(async (result) => {
        await refreshCaptureDispatchStatus();
        await refreshCaptureTranscriptBoundaryStatus();
        await refreshLivePipelineStatus();
        setAssistantNotice(previewSummary(result));
      })
      .catch(() => setAssistantNotice("Capture helper bridge request failed before returning a result."))
      .finally(() => {
        captureButton.disabled = false;
      });
  };
  document.addEventListener("click", clickHandler);
  return unbindDeveloperHelperBridgeUi;
}

export function unbindDeveloperHelperBridgeUi(): void {
  if (!bound || !clickHandler) return;
  document.removeEventListener("click", clickHandler);
  clickHandler = null;
  bound = false;
}
