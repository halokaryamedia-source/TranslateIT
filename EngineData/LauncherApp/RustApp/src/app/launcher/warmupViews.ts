const WARMUP_STEPS = [
  "Desktop shell",
  "User settings",
  "Audio devices",
  "GPU policy",
  "Model assets",
  "Local AI worker",
  "Interface",
];

function warmupStepNote(index: number, activeIndex: number): string {
  if (index === activeIndex) return "Checking local state...";
  if (index < activeIndex) return "Startup check completed.";
  return "Waiting for startup check.";
}

export function warmupStepsView(activeIndex = -1): string {
  return WARMUP_STEPS
    .map((title, index) => `<li class="warmup-step ${index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending"}"><span></span><div><strong>${title}</strong><p>${warmupStepNote(index, activeIndex)}</p></div></li>`)
    .join("");
}

export const warmupProgressSteps = [12, 24, 38, 52, 68, 84, 100];
