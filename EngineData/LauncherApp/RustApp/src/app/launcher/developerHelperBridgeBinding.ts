import { runtimeApi } from "../engineTranslate/runtimeApi";

let bound = false;

function helperTask(action: string | undefined) {
  if (action === "start") return runtimeApi.startHelperBridge();
  if (action === "stop") return runtimeApi.stopHelperBridge();
  if (action === "status") return runtimeApi.sendHelperBridgeRequest({ task: "status" });
  return runtimeApi.cancelHelperBridgeTask();
}

function setAssistantNotice(message: string): void {
  const assistant = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (assistant) assistant.textContent = message;
}

export function bindDeveloperHelperBridgeUi(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-helper-bridge-action]");
    if (!button) return;
    const action = button.dataset.helperBridgeAction;
    button.disabled = true;
    void helperTask(action)
      .then((result) => {
        setAssistantNotice(result?.message ?? "Helper bridge command did not return a result.");
      })
      .catch(() => {
        setAssistantNotice("Helper bridge command failed before returning a result.");
      })
      .finally(() => {
        button.disabled = false;
      });
  });
}
