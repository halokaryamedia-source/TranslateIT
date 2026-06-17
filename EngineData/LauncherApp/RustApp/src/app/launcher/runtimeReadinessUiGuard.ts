let bound = false;
let guardTimer: number | null = null;

function visibleText(id: string): string {
  return document.getElementById(id)?.textContent?.trim() ?? "";
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function guardReadinessUi(): void {
  const realtimeStatus = visibleText("realtimeStatus").toLowerCase();
  const userPresence = visibleText("userPresence").toLowerCase();
  if (!realtimeStatus.includes("setup needed")) return;
  if (userPresence.includes("ready")) setText("userPresence", "Setup needed");
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
