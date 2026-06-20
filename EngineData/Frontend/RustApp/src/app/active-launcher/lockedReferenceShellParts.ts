import { icon } from "../shared/icons";

type MainNavItem = {
  id: string;
  icon: "clock" | "file" | "folder" | "shield";
  label: string;
};

type SettingsNavItem = {
  tab: "general" | "audio" | "translate" | "developer";
  icon: "sliders" | "speaker" | "translate" | "code";
  label: string;
};

const RECENT_CHAT_ITEMS: MainNavItem[] = [
  { id: "recentChatButton", icon: "clock", label: "Recent Chat" },
  { id: "unsavedChatButton", icon: "file", label: "Unsaved Chat" },
];

const WORKSPACE_ITEMS: MainNavItem[] = [
  { id: "savedChatButton", icon: "folder", label: "Saved Chat" },
  { id: "localDataButton", icon: "shield", label: "Local Data" },
];

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { tab: "general", icon: "sliders", label: "General" },
  { tab: "audio", icon: "speaker", label: "Audio" },
  { tab: "translate", icon: "translate", label: "Translate" },
  { tab: "developer", icon: "code", label: "Developer" },
];

function mainNavButton(item: MainNavItem): string {
  return `<button id="${item.id}" class="nav-item" type="button">${icon(item.icon)}<span>${item.label}</span>${icon("chevron")}</button>`;
}

function settingsNavButton(item: SettingsNavItem): string {
  const activeClass = item.tab === "general" ? " active" : "";
  return `<button class="settings-nav-item${activeClass}" data-settings-tab="${item.tab}" type="button">${icon(item.icon)}<span>${item.label}</span></button>`;
}

export function lockedWarmupScreen(): string {
  return `<section id="warmupScreen" class="warmup-screen">
      <div class="warmup-card">
        <div class="warmup-brand"><div class="brand-orb">T</div><div><p>TRANSLATEIT</p><h1>Preparing local voice translation</h1></div></div>
        <p id="warmupDetail" class="warmup-detail">Starting desktop shell...</p>
        <p id="startupTraceLine" class="warmup-trace">Startup trace pending.</p>
        <div class="warmup-meter"><div id="warmupFill" class="warmup-fill"></div></div>
        <div class="warmup-meta"><span id="warmupPercent">0%</span><span>Release-first startup</span></div>
        <ol id="warmupSteps" class="warmup-steps"></ol>
      </div>
    </section>`;
}

export function lockedMainSidebar(): string {
  return `<aside class="sidebar">
        <section class="brand-row"><div class="brand-mark">T</div><div><h1>TRANSLATEIT</h1><p>Local voice translation</p></div></section>
        <button id="newChatButton" class="new-chat-button" type="button">${icon("plus")}<span>New Chat</span></button>
        <nav class="nav-stack">
          <p class="nav-heading">Recent Chat</p>
          ${RECENT_CHAT_ITEMS.map(mainNavButton).join("")}
          <div class="nav-divider"></div>
          <p class="nav-heading">Workspace</p>
          ${WORKSPACE_ITEMS.map(mainNavButton).join("")}
        </nav>
        <section class="account-card">
          <div class="avatar">HK</div><div class="account-text"><strong>Marcel Berc...</strong><span id="userPresence">Invisible</span></div>
          <div class="account-actions">
            <button id="quickMicButton" class="footer-icon danger" type="button" aria-label="Toggle microphone">${icon("micOff")}</button>
            <button id="micOptionsButton" class="footer-dropdown danger" type="button" aria-label="Open microphone settings">${icon("chevron")}</button>
            <button id="voiceOutputButton" class="footer-icon danger" type="button" aria-label="Toggle voice output">${icon("headphonesOff")}</button>
            <button id="voiceOptionsButton" class="footer-dropdown danger" type="button" aria-label="Open voice settings">${icon("chevron")}</button>
            <button id="settingsButton" class="footer-icon settings-action" type="button" aria-label="Open settings">${icon("settings")}</button>
          </div>
        </section>
      </aside>`;
}

export function lockedHomeWorkspace(): string {
  return `<section id="homePage" class="workspace">
        <header class="topbar"><div><h2>Voice translation</h2><p>Speak Indonesian. Get translated English voice output.</p></div><div class="top-actions"><span id="directionPill" class="direction-pill">ID &gt; EN</span><button id="recordStatusButton" class="record-pill" type="button"><span></span><strong id="recordStatusText">Ready</strong></button></div></header>
        <section class="hero-panel">
          <span class="hero-kicker">Local-first voice translation</span>
          <h3 id="heroTitle">How can I help translate today?</h3>
          <p id="heroSubtitle">Type a message, or press the microphone button on the right to record speech locally.</p>
          <div id="chatList" class="feature-grid"></div>
          <article class="assistant-card"><div class="mini-brand">T</div><div><strong>TranslateIT</strong><p id="assistantMessage">Local runtime is checking. You can type text or record a clear voice sample after warmup.</p><div id="voiceCaptureActions" class="assistant-actions"><button id="checkMicButton" class="assistant-action" type="button">Check Microphone</button><button id="startHelperButton" class="assistant-action" type="button">Start Helper</button><button id="checkWorkerStatusButton" class="assistant-action" type="button">Check Worker Status</button><button id="openDeveloperDiagnosticsButton" class="assistant-action" type="button">Open Developer Diagnostics</button></div></div></article>
        </section>
        <section class="composer-wrap"><input id="attachmentInput" class="attachment-input" type="file" accept=".txt,.md,.json,.csv,.tsv,.log,.xml,.yaml,.yml,.srt,.vtt,text/plain,text/markdown,application/json,text/csv,text/tab-separated-values,text/xml,application/xml,application/yaml,text/yaml" multiple aria-hidden="true" tabindex="-1" /><div class="composer"><button id="composerPlusButton" class="composer-icon" type="button" aria-label="Attach text files">${icon("plus")}</button><textarea id="messageInput" placeholder="Ask anything..." autocomplete="off" maxlength="2000" rows="1" aria-label="Text to translate" style="field-sizing: content;"></textarea><button id="microphoneButton" class="composer-icon emphasis" type="button" aria-label="Start voice recording">${icon("mic")}</button><button id="sendButton" class="send-button" type="button" aria-label="Send text">${icon("arrowUp")}</button></div><p class="composer-help">Type a message, or press the microphone button on the right to record speech locally.</p></section>
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
