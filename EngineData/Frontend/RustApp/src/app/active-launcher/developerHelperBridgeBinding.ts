import { runtimeApi } from "../bridge/runtimeApi";
import type { HelperBridgeActionResult, HelperBridgeWorkerResponse } from "../shared/types";

let bound = false;
let clickHandler: ((event: MouseEvent) => void) | null = null;

type HelperTaskResult = HelperBridgeActionResult | HelperBridgeWorkerResponse;
type WorkerPayload = Record<string, unknown>;

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

function capturePreviewTask(action: string | undefined) {
  if (action === "stop-preview") return runtimeApi.prepareCaptureStopRequest();
  return runtimeApi.prepareCaptureStartRequest();
}

function setAssistantNotice(message: string): void {
  const assistant = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (assistant) assistant.textContent = message;
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

function previewSummary(result: Awaited<ReturnType<typeof runtimeApi.prepareCaptureStartRequest>>): string {
  if (!result) return "Capture helper bridge request preview did not return a result.";
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
      .then((result) => setAssistantNotice(previewSummary(result)))
      .catch(() => setAssistantNotice("Capture helper bridge preview failed before returning a result."))
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
