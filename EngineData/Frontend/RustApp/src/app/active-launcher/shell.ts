import { icon } from "../shared/icons";

export function mountAppShell(app: HTMLElement): void {
  app.innerHTML = `
    <section id="warmupScreen" class="warmup-screen">
      <div class="warmup-card">
        <div class="warmup-brand"><div class="brand-orb">T</div><div><p>TRANSLATEIT</p><h1>Preparing your translation workspace</h1></div></div>
        <p id="warmupDetail" class="warmup-detail">Starting desktop app...</p>
        <p id="startupTraceLine" class="warmup-trace">Startup trace pending.</p>
        <div class="warmup-meter"><div id="warmupFill" class="warmup-fill"></div></div>
        <div class="warmup-meta"><span id="warmupPercent">0%</span><span>Local runtime check</span></div>
        <ol id="warmupSteps" class="warmup-steps"></ol>
      </div>
    </section>
    <main id="mainApp" class="app-shell is-hidden">
      <aside class="sidebar">
        <section class="brand-row"><div class="brand-mark">T</div><div><h1>TRANSLATEIT</h1><p>Text and voice translation</p></div></section>
        <button id="newChatButton" class="new-chat-button" type="button">${icon("plus")}<span>New translation</span></button>
        <nav class="nav-stack" aria-label="Main navigation">
          <p class="nav-heading">Chats</p>
          <button id="recentChatButton" class="nav-item" type="button">${icon("clock")}<span>Recent</span>${icon("chevron")}</button>
          <button id="unsavedChatButton" class="nav-item nav-item--secondary" type="button">${icon("file")}<span>Drafts</span>${icon("chevron")}</button>
          <div class="nav-divider"></div>
          <p class="nav-heading">Library</p>
          <button id="savedChatButton" class="nav-item" type="button">${icon("folder")}<span>Saved</span>${icon("chevron")}</button>
          <button id="localDataButton" class="nav-item nav-item--secondary" type="button">${icon("shield")}<span>Local files</span>${icon("chevron")}</button>
        </nav>
        <section class="account-card" aria-label="Quick controls">
          <div class="avatar">HK</div><div class="account-text"><strong>Workspace</strong><span id="userPresence">Local mode</span></div>
          <div class="account-actions">
            <button id="quickMicButton" class="footer-icon danger" type="button" aria-label="Start or stop microphone recording">${icon("micOff")}</button>
            <button id="micOptionsButton" class="footer-dropdown danger" type="button" aria-label="Open microphone settings">${icon("chevron")}</button>
            <button id="voiceOutputButton" class="footer-icon danger" type="button" aria-label="Turn translated voice output on or off">${icon("headphonesOff")}</button>
            <button id="voiceOptionsButton" class="footer-dropdown danger" type="button" aria-label="Open voice output settings">${icon("chevron")}</button>
            <button id="settingsButton" class="footer-icon settings-action" type="button" aria-label="Open settings">${icon("settings")}</button>
          </div>
        </section>
      </aside>
      <section id="homePage" class="workspace">
        <header class="topbar"><div><h2>Translate</h2><p>Use text for quick translation, or microphone for voice translation.</p></div><div class="top-actions"><span id="directionPill" class="direction-pill">ID &gt; EN</span><button id="recordStatusButton" class="record-pill" type="button"><span></span><strong id="recordStatusText">Ready</strong></button></div></header>
        <section class="hero-panel">
          <span class="hero-kicker">Local-first translation</span>
          <h3 id="heroTitle">What do you want to translate?</h3>
          <p id="heroSubtitle">Type text below, or use the microphone button when you want to translate speech.</p>
          <div id="chatList" class="feature-grid"></div>
          <article class="assistant-card"><div class="mini-brand">T</div><div><strong>TranslateIT Assistant</strong><p id="assistantMessage">Ready for text translation. For voice, check the microphone once before recording.</p><div id="voiceCaptureActions" class="assistant-actions"><button id="checkMicButton" class="assistant-action" type="button">Check mic</button><button id="startHelperButton" class="assistant-action" type="button">Start voice engine</button><button id="checkWorkerStatusButton" class="assistant-action" type="button">Worker status</button><button id="openDeveloperDiagnosticsButton" class="assistant-action assistant-action--advanced" type="button">Diagnostics</button></div></div></article>
        </section>
        <section class="composer-wrap"><input id="attachmentInput" class="attachment-input" type="file" accept=".txt,.md,.json,.csv,.tsv,.log,.xml,.yaml,.yml,.srt,.vtt,text/plain,text/markdown,application/json,text/csv,text/tab-separated-values,text/xml,application/xml,application/yaml,text/yaml" multiple aria-hidden="true" tabindex="-1" /><div class="composer"><button id="composerPlusButton" class="composer-icon" type="button" aria-label="Attach text files">${icon("plus")}</button><textarea id="messageInput" placeholder="Type text to translate..." autocomplete="off" maxlength="2000" rows="1" aria-label="Text to translate" style="field-sizing: content;"></textarea><button id="microphoneButton" class="composer-icon emphasis" type="button" aria-label="Start voice recording">${icon("mic")}</button><button id="sendButton" class="send-button" type="button" aria-label="Translate text">${icon("arrowUp")}</button></div><p class="composer-help">Press Enter to translate text. Use the microphone for voice input.</p></section>
      </section>
      <section id="settingsPage" class="settings-page is-hidden" aria-label="Settings page">
        <aside class="settings-sidebar"><h2>Settings</h2><nav class="settings-nav-v22"><button class="settings-nav-item active" data-settings-tab="general" type="button">${icon("sliders")}<span>General</span></button><button class="settings-nav-item" data-settings-tab="audio" type="button">${icon("speaker")}<span>Audio</span></button><button class="settings-nav-item" data-settings-tab="translate" type="button">${icon("translate")}<span>Translate</span></button><button class="settings-nav-item" data-settings-tab="developer" type="button">${icon("code")}<span>Developer</span></button></nav></aside>
        <section class="settings-workspace-v22"><header class="settings-topbar-v22"><button id="backHomeButton" class="settings-back-button" type="button">${icon("back")}<span>Back</span></button></header><div id="settingsContent" class="settings-scroll-v22"></div></section>
      </section>
      <div class="runtime-sinks" aria-hidden="true"><span id="realtimeStatus">Checking</span><span id="qualityStatus">Checking</span><span id="gpuStatus">Checking</span><pre id="developerOutput">Runtime status will appear here after warmup.</pre></div>
    </main>`;
}

export function homeDefaultCards(): string {
  return `<article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("keyboard")}</div><h4>Text translation</h4></div><p>Type or paste text, then press Enter or the send button. The result appears in the conversation area.</p></article><article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("mic")}</div><h4>Voice translation</h4></div><p>Click the microphone, speak one clear sentence, then click again to stop and process locally.</p></article>`;
}
