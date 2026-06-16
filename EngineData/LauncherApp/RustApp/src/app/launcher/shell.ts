import { icon } from "../shared/icons";

export function mountAppShell(app: HTMLElement): void {
  app.innerHTML = `
    <section id="warmupScreen" class="warmup-screen">
      <div class="warmup-card">
        <div class="warmup-brand"><div class="brand-orb">T</div><div><p>TRANSLATEIT</p><h1>Preparing local voice translation</h1></div></div>
        <p id="warmupDetail" class="warmup-detail">Starting desktop shell...</p>
        <div class="warmup-meter"><div id="warmupFill" class="warmup-fill"></div></div>
        <div class="warmup-meta"><span id="warmupPercent">0%</span><span>Release-first startup</span></div>
        <ol id="warmupSteps" class="warmup-steps"></ol>
      </div>
    </section>
    <main id="mainApp" class="app-shell is-hidden">
      <aside class="sidebar">
        <section class="brand-row"><div class="brand-mark">T</div><div><h1>TRANSLATEIT</h1><p>Local voice translation</p></div></section>
        <button id="newChatButton" class="new-chat-button" type="button">${icon("plus")}<span>New Chat</span></button>
        <nav class="nav-stack">
          <p class="nav-heading">Recent Chat</p>
          <button id="recentChatButton" class="nav-item" type="button">${icon("clock")}<span>Recent Chat</span>${icon("chevron")}</button>
          <button id="unsavedChatButton" class="nav-item" type="button">${icon("file")}<span>Unsaved Chat</span>${icon("chevron")}</button>
          <div class="nav-divider"></div>
          <p class="nav-heading">Workspace</p>
          <button id="savedChatButton" class="nav-item" type="button">${icon("folder")}<span>Saved Chat</span>${icon("chevron")}</button>
          <button id="localDataButton" class="nav-item" type="button">${icon("shield")}<span>Local Data</span>${icon("chevron")}</button>
        </nav>
        <section class="account-card">
          <div class="avatar">HK</div><div class="account-text"><strong>Halo Karya</strong><span id="userPresence">Checking</span></div>
          <div class="account-actions">
            <button id="quickMicButton" class="footer-icon" type="button" aria-label="Toggle microphone">${icon("micOff")}</button>
            <button id="micOptionsButton" class="footer-dropdown" type="button" aria-label="Open microphone settings">${icon("chevron")}</button>
            <button id="voiceOutputButton" class="footer-icon" type="button" aria-label="Toggle voice output">${icon("headphonesOff")}</button>
            <button id="voiceOptionsButton" class="footer-dropdown" type="button" aria-label="Open voice settings">${icon("chevron")}</button>
            <button id="settingsButton" class="footer-icon settings-action" type="button" aria-label="Open settings">${icon("settings")}</button>
          </div>
        </section>
      </aside>
      <section id="homePage" class="workspace">
        <header class="topbar"><div><h2>Voice translation</h2><p>Speak Indonesian. Get translated English voice output.</p></div><div class="top-actions"><span id="directionPill" class="direction-pill">ID &gt; EN</span><button id="recordStatusButton" class="record-pill" type="button"><span></span><strong id="recordStatusText">Ready</strong></button></div></header>
        <section class="hero-panel">
          <span class="hero-kicker">Local-first voice translation</span>
          <h3 id="heroTitle">How can I help translate today?</h3>
          <p id="heroSubtitle">Type a message, or press the microphone button on the right to record speech locally.</p>
          <div id="chatList" class="feature-grid"></div>
          <article class="assistant-card"><div class="mini-brand">T</div><div><strong>TranslateIT</strong><p id="assistantMessage">Startup warmup completed. Local runtime status is being checked.</p></div></article>
        </section>
        <section class="composer-wrap"><input id="attachmentInput" class="attachment-input" type="file" accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json,text/csv" aria-hidden="true" tabindex="-1" /><div class="composer"><button id="composerPlusButton" class="composer-icon" type="button" aria-label="Attach text file">${icon("plus")}</button><input id="messageInput" type="text" placeholder="Type Indonesian text to translate..." autocomplete="off" maxlength="2000" aria-label="Text to translate" /><button id="microphoneButton" class="composer-icon emphasis" type="button" aria-label="Start voice recording">${icon("mic")}</button><button id="sendButton" class="send-button" type="button" aria-label="Send text">${icon("arrowUp")}</button></div><p class="composer-help">Type up to 2000 characters, attach a text file, or press the microphone button on the right to record speech locally.</p></section>
      </section>
      <section id="settingsPage" class="settings-page is-hidden">
        <aside class="settings-sidebar"><h2>Settings</h2><nav class="settings-nav-v22"><button class="settings-nav-item active" data-settings-tab="general" type="button">${icon("sliders")}<span>General</span></button><button class="settings-nav-item" data-settings-tab="audio" type="button">${icon("speaker")}<span>Audio</span></button><button class="settings-nav-item" data-settings-tab="translate" type="button">${icon("translate")}<span>Translate</span></button><button class="settings-nav-item" data-settings-tab="developer" type="button">${icon("code")}<span>Developer</span></button></nav></aside>
        <section class="settings-workspace-v22"><header class="settings-topbar-v22"><button id="backHomeButton" class="settings-back-button" type="button">${icon("back")}<span>Back</span></button></header><div id="settingsContent" class="settings-scroll-v22"></div></section>
      </section>
      <div class="runtime-sinks" aria-hidden="true"><span id="realtimeStatus">Checking</span><span id="qualityStatus">Checking</span><span id="gpuStatus">Checking</span><pre id="developerOutput">Runtime status will appear here after warmup.</pre></div>
    </main>`;
}

export function homeDefaultCards(): string {
  return `<article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("keyboard")}</div><h4>Text input</h4></div><p>Type or paste Indonesian text and get an English translation in the conversation.</p></article><article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("mic")}</div><h4>Voice input</h4></div><p>Press the microphone button. A recording indicator appears while voice capture is active.</p></article>`;
}
