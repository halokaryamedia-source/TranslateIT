let bound = false;
let guardTimer: number | null = null;

function visibleText(id: string): string {
  return document.getElementById(id)?.textContent?.trim() ?? "";
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function hasSetupNeededStatus(): boolean {
  return visibleText("realtimeStatus").toLowerCase().includes("setup needed");
}

function guardReadinessUi(): void {
  if (!hasSetupNeededStatus()) return;
  const userPresence = visibleText("userPresence").toLowerCase();
  const qualityStatus = visibleText("qualityStatus").toLowerCase();
  if (userPresence.includes("ready")) setText("userPresence", "Setup needed");
  if (qualityStatus === "ready") setText("qualityStatus", "Needs setup");
}

export function bindRuntimeReadinessUiGuard(): void {
  if (bound) return;
  bound = true;
  const observer = new MutationObserver(() => guardReadinessUi());
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  guardTimer = window.setInterval(guardReadinessUi, 2_000);
  window.addEventListener("beforeunload", () => {
    if (guardTimer !== null) window.clearInterval(guardTimer);
    guardTimer = null;
  });
  guardReadinessUi();
}
