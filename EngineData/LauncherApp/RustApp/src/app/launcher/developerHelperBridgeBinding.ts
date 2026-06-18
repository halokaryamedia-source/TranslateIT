import { runtimeApi } from "../engineTranslate/runtimeApi";

let bound = false;

function helperTask(action: string | undefined) {
  if (action === "start") return runtimeApi.startHelperBridge();
  if (action === "stop") return runtimeApi.stopHelperBridge();
  if (action === "status") return runtimeApi.sendHelperBridgeRequest({ task: "status" });
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

function previewSummary(result: Awaited<ReturnType<typeof runtimeApi.prepareCaptureStartRequest>>): string {
  if (!result) return "Capture helper bridge request preview did not return a result.";
  const state = result.ok ? "ready" : "blocked";
  return `Capture ${result.command} preview ${state}. Provider ready: ${result.provider_ready}. CUDA ready: ${result.cuda_ready}. This preview did not start or stop capture. ${result.message}`;
}

export function bindDeveloperHelperBridgeUi(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (event) => {
    const helperButton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-helper-bridge-action]");
    if (helperButton) {
      const action = helperButton.dataset.helperBridgeAction;
      helperButton.disabled = true;
      void helperTask(action)
        .then((result) => {
          setAssistantNotice(result?.message ?? "Helper bridge command did not return a result.");
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
  });
}
