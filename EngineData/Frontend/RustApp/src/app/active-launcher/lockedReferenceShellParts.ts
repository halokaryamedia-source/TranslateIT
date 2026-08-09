import { icon } from "../shared/icons";

type SettingsNavItem = {
  tab: "meeting" | "history" | "advanced";
  icon: "mic" | "clock" | "code";
  label: string;
};

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { tab: "meeting", icon: "mic", label: "Meeting" },
  { tab: "history", icon: "clock", label: "History & Privacy" },
  { tab: "advanced", icon: "code", label: "Advanced" },
];

function settingsNavButton(item: SettingsNavItem): string {
  const activeClass = item.tab === "meeting" ? " active" : "";
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
          <section class="meeting-ready-layout">
            <article class="meeting-ready-panel" aria-labelledby="meetingReadyTitle">
              <div class="meeting-ready-heading">
                <div class="meeting-ready-status-line">
                  <span class="hero-kicker">Meeting translation</span>
                  <span id="meetingReadinessStatus" class="meeting-ready-status" data-tone="neutral">Checking</span>
                </div>
                <h3 id="meetingReadyTitle">Speak Indonesian. Your meeting hears English.</h3>
                <p>Indonesian speech becomes English voice. Incoming English can appear as Indonesian text when available.</p>
              </div>

              <div class="meeting-ready-rows" role="list" aria-label="Meeting setup summary">
                <section class="meeting-ready-row" role="listitem">
                  <div class="meeting-ready-row-copy">
                    <span>Your microphone</span>
                    <strong id="meetingInputDeviceValue">Windows Default</strong>
                    <small>The microphone you speak into.</small>
                  </div>
                  <span id="meetingInputDeviceStatus" class="meeting-row-status" data-tone="neutral">Checking</span>
                </section>

                <section class="meeting-ready-row" role="listitem">
                  <div class="meeting-ready-row-copy">
                    <span>Incoming translation</span>
                    <strong>English → Indonesian text</strong>
                    <small id="meetingSoundDeviceValue">Meeting sound: Windows Default</small>
                  </div>
                  <span class="meeting-row-status" data-tone="warning">Not connected yet</span>
                </section>

                <section class="meeting-ready-row" role="listitem">
                  <div class="meeting-ready-row-copy">
                    <span>Meeting microphone</span>
                    <strong>TranslateIT Meeting Microphone</strong>
                    <small>Select this microphone inside Zoom, Meet, Teams, or another meeting app.</small>
                  </div>
                  <span id="meetingRouteStatus" class="meeting-row-status" data-tone="neutral">Checking</span>
                </section>
              </div>

              <div class="meeting-ready-preferences" aria-label="Meeting translation preferences">
                <div><span>Mode</span><strong>Realtime</strong></div>
                <div><span>Tone</span><strong>Auto</strong></div>
              </div>

              <div class="meeting-ready-actions">
                <button id="startTranslationButton" class="send-button meeting-start-button" type="button" aria-describedby="startTranslationHint" disabled>Start Translation</button>
                <div class="meeting-ready-secondary-actions">
                  <button id="retryReadinessButton" class="assistant-action secondary" type="button">Retry</button>
                  <button id="fixSetupButton" class="assistant-action secondary" type="button">Fix Setup</button>
                </div>
                <p id="startTranslationHint" class="composer-help">Complete Meeting setup before Start Translation can be used.</p>
              </div>

              <p class="meeting-ready-reminder">In your meeting app, choose <strong>TranslateIT Meeting Microphone</strong> as your microphone.</p>
            </article>
          </section>
        </section>

        <section id="textWorkspace" class="is-hidden" data-workspace-panel="text" hidden>
          <section class="text-translator-layout" aria-labelledby="textTranslatorTitle">
            <header class="text-translator-heading">
              <div>
                <span class="hero-kicker">Text translation</span>
                <h3 id="textTranslatorTitle">Translate Indonesian and English text.</h3>
                <p>Type or paste text, translate explicitly, then review or edit the result.</p>
              </div>
              <span class="text-readiness-badge"><span>Text</span><strong id="realtimeStatus">Checking</strong></span>
            </header>

            <div class="text-language-bar" aria-label="Text translation direction">
              <div class="text-language-side">
                <span>Source</span>
                <strong id="textSourceLanguage">Indonesian</strong>
              </div>
              <button id="textSwapLanguageButton" class="text-swap-button" type="button" aria-label="Swap source and target languages">${icon("swap")}<span>Swap</span></button>
              <div class="text-language-side text-language-side--target">
                <span>Target</span>
                <strong id="textTargetLanguage">English</strong>
              </div>
            </div>

            <div class="text-pane-grid">
              <label class="text-pane" for="messageInput">
                <span class="text-pane-label">Source text</span>
                <textarea id="messageInput" placeholder="Type or paste text to translate..." autocomplete="off" maxlength="2000" rows="10" aria-label="Source text"></textarea>
              </label>

              <label class="text-pane text-pane--target" for="textTargetOutput">
                <div class="text-pane-title-row">
                  <span class="text-pane-label">Translation</span>
                  <strong id="textResultStatus" class="text-result-status" data-state="idle">Ready</strong>
                </div>
                <textarea id="textTargetOutput" placeholder="Translation will appear here." rows="10" aria-label="Translated text"></textarea>
              </label>
            </div>

            <div class="text-translator-footer">
              <div class="text-context-summary" aria-label="Text translation preferences">
                <span>Mode <strong id="textModeValue">Checking</strong></span>
                <span>Tone <strong>Auto</strong></span>
              </div>
              <button id="sendButton" class="send-button simple-send-button" type="button">Translate</button>
            </div>

            <p id="textResultMessage" class="text-result-message" aria-live="polite">Type or paste text, then select Translate.</p>
            <p class="composer-help">Press Ctrl + Enter to translate. Text files and document attachments are not part of this workflow.</p>
          </section>
        </section>

        <section id="historyWorkspace" class="is-hidden" data-workspace-panel="history" hidden>
          <section class="history-layout" aria-labelledby="historyWorkspaceTitle">
            <header class="history-heading">
              <div>
                <span class="hero-kicker">History</span>
                <h3 id="historyWorkspaceTitle">Recent and saved translations.</h3>
                <p>Review local Meeting and Text activity without turning previous conversations into translation context.</p>
              </div>
              <p id="historyRetentionNote" class="history-retention-note">History is on. New completed translations can be kept in Recent.</p>
            </header>

            <div class="history-tabs" role="tablist" aria-label="History collection">
              <button id="historyRecentTab" class="history-tab active" type="button" role="tab" aria-selected="true">Recent</button>
              <button id="historySavedTab" class="history-tab" type="button" role="tab" aria-selected="false">Saved</button>
            </div>

            <section id="historyCollectionView" class="history-collection-view">
              <div class="history-toolbar">
                <input id="historySearchInput" class="history-search-input" type="search" placeholder="Search history..." aria-label="Search history" autocomplete="off" />
                <div class="history-filters" aria-label="History type filter">
                  <button class="history-filter active" data-history-filter="all" type="button">All</button>
                  <button class="history-filter" data-history-filter="meeting" type="button">Meeting</button>
                  <button class="history-filter" data-history-filter="text" type="button">Text</button>
                </div>
              </div>
              <div id="historyCollection" class="history-list" aria-live="polite"></div>
            </section>

            <section id="historyDetailView" class="history-detail-view" hidden>
              <button id="historyBackButton" class="history-back-button" type="button">${icon("back")}<span>Back to History</span></button>
              <header class="history-detail-header">
                <div>
                  <span id="historyDetailKicker" class="hero-kicker">Text</span>
                  <h3 id="historyDetailTitle">Text Translation</h3>
                  <p id="historyDetailMeta"></p>
                </div>
                <button id="historyDetailActionButton" class="assistant-action secondary" type="button">Save</button>
              </header>
              <div id="historyDetailBody" class="history-detail-body"></div>
              <p id="historyDetailMessage" class="history-detail-message" aria-live="polite"></p>
            </section>
          </section>
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