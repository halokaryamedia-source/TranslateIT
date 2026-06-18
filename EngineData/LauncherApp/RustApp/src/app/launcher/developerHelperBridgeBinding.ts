import { runtimeApi } from "../engineTranslate/runtimeApi";

function ensureBridgeControls(panel: HTMLElement): void {
  if (panel.dataset.helperBridgeControls === "true") return;
  panel.dataset.helperBridgeControls = "true";
  const controls = document.createElement("div");
  controls.className = "settings-card-actions compact";
  controls.innerHTML = `
    <button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="start">Start Helper</button>
    <button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="stop">Stop Helper</button>
    <button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="cancel">Cancel Task</button>
  `;
  panel.insertAdjacentElement("afterend", controls);
  controls.querySelectorAll<HTMLButtonElement>("[data-helper-bridge-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.helperBridgeAction;
      button.disabled = true;
      const task = action === "start"
        ? runtimeApi.startHelperBridge()
        : action === "stop"
          ? runtimeApi.stopHelperBridge()
          : runtimeApi.cancelHelperBridgeTask();
      void task
        .then((result) => {
          const message = result?.message ?? "Helper bridge command did not return a result.";
          const assistant = document.querySelector<HTMLParagraphElement>("#assistantMessage");
          if (assistant) assistant.textContent = message;
        })
        .finally(() => {
          button.disabled = false;
        });
    });
  });
}

export function bindDeveloperHelperBridgeUi(): void {
  const refresh = () => {
    const panel = document.querySelector<HTMLElement>('[aria-label="Architecture and runtime status"]');
    if (panel) ensureBridgeControls(panel);
  };
  refresh();
  const root = document.querySelector<HTMLElement>("#settingsContent") ?? document.body;
  const observer = new MutationObserver(refresh);
  observer.observe(root, { childList: true, subtree: true });
}
