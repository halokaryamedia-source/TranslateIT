import { runtimeApi } from "../bridge/runtimeApi";
import type { HelperBridgeActionResult, HelperBridgeWorkerResponse } from "../shared/types";

let bound = false;
let clickHandler: ((event: MouseEvent) => void) | null = null;

type HelperTaskResult = HelperBridgeActionResult | HelperBridgeWorkerResponse;

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

function helperSummary(result: HelperTaskResult | null | undefined): string {
  if (!result) return "Helper bridge command did not return a result.";
  const task = "task" in result ? ` [${result.task}]` : "";
  const state = result.ok ? "ok" : "blocked";
  return `Helper${task} ${state}: ${result.message}`;
}

function previewSummary(result: Awaited<ReturnType<typeof runtimeApi.prepareCaptureStartRequest>>): string {
  if (!result) return "Capture helper bridge request preview did not return a result.";
  const state = result.ok ? "ready" : "blocked";
  return `Capture ${result.command} preview ${state}. Provider ready: ${result.provider_ready}. CUDA ready: ${result.cuda_ready}. This preview did not start or stop capture. ${result.message}`;
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
