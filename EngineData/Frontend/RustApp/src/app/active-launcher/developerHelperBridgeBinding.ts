import { runtimeApi } from "../bridge/runtimeApi";
import type { AsrHandoffRequestStatus, CaptureHelperBridgeRequestPreview, CaptureHelperDispatchStatus, CaptureTranscriptBoundaryStatus, HelperBridgeActionResult, HelperBridgeWorkerResponse } from "../shared/types";

let bound = false;
let clickHandler: ((event: MouseEvent) => void) | null = null;

type HelperTaskResult = HelperBridgeActionResult | HelperBridgeWorkerResponse;
type CaptureTaskResult = CaptureHelperBridgeRequestPreview | HelperBridgeActionResult | CaptureTranscriptBoundaryStatus | AsrHandoffRequestStatus | null;
type WorkerPayload = Record<string, unknown>;
type CaptureDispatchGlobal = typeof globalThis & { __translateitCaptureHelperDispatchStatus?: CaptureHelperDispatchStatus; __translateitCaptureTranscriptBoundaryStatus?: CaptureTranscriptBoundaryStatus };

function helperTask(action: string | undefined): Promise<HelperTaskResult> {
  if (action === "start") return runtimeApi.startHelperBridge();
  if (action === "stop") return runtimeApi.stopHelperBridge();
  if (action === "status") return runtimeApi.helperBridgeWorkerStatus();
  if (action === "preload-asr") return runtimeApi.helperBridgePreloadAsr();
  if (action === "preload-translation") return runtimeApi.helperBridgePreloadTranslation("Realtime");
  if (action === "tts-preflight") return runtimeApi.helperBridgeTtsPreflight();
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

async function refreshCaptureDispatchStatus(): Promise<void> {
  const status = await runtimeApi.getCaptureHelperDispatchStatus().catch(() => null);
  if (status) setCaptureDispatchGlobal(status);
}

async function refreshCaptureTranscriptBoundaryStatus(): Promise<void> {
  const status = await runtimeApi.getCaptureTranscriptBoundaryStatus().catch(() => null);
  if (status) setCaptureTranscriptBoundaryGlobal(status);
}

function compactValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : null;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function workerPayload(result: HelperTaskResult): WorkerPayload | null {
  if (!("worker_response_json" in result)) return null;
  try {
    const parsed = JSON.parse(result.worker_response_json) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as WorkerPayload : null;
  } catch {
    return null;
  }
}

function workerDetail(payload: WorkerPayload | null): string {
  if (!payload) return "";
  const details: Array<[string, unknown]> = [
    ["blocker", payload.blocker],
    ["warnings", payload.warnings],
    ["model", payload.model_id ?? payload.asr_active_model_id],
    ["device", payload.device ?? payload.selected_device],
    ["compute", payload.compute_type ?? payload.selected_compute_type],
    ["fallback", payload.fallback_reason ?? payload.translation_fallback_reason],
    ["provider", payload.provider],
    ["output", payload.output_path],
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
  return `Helper${task} ${state}: ${result.message}${workerDetail(payload)} This is diagnostic evidence, not a local runtime readiness claim.`;
}

function isCapturePreview(result: CaptureTaskResult): result is CaptureHelperBridgeRequestPreview {
  return Boolean(result && "payload_json" in result && "migration_ready" in result);
}

function isCaptureTranscriptBoundary(result: CaptureTaskResult): result is CaptureTranscriptBoundaryStatus {
  return Boolean(result && "transcript_handoff_ready" in result && "ready_for_target_asr_frame" in result);
}

function isAsrHandoff(result: CaptureTaskResult): result is AsrHandoffRequestStatus {
  return Boolean(result && "request_prepared" in result && "boundary_ready" in result && "dispatch_ok" in result);
}

function previewSummary(result: CaptureTaskResult): string {
  if (!result) return "Capture helper bridge request did not return a result.";
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
  clickHandler = (event: MouseEvent) => {
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
