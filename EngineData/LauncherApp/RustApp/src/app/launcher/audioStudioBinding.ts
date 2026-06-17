import { audioStudioApi } from "../engineTranslate/audioStudioApi";
import { icon } from "../shared/icons";
import {
  AUDIO_STUDIO_READING_LINES,
  createGuidedReadingTake,
  createImportedTake,
  stateLabel,
  type AudioStudioTakeDraft,
  type AudioStudioTakeState,
} from "./audioStudioState";

let selectedReadingIndex = 0;
let stagedTakes: AudioStudioTakeDraft[] = [];

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

function statusTone(state: AudioStudioTakeState): string {
  if (state === "accepted") return "good";
  if (state === "blocked") return "error";
  if (state === "needs_retry") return "warning";
  return "neutral";
}

function sendCommandNotice(task: Promise<{ message: string } | null>, fallback: string): void {
  void task
    .then((result) => setAssistantNotice(result?.message ? `${fallback} ${result.message}` : fallback))
    .catch(() => setAssistantNotice(`${fallback} Backend command is not available yet.`));
}

function updateTakeState(takeId: string, state: AudioStudioTakeState): void {
  stagedTakes = stagedTakes.map((take) => take.id === takeId ? { ...take, state } : take);
  const take = stagedTakes.find((item) => item.id === takeId);
  renderTakeReviewPanel();
  if (!take) return;
  const fallback = `${take.title} marked as ${stateLabel(state)}.`;
  setAssistantNotice(fallback);
  sendCommandNotice(audioStudioApi.updateTakeState({ take_id: takeId, state }), fallback);
}

function readingCards(): string {
  return AUDIO_STUDIO_READING_LINES.map((line, index) => `
    <article class="audio-studio-reading-card ${index === selectedReadingIndex ? "active" : ""}" data-reading-id="${escapeHtml(line.id)}">
      <header><strong>${escapeHtml(line.label)}</strong><span>${escapeHtml(line.target)}</span></header>
      <p>${escapeHtml(line.text)}</p>
      <button class="mic-test-button-v22 secondary audio-studio-use-line" type="button" data-reading-index="${index}">Use this line</button>
    </article>
  `).join("");
}

function takeReviewCards(): string {
  if (stagedTakes.length === 0) {
    return `<article class="feature-card empty-state-card"><div class="feature-title-row"><h4>No take staged yet</h4></div><p>Import audio or choose a guided reading line to create the first draft take.</p></article>`;
  }

  return stagedTakes.map((take) => `
    <article class="audio-studio-reading-card" data-take-id="${escapeHtml(take.id)}">
      <header><strong>${escapeHtml(take.title)}</strong><span class="status-badge status-badge--${statusTone(take.state)}">${escapeHtml(stateLabel(take.state))}</span></header>
      <p>${escapeHtml(take.detail)}</p>
      <div class="settings-card-actions compact">
        <button class="mic-test-button-v22 audio-studio-take-action" type="button" data-take-action="accepted" data-take-id="${escapeHtml(take.id)}">Accept</button>
        <button class="mic-test-button-v22 secondary audio-studio-take-action" type="button" data-take-action="needs_retry" data-take-id="${escapeHtml(take.id)}">Retry</button>
        <button class="mic-test-button-v22 secondary audio-studio-take-action" type="button" data-take-action="blocked" data-take-id="${escapeHtml(take.id)}">Block</button>
      </div>
    </article>
  `).join("");
}

function bindTakeReviewActions(): void {
  document.querySelectorAll<HTMLButtonElement>(".audio-studio-take-action").forEach((button) => {
    button.addEventListener("click", () => {
      const takeId = button.dataset.takeId ?? "";
      const action = button.dataset.takeAction as AudioStudioTakeState | undefined;
      if (!takeId || !action) return;
      updateTakeState(takeId, action);
    });
  });
}

function renderTakeReviewPanel(): void {
  const panel = document.querySelector<HTMLElement>("#audioStudioTakeReviewPanel");
  if (!panel) return;
  panel.innerHTML = takeReviewCards();
  bindTakeReviewActions();
}

function renderReadingPanel(): void {
  const panel = document.querySelector<HTMLElement>("#audioStudioReadingGrid");
  if (!panel) return;
  panel.innerHTML = readingCards();
  bindReadingActions();
}

