export function warmupStepsView(activeIndex = -1): string {
  const steps = ["Desktop shell", "User settings", "Audio devices", "GPU policy", "Model assets", "Local AI worker", "Interface"];
  return steps
    .map((title, index) => `<li class="warmup-step ${index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending"}"><span></span><div><strong>${title}</strong><p>${index === activeIndex ? "Checking..." : "Ready for startup check."}</p></div></li>`)
    .join("");
}

export const warmupProgressSteps = [12, 24, 38, 52, 68, 84, 100];
