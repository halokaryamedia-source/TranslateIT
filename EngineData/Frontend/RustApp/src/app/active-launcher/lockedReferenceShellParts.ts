import { icon } from "../shared/icons";

type SettingsNavItem = {
  tab: "general" | "audio" | "translate" | "developer";
  icon: "sliders" | "speaker" | "translate" | "code";
  label: string;
};

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { tab: "general", icon: "sliders", label: "General" },
  { tab: "translate", icon: "translate", label: "Translate" },
  { tab: "audio", icon: "speaker", label: "Audio" },
  { tab: "developer", icon: "code", label: "Developer" },
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
        <section class="brand-row"><div class="brand-mark">T</div><div><h1>TRANSLATEIT</h1><p>Local translation app</p></div></section>
        <button id="newChatButton" class="new-chat-button" type="button">${icon("plus")}<span>New translation</span></button>
        <nav class="nav-stack compact-nav" aria-label="App navigation">
          <button id="recentChatButton" class="nav-item" type="button">${icon("clock")}<span>History</span>${icon("chevron")}</button>
          <button id="savedChatButton" class="nav-item" type="button">${icon("folder")}<span>Saved</span>${icon("chevron")}</button>
          <button id="localDataButton" class="nav-item" type="button">${icon("shield")}<span>Local data</span>${icon("chevron")}</button>
          <button id="unsavedChatButton" class="nav-item is-utility-hidden" type="button" aria-hidden="true" tabindex="-1">${icon("file")}<span>Drafts</span>${icon("chevron")}</button>
        </nav>
        <section class="account-card compact-account">
          <div class="avatar">HK</div><div class="account-text"><strong>Local runtime</strong><span id="userPresence">Checking</span></div>
          <div class="account-actions">
            <button id="settingsButton" class="footer-icon settings-action" type="button" aria-label="Open settings">${icon("settings")}</button>
          </div>
        </section>
        <div class="hidden-control-sink" aria-hidden="true">
          <button id="quickMicButton" type="button" tabindex="-1">Quick mic</button>
          <button id="micOptionsButton" type="button" tabindex="-1">Mic options</button>
          <button id="voiceOutputButton" type="button" tabindex="-1">Voice output</button>
          <button id="voiceOptionsButton" type="button" tabindex="-1">Voice options</button>
        </div>
      </aside>`;
}

export function lockedHomeWorkspace(): string {
  return `<section id="homePage" class="workspace simple-workspace">
        <header class="topbar simple-topbar"><div><h2>Translate text</h2><p>Type text, choose direction, and get a local translation result.</p></div><div class="top-actions"><span id="directionPill" class="direction-pill">ID &gt; EN</span><button id="recordStatusButton" class="record-pill" type="button"><span></span><strong id="recordStatusText">Idle</strong></button></div></header>
        <section class="simple-translate-grid">
          <article class="simple-translate-card">
            <div class="simple-card-heading"><span class="hero-kicker">Main workflow</span><h3 id="heroTitle">Translate with local engine</h3><p id="heroSubtitle">Text translation is the primary flow. Voice tools stay secondary until the engine is ready.</p></div>
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
            <article class="assistant-card simple-status-card"><div class="mini-brand">T</div><div><strong>Engine status</strong><p id="assistantMessage">Checking local engine. Text translation can be tested even while voice setup is incomplete.</p><div id="voiceCaptureActions" class="assistant-actions simple-setup-actions"><button id="startHelperButton" class="assistant-action" type="button">Start Helper</button><button id="checkWorkerStatusButton" class="assistant-action" type="button">Check Worker</button><button id="checkMicButton" class="assistant-action secondary" type="button">Check Mic</button><button id="openDeveloperDiagnosticsButton" class="assistant-action secondary" type="button">Diagnostics</button></div></div></article>
            <article class="simple-voice-card"><div><strong>Voice capture</strong><p>Use this only after helper, microphone, and models are ready.</p></div><button id="microphoneButton" class="assistant-action secondary" type="button">Start voice</button></article>
          </aside>
        </section>
        <section id="chatList" class="simple-result-area" aria-label="Translation result"></section>
      </section>`;
}

export function lockedSettingsPage(): string {
  return `<section id="settingsPage" class="settings-page is-hidden" aria-label="Settings page">
        <aside class="settings-sidebar"><h2>Settings</h2><nav class="settings-nav-v22">${SETTINGS_NAV_ITEMS.map(settingsNavButton).join("")}</nav></aside>
        <section class="settings-workspace-v22"><header class="settings-topbar-v22"><button id="backHomeButton" class="settings-back-button" type="button">${icon("back")}<span>Back</span></button></header><div id="settingsContent" class="settings-scroll-v22"></div></section>
      </section>`;
}

export function lockedRuntimeSinks(): string {
  return `<div class="runtime-sinks" aria-hidden="true"><span id="realtimeStatus">Checking</span><span id="qualityStatus">Checking</span><span id="gpuStatus">Checking</span><pre id="developerOutput">Runtime status will appear here after warmup.</pre></div>`;
}
