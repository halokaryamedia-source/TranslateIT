import { icon } from "../shared/icons";

const READING_LINES = [
  {
    id: "id-neutral-01",
    label: "Neutral Indonesian",
    text: "Hari ini saya akan membaca kalimat ini dengan jelas, tenang, dan stabil.",
    target: "8-12 seconds",
  },
  {
    id: "en-neutral-01",
    label: "Neutral English",
    text: "Today I will read this sentence clearly with a calm and steady voice.",
    target: "8-12 seconds",
  },
  {
    id: "id-expressive-01",
    label: "Expressive Indonesian",
    text: "Tolong dengarkan instruksi ini baik-baik sebelum kita melanjutkan ke bagian berikutnya.",
    target: "10-14 seconds",
  },
];

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

function readingCards(): string {
  return READING_LINES.map((line, index) => `
    <article class="audio-studio-reading-card ${index === 0 ? "active" : ""}" data-reading-id="${escapeHtml(line.id)}">
      <header><strong>${escapeHtml(line.label)}</strong><span>${escapeHtml(line.target)}</span></header>
      <p>${escapeHtml(line.text)}</p>
      <button class="mic-test-button-v22 secondary audio-studio-use-line" type="button" data-reading-index="${index}">Use this line</button>
    </article>
  `).join("");
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
            <div><h3>Import audio</h3><p>Add existing WAV, MP3, M4A, or OGG audio for later review.</p></div>
            <button id="audioStudioImportButton" class="mic-test-button-v22" type="button">Import</button>
          </section>
          <section class="settings-output-row">
            ${icon("mic")}
            <div><h3>Guided reading</h3><p>Read prepared text directly in the app to keep takes consistent.</p></div>
            <button id="audioStudioGuidedButton" class="mic-test-button-v22" type="button">Start Guide</button>
          </section>
        </div>
        <input id="audioStudioFileInput" type="file" accept="audio/wav,audio/mpeg,audio/mp4,audio/ogg,audio/webm,.wav,.mp3,.m4a,.ogg,.webm" multiple hidden />
      </article>

      <section class="settings-section-title">
        <h2>Guided Reading Lines</h2>
        <p>Initial curated text set for consistent recording sessions.</p>
      </section>

      <div class="audio-studio-reading-grid">${readingCards()}</div>

      <section class="settings-section-title">
        <h2>Readiness Gate</h2>
        <p>This branch only adds non-local scaffolding. Runtime validation remains blocked until target-PC evidence exists.</p>
      </section>
      <article class="settings-card settings-card--audio-studio-status">
        <div class="developer-log-body" aria-label="Audio Studio readiness">
          <p class="developer-log-row"><strong>INFO</strong><span>UI scaffold: planned</span></p>
          <p class="developer-log-row"><strong>WAIT</strong><span>Import handling: metadata only until backend route is added</span></p>
          <p class="developer-log-row"><strong>WAIT</strong><span>Guided recording: uses future local capture route, not validated here</span></p>
          <p class="developer-log-row"><strong>WAIT</strong><span>Provider output: blocked until local runtime evidence exists</span></p>
        </div>
      </article>
    </div>
  `;
}

function bindAudioStudioViewEvents(): void {
  const fileInput = document.querySelector<HTMLInputElement>("#audioStudioFileInput");
  const importButton = document.querySelector<HTMLButtonElement>("#audioStudioImportButton");
  const guidedButton = document.querySelector<HTMLButtonElement>("#audioStudioGuidedButton");

  importButton?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => {
    const files = Array.from(fileInput.files ?? []);
    const names = files.map((file) => file.name).slice(0, 4).join(", ");
    setAssistantNotice(files.length > 0 ? `Audio Studio import staged: ${files.length} file(s). ${names}` : "No audio file selected.");
    fileInput.value = "";
  });

  guidedButton?.addEventListener("click", () => {
    setAssistantNotice(`Guided reading selected: ${READING_LINES[0].text}`);
  });

  document.querySelectorAll<HTMLButtonElement>(".audio-studio-use-line").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.readingIndex ?? 0);
      const line = READING_LINES[index] ?? READING_LINES[0];
      document.querySelectorAll(".audio-studio-reading-card").forEach((card) => card.classList.remove("active"));
      button.closest(".audio-studio-reading-card")?.classList.add("active");
      setAssistantNotice(`Guided reading line ready: ${line.text}`);
    });
  });
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