function audioStudioView(): string {
  return `
    <div class="settings-view settings-view--audio-studio">
      <section class="settings-view-header">
        <h2>Audio Studio</h2>
        <p>Professional mode workspace for imported audio and guided reading capture.</p>
      </section>

      <section class="settings-section-title first">
        <h2>Professional Workspace</h2>
        <p>Prepare clean source takes before connecting provider-specific generation.</p>
      </section>

      <article class="settings-card settings-card--audio-studio">
        <div class="settings-grid-2 compact-grid">
          <section class="settings-output-row">
            ${icon("speaker")}
            <div><h3>Import audio</h3><p>Add existing WAV, MP3, M4A, OGG, or WEBM audio for later review.</p></div>
            <button id="audioStudioImportButton" class="mic-test-button-v22" type="button">Import</button>
          </section>
          <section class="settings-output-row">
            ${icon("mic")}
            <div><h3>Guided reading</h3><p>Read prepared text directly in the app to keep takes consistent.</p></div>
            <button id="audioStudioGuidedButton" class="mic-test-button-v22" type="button">Stage Guide</button>
          </section>
        </div>
        <input id="audioStudioFileInput" type="file" accept="audio/wav,audio/mpeg,audio/mp4,audio/ogg,audio/webm,.wav,.mp3,.m4a,.ogg,.webm" multiple hidden />
      </article>

      <section class="settings-section-title">
        <h2>Guided Reading Lines</h2>
        <p>Initial curated text set for consistent recording sessions.</p>
      </section>

      <div id="audioStudioReadingGrid" class="audio-studio-reading-grid">${readingCards()}</div>

      <section class="settings-section-title">
        <h2>Take Review</h2>
        <p>Review staged items and mark them as accepted, retry, or blocked before later local processing.</p>
      </section>

      <div id="audioStudioTakeReviewPanel" class="audio-studio-reading-grid">${takeReviewCards()}</div>

      <section class="settings-section-title">
        <h2>Readiness Gate</h2>
        <p>This branch only adds non-local scaffolding. Runtime validation remains blocked until target-PC evidence exists.</p>
      </section>
      <article class="settings-card settings-card--audio-studio-status">
        <div class="developer-log-body" aria-label="Audio Studio readiness">
          <p class="developer-log-row"><strong>INFO</strong><span>UI scaffold: staged</span></p>
          <p class="developer-log-row"><strong>INFO</strong><span>Take states: draft, staged, accepted, retry, blocked</span></p>
          <p class="developer-log-row"><strong>WAIT</strong><span>Import handling: metadata only until backend route is added</span></p>
          <p class="developer-log-row"><strong>WAIT</strong><span>Guided recording: future local capture route, not validated here</span></p>
        </div>
      </article>
    </div>
  `;
}

function bindReadingActions(): void {
  document.querySelectorAll<HTMLButtonElement>(".audio-studio-use-line").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.readingIndex ?? 0);
      selectedReadingIndex = Number.isFinite(index) ? index : 0;
      const line = AUDIO_STUDIO_READING_LINES[selectedReadingIndex] ?? AUDIO_STUDIO_READING_LINES[0];
      renderReadingPanel();
      setAssistantNotice(`Guided reading line ready: ${line.text}`);
    });
  });
}

function bindAudioStudioViewEvents(): void {
  const fileInput = document.querySelector<HTMLInputElement>("#audioStudioFileInput");
  const importButton = document.querySelector<HTMLButtonElement>("#audioStudioImportButton");
  const guidedButton = document.querySelector<HTMLButtonElement>("#audioStudioGuidedButton");

  importButton?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => {
    const files = Array.from(fileInput.files ?? []);
    const newTakes = files.map(createImportedTake);
    stagedTakes = [...newTakes, ...stagedTakes].slice(0, 12);
    renderTakeReviewPanel();
    const names = files.map((file) => file.name).slice(0, 4).join(", ");
    const fallback = files.length > 0 ? `Audio Studio import staged: ${files.length} file(s). ${names}` : "No audio file selected.";
    setAssistantNotice(fallback);
    newTakes.forEach((take) => {
      sendCommandNotice(audioStudioApi.importTake({ take_id: take.id, source: take.source, title: take.title, detail: take.detail }), fallback);
    });
    fileInput.value = "";
  });

  guidedButton?.addEventListener("click", () => {
    const line = AUDIO_STUDIO_READING_LINES[selectedReadingIndex] ?? AUDIO_STUDIO_READING_LINES[0];
    const take = createGuidedReadingTake(line);
    stagedTakes = [take, ...stagedTakes].slice(0, 12);
    renderTakeReviewPanel();
    const fallback = `Guided reading staged: ${line.text}`;
    setAssistantNotice(fallback);
    sendCommandNotice(audioStudioApi.stageGuidedTake({ take_id: take.id, source: take.source, title: take.title, detail: take.detail }), fallback);
  });

  bindReadingActions();
  bindTakeReviewActions();
}

function openAudioStudio(): void {
  document.body.classList.add("settings-open");
  document.querySelector<HTMLElement>("#homePage")?.classList.add("is-hidden");
  document.querySelector<HTMLElement>("#settingsPage")?.classList.remove("is-hidden");
  document.querySelectorAll<HTMLButtonElement>("[data-settings-tab]").forEach((button) => button.classList.remove("active"));
  document.querySelector<HTMLButtonElement>('[data-audio-studio-tab="true"]')?.classList.add("active");
  const content = document.querySelector<HTMLElement>("#settingsContent");
  if (!content) return;
  content.innerHTML = audioStudioView();
  content.scrollTop = 0;
  bindAudioStudioViewEvents();
  setAssistantNotice("Audio Studio opened. Non-local scaffold is ready for the next backend pass.");
}

export function bindAudioStudioUi(): void {
  const nav = document.querySelector<HTMLElement>(".settings-nav-v22");
  if (!nav || document.querySelector('[data-audio-studio-tab="true"]')) return;

  const button = document.createElement("button");
  button.className = "settings-nav-item";
  button.type = "button";
  button.dataset.audioStudioTab = "true";
  button.innerHTML = `${icon("speaker")}<span>Audio Studio</span>`;
  button.addEventListener("click", openAudioStudio);

  const developerButton = nav.querySelector<HTMLButtonElement>('[data-settings-tab="developer"]');
  nav.insertBefore(button, developerButton ?? null);
}
