import {
  AUDIO_STUDIO_ADVANCED_CONTROLS,
  AUDIO_STUDIO_ADVANCED_MODES,
  AUDIO_STUDIO_QUALITY_DIMENSIONS,
  type AudioStudioAdvancedMode,
} from "./audioStudioAdvancedState";

let observerStarted = false;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setAssistantNotice(message: string): void {
  const element = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (element) element.textContent = message;
}

function modeCards(): string {
  return (Object.entries(AUDIO_STUDIO_ADVANCED_MODES) as [AudioStudioAdvancedMode, { label: string; sampleTarget: string; useCase: string }][]).map(([id, mode], index) => `
    <article class="audio-studio-reading-card ${index === 1 ? "active" : ""}" data-audio-studio-mode="${escapeHtml(id)}">
      <header><strong>${escapeHtml(mode.label)}</strong><span>${escapeHtml(mode.sampleTarget)}</span></header>
      <p>${escapeHtml(mode.useCase)}</p>
      <button class="mic-test-button-v22 secondary audio-studio-mode-button" type="button" data-mode-label="${escapeHtml(mode.label)}">Select Mode</button>
    </article>
  `).join("");
}

function controlRows(): string {
  return AUDIO_STUDIO_ADVANCED_CONTROLS.map((control) => `
    <section class="settings-output-row">
      <div><h3>${escapeHtml(control.label)}</h3><p>${escapeHtml(control.description)}</p></div>
      <div class="range-v22"><span style="width:${control.default_value}%;"></span><i></i></div>
    </section>
  `).join("");
}

function qualityRows(): string {
  return AUDIO_STUDIO_QUALITY_DIMENSIONS.map((dimension) => `
    <p class="developer-log-row"><strong>${dimension.local_pc_required ? "WAIT" : "INFO"}</strong><span>${escapeHtml(dimension.label)} - ${escapeHtml(dimension.target)}</span></p>
  `).join("");
}

function advancedPanel(): string {
  return `
    <section id="audioStudioAdvancedPanel" data-audio-studio-advanced="true">
      <section class="settings-section-title">
        <h2>Advanced Profile Modes</h2>
        <p>Choose the intended quality target before collecting samples.</p>
      </section>
      <div class="audio-studio-reading-grid">${modeCards()}</div>

      <section class="settings-section-title">
        <h2>Performance Controls</h2>
        <p>Prepared controls for pace, energy, clarity, emotion, and style strength.</p>
      </section>
      <article class="settings-card settings-card--audio-studio">
        <div class="settings-grid-2 compact-grid">${controlRows()}</div>
      </article>

      <section class="settings-section-title">
        <h2>Advanced Quality Gate</h2>
        <p>These dimensions must pass before the studio can be called production-ready.</p>
      </section>
      <article class="settings-card settings-card--audio-studio-status">
        <div class="developer-log-body" aria-label="Audio Studio advanced quality gate">${qualityRows()}</div>
      </article>
    </section>
  `;
}

function bindAdvancedPanelActions(): void {
  document.querySelectorAll<HTMLButtonElement>(".audio-studio-mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-audio-studio-mode]").forEach((card) => card.classList.remove("active"));
      button.closest("[data-audio-studio-mode]")?.classList.add("active");
      setAssistantNotice(`Audio Studio advanced mode selected: ${button.dataset.modeLabel ?? "Production Profile"}.`);
    });
  });
}

export function injectAudioStudioAdvancedPanel(): void {
  const view = document.querySelector<HTMLElement>(".settings-view--audio-studio");
  if (!view || view.querySelector('[data-audio-studio-advanced="true"]')) return;
  view.insertAdjacentHTML("beforeend", advancedPanel());
  bindAdvancedPanelActions();
}

export function bindAudioStudioAdvancedUi(): void {
  injectAudioStudioAdvancedPanel();
  if (observerStarted) return;
  const content = document.querySelector<HTMLElement>("#settingsContent");
  if (!content) return;
  const observer = new MutationObserver(() => injectAudioStudioAdvancedPanel());
  observer.observe(content, { childList: true, subtree: true });
  observerStarted = true;
}
