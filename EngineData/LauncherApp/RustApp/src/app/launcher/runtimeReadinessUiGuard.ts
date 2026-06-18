let bound = false;
let guardTimer: number | null = null;
let observer: MutationObserver | null = null;

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

function isPriorGenericReadyLabel(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "ready" || normalized.startsWith("ready (");
}

function guardReadinessUi(): void {
  if (!hasSetupNeededStatus()) return;
  const userPresence = visibleText("userPresence");
  const qualityStatus = visibleText("qualityStatus");
  if (isPriorGenericReadyLabel(userPresence)) setText("userPresence", "Setup needed");
  if (isPriorGenericReadyLabel(qualityStatus)) setText("qualityStatus", "Needs setup");
}

export function bindRuntimeReadinessUiGuard(): () => void {
  if (bound) return unbindRuntimeReadinessUiGuard;
  bound = true;
  observer = new MutationObserver(() => guardReadinessUi());
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  guardTimer = window.setInterval(guardReadinessUi, 2_000);
  guardReadinessUi();
  return unbindRuntimeReadinessUiGuard;
}

export function unbindRuntimeReadinessUiGuard(): void {
  if (!bound) return;
  observer?.disconnect();
  observer = null;
  if (guardTimer !== null) window.clearInterval(guardTimer);
  guardTimer = null;
  bound = false;
}
