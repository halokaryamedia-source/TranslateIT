import { icon } from "../shared/icons";

type SettingsNavItem = {
  tab: "general" | "audio" | "translate" | "developer";
  icon: "sliders" | "speaker" | "translate" | "code";
  label: string;
};

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { tab: "general", icon: "sliders", label: "General" },
  { tab: "translate", icon: "translate", label: "Translation" },
  { tab: "audio", icon: "speaker", label: "Audio" },
  { tab: "developer", icon: "code", label: "Advanced" },
];

function settingsNavButton(item: SettingsNavItem): string {
  const activeClass = item.tab === "general" ? " active" : "";
  return `<button class="settings-nav-item${activeClass}" data-settings-tab="${item.tab}" type="button">${icon(item.icon)}<span>${item.label}</span></button>`;
}

export function lockedWarmupScreen(): string {
  return `<section id="warmupScreen" class="warmup-screen">
      <div class="warmup-card">
        <div class="warmup-brand"><div class="brand-orb">T</div><div><p>TRANSLATEIT</p><h1>Preparing local translator</h1></div></div>
        <p id="warmupDetail" class="warmup-detail">Starting desktop runtime...</p>
        <p id="startupTraceLine" class="warmup-trace">Startup trace pending.</p>
        <div class="warmup-meter"><div id="warmupFill" class="warmup-fill"></div></div>
        <div class="warmup-meta"><span id="warmupPercent">0%</span><span>Local-first translator</span></div>
        <ol id="warmupSteps" class="warmup-steps"></ol>
      </div>
    </section>`;
}

export function lockedMainSidebar(): string {
  return `<aside class="sidebar simple-sidebar">
        <section class="brand-row"><div class="brand-mark">T</div><div><h1>TRANSLATEIT</h1><p>Local meeting translator</p></div></section>
        <nav class="nav-stack compact-nav" aria-label="Primary navigation">
          <button id="meetingNavButton" class="nav-item active" data-workspace-nav="meeting" type="button" aria-current="page">${icon("mic")}<span>Meeting</span>${icon("chevron")}</button>
          <button id="textNavButton" class="nav-item" data-workspace-nav="text" type="button">${icon("translate")}<span>Text</span>${icon("chevron")}</button>
          <button id="historyNavButton" class="nav-item" data-workspace-nav="history" type="button">${icon("clock")}<span>History</span>${icon("chevron")}</button>
          <button id="settingsButton" class="nav-item" type="button">${icon("settings")}<span>Settings</span>${icon("chevron")}</button>
        </nav>
        <section class="account-card compact-account">
          <div class="avatar">HK</div><div class="account-text"><strong>Local runtime</strong><span id="userPresence">Checking</span></div>
        </section>
      </aside>`;
}

export function lockedHomeWorkspace(): string {
  return `<section id="homePage" class="workspace simple-workspace">
        <header class="topbar simple-topbar"><div><h2 id="workspaceTitle">Meeting</h2><p id="assistantMessage">Checking meeting readiness...</p></div><div class="top-actions"><span id="directionPill" class="direction-pill">ID &gt; EN</span><span class="record-pill"><span></span><strong id="recordStatusText">Checking</strong></span></div></header>

        <section id="meetingWorkspace" data-workspace-panel="meeting">
          <section class="simple-translate-grid">
            <article class="simple-translate-card">
              <div class="simple-card-heading"><span class="hero-kicker">Primary workspace</span><h3 id="heroTitle">Meeting translation</h3><p id="heroSubtitle">TranslateIT is checking the local capabilities required for Meeting Voice.</p></div>
              <div class="assistant-actions simple-setup-actions">
                <button id="retryReadinessButton" class="assistant-action secondary" type="button">Retry</button>
                <button id="fixSetupButton" class="assistant-action" type="button">Fix Setup</button>
                <button id="openDeveloperDiagnosticsButton" class="assistant-action secondary" type="button">Open Diagnostics</button>
              </div>
              <p class="composer-help">Meeting Voice stays unavailable until the required local runtime and meeting route report readiness.</p>
            </article>
            <aside class="simple-status-column">
              <article class="assistant-card simple-status-card"><div class="mini-brand">T</div><div><strong>Meeting Voice</strong><p id="qualityStatus">Checking</p><p>Translated English voice is the meeting output. Raw microphone audio is not presented as the meeting output.</p></div></article>
              <article class="simple-voice-card"><div><strong>Current scope</strong><p>This screen reports product readiness and recovery. Session Listening and meeting-route runtime behavior are not claimed ready unless the runtime gate says so.</p></div></article>
            </aside>
          </section>
        </section>

        <section id="textWorkspace" class="is-hidden" data-workspace-panel="text" hidden>
          <section class="simple-translate-grid">
            <article class="simple-translate-card">
              <div class="simple-card-heading"><span class="hero-kicker">Standalone workflow</span><h3>Translate text</h3><p>Translate Indonesian and English text with the current local translation runtime.</p></div>
              <input id="attachmentInput" class="attachment-input" type="file" accept=".txt,.md,.json,.csv,.tsv,.log,.xml,.yaml,.yml,.srt,.vtt,text/plain,text/markdown,application/json,text/csv,text/tab-separated-values,text/xml,application/xml,application/yaml,text/yaml" multiple aria-hidden="true" tabindex="-1" />
              <div class="simple-composer">
                <textarea id="messageInput" placeholder="Type or paste text to translate..." autocomplete="off" maxlength="2000" rows="6" aria-label="Text to translate"></textarea>
                <div class="simple-composer-actions">
                  <button id="composerPlusButton" class="assistant-action secondary" type="button">Attach text</button>
                  <button id="sendButton" class="send-button simple-send-button" type="button">Translate</button>
                </div>
              </div>
              <p class="composer-help">Press Enter to translate. Use Shift + Enter for a new line.</p>
            </article>
            <aside class="simple-status-column">
              <article class="assistant-card simple-status-card"><div class="mini-brand">T</div><div><strong>Text readiness</strong><p id="realtimeStatus">Checking</p><p>Runtime blockers are reported with the translation result instead of being hidden.</p></div></article>
            </aside>
          </section>
          <section id="chatList" class="simple-result-area" aria-label="Translation result"></section>
        </section>

        <section id="historyWorkspace" class="is-hidden" data-workspace-panel="history" hidden>
          <section class="simple-translate-grid"><article class="simple-translate-card"><div class="simple-card-heading"><span class="hero-kicker">Unavailable</span><h3>History</h3><p>Local History is a first-class product surface, but its final persistence controls are not connected to this shell yet.</p></div></article><aside class="simple-status-column"><article class="simple-voice-card"><div><strong>Status</strong><p>Unavailable. No history completeness is claimed from this placeholder.</p></div></article></aside></section>
        </section>
      </section>`;
}

export function lockedSettingsPage(): string {
  return `<section id="settingsPage" class="settings-page is-hidden" aria-label="Settings page">
        <aside class="settings-sidebar"><h2>Settings</h2><nav class="settings-nav-v22">${SETTINGS_NAV_ITEMS.map(settingsNavButton).join("")}</nav></aside>
        <section class="settings-workspace-v22"><header class="settings-topbar-v22"><button id="backHomeButton" class="settings-back-button" type="button">${icon("back")}<span>Back to app</span></button></header><div id="settingsContent" class="settings-scroll-v22"></div></section>
      </section>`;
}

export function lockedRuntimeSinks(): string {
  return `<div class="runtime-sinks" aria-hidden="true"><span id="gpuStatus">Checking</span><pre id="developerOutput">Runtime status will appear here after warmup.</pre></div>`;
}
