const WARMUP_STEPS = [
  "Desktop shell",
  "User settings",
  "Audio devices",
  "GPU policy",
  "Model assets",
  "Local AI worker",
  "Interface",
];

function clampActiveIndex(value: number): number {
  if (!Number.isFinite(value)) return -1;
  return Math.max(-1, Math.min(WARMUP_STEPS.length, Math.floor(value)));
}

function warmupStepNote(index: number, activeIndex: number): string {
  if (index === activeIndex) return "Checking local state...";
  if (index < activeIndex) return "Startup check completed.";
  return "Waiting for startup check.";
}

export function warmupStepsView(activeIndex = -1): string {
  const safeActiveIndex = clampActiveIndex(activeIndex);
  return WARMUP_STEPS
    .map((title, index) => `<li class="warmup-step ${index < safeActiveIndex ? "complete" : index === safeActiveIndex ? "active" : "pending"}"><span></span><div><strong>${title}</strong><p>${warmupStepNote(index, safeActiveIndex)}</p></div></li>`)
    .join("");
}

export const warmupProgressSteps = [12, 24, 38, 52, 68, 84, 100];
