import { icon } from "../shared/icons";
import type { RuntimeSettings } from "../shared/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function barWidth(value: string): string {
  return /^\d+%$/.test(value) ? value : "0%";
}

function progressPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeMarker(value: number): number {
  return Math.max(4, Math.min(96, value));
}

function pageStart(title: string, description: string, minHeight: number): string {
  return `<div class="settings-final-page" style="position:relative;height:${minHeight}px;"><section class="settings-final-title"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></section>`;
}

function selectField(id: string | null, label: string, value: string, iconName?: "mic" | "speaker" | "pulse" | "monitor" | "chevron"): string {
  const idAttr = id ? ` id="${id}"` : "";
  const iconColumn = iconName ? `${icon(iconName)}` : "";
  const grid = iconName ? "24px minmax(0,1fr) 20px" : "minmax(0,1fr) 20px";
  return `<section class="settings-field"><h3>${escapeHtml(label)}</h3><button${idAttr} class="select-field-v22" type="button" style="width:100%;grid-template-columns:${grid};">${iconColumn}<span>${escapeHtml(value)}</span>${icon("chevron")}</button></section>`;
}

function radioRow(id: string | null, title: string, description: string, active = false, asButton = false): string {
  const idAttr = id ? ` id="${id}"` : "";
  const tag = asButton ? "button" : "label";
  const typeAttr = asButton ? ' type="button"' : "";
  return `<${tag}${idAttr}${typeAttr} class="radio-row-v22 ${active ? "active" : ""}" ${asButton ? 'style="width:100%;"' : ""}><span></span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(description)}</em></${tag}>`;
}

function togglePill(active: boolean): string {
  return `<span class="settings-toggle-pill ${active ? "active" : ""}"><i></i></span>`;
}

export function generalSettingsView(settings: RuntimeSettings, realtimeStatus: string | null, gpuStatus: string | null): string {
  return `${pageStart("General", "Basic launcher and local runtime preferences.", 720)}
    <article class="settings-card final-card" style="top:118px;height:330px;">
      <div class="settings-grid-2">
        ${selectField(null, "Runtime Profile", settings.runtime_profile, "pulse")}
        ${selectField(null, "Language Focus", settings.language_focus_mode, "chevron")}
        ${selectField(null, "Realtime Status", realtimeStatus ?? "Checking", "pulse")}
        ${selectField(null, "GPU Status", gpuStatus ?? "Checking", "monitor")}
      </div>
      <button id="saveSettingsButton" class="mic-test-button-v22" type="button" style="position:absolute;left:74px;bottom:46px;width:176px;">Save Settings</button>
      <button id="resetSettingsButton" class="mic-test-button-v22" type="button" style="position:absolute;left:274px;bottom:46px;width:176px;">Save Default</button>
    </article>
    <section class="settings-section-title" style="top:548px;"><h2>Advanced General Setting</h2><p>Reserved for future launcher preferences.</p></section>
    <article class="advanced-empty-v22" style="position:absolute;left:0;top:638px;height:180px;margin:0;"></article>
  </div>`;
}

export function audioSettingsView(settings: RuntimeSettings): string {
  const voiceEnabled = settings.audio.auto_play_out_voice;
  const realtimeActive = settings.runtime_profile !== "Quality";
  return `${pageStart("Audio", "Manage microphone input, speaker output, volume, and voice behavior.", 1360)}
    <article class="settings-card final-card" style="top:118px;height:450px;">
      <div class="settings-grid-2">
        ${selectField("checkAudioInputButton", "Microphone", "Default microphone", "mic")}
        ${selectField("audioVoiceToggleButton", "Speaker", voiceEnabled ? "Default speaker" : "Speaker disabled", "speaker")}
        <section class="settings-field"><h3>Microphone Volume</h3><div class="range-v22 mic-range"><span></span><i></i></div></section>
        <section class="settings-field"><h3>Speaker Volume</h3><div class="range-v22 speaker-range"><span></span><i></i></div></section>
      </div>
      <button id="micTestButton" class="mic-test-button-v22" type="button" style="position:absolute;left:74px;bottom:42px;width:176px;">Mic Test</button>
      <div class="meter-v22" style="position:absolute;left:298px;right:74px;bottom:50px;">
        <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
    </article>
    <section class="settings-section-title" style="top:652px;"><h2>Voice</h2><p>Configure voice input behavior and input processing profile.</p></section>
    <article class="settings-card final-card" style="top:742px;height:330px;">
      <div class="settings-grid-2">
        <section class="settings-field"><h3>Voice Profile</h3><p>Choose the microphone processing profile.</p>${radioRow(null, "Normal", "Default microphone input without extra noise processing.", true)}${radioRow(null, "Noise", "Reduce background noise and prioritize speech clarity.")}</section>
        <section class="settings-field"><h3>Voice Mode</h3><p>Choose how TranslateIT listens to voice input.</p>${radioRow("audioSensitivityButton", "Always On", "Voice input stays ready while the app is active.", realtimeActive, true)}${radioRow(null, "Push to Talk", "Voice input only activates while holding a selected key.")}</section>
      </div>
    </article>
    <section class="settings-section-title" style="top:1162px;"><h2>Advanced Audio Setting</h2><p>Reserved for future audio device options.</p></section>
    <article class="advanced-empty-v22" style="position:absolute;left:0;top:1252px;height:180px;margin:0;"></article>
  </div>`;
}

export function translateSettingsView(settings: RuntimeSettings, sourceLabel: string, targetLabel: string): string {
  const realtimeActive = settings.runtime_profile !== "Quality";
  const voiceEnabled = settings.audio.auto_play_out_voice;
  return `${pageStart("Translate", "Configure language direction, translation speed, and output behavior.", 1340)}
    <article class="settings-card final-card" style="top:118px;height:190px;">
      <section class="settings-field" style="position:absolute;left:74px;top:48px;width:500px;"><h3>Source Language</h3><button class="select-field-v22" type="button" style="width:100%;grid-template-columns:minmax(0,1fr) 20px;"><span>${escapeHtml(sourceLabel)}</span>${icon("chevron")}</button></section>
      <button id="swapLanguageButton" type="button" class="settings-swap-button" aria-label="Swap languages">${icon("swap")}</button>
      <section class="settings-field" style="position:absolute;left:746px;top:48px;width:500px;"><h3>Target Language</h3><button class="select-field-v22" type="button" style="width:100%;grid-template-columns:minmax(0,1fr) 20px;"><span>${escapeHtml(targetLabel)}</span>${icon("chevron")}</button></section>
      <button id="saveTranslateButton" type="button" style="display:none;">Save</button>
    </article>
    <section class="settings-section-title" style="top:408px;"><h2>Realtime</h2><p>Choose how TranslateIT balances speed and translation quality.</p></section>
    <article class="settings-card final-card" style="top:498px;height:166px;">
      <div class="settings-grid-2 compact-grid">
        ${radioRow("realtimeModeButton", "Fast", "Prioritize low latency for live voice translation.", realtimeActive, true)}
        ${radioRow("qualityModeButton", "Quality", "Prefer better translation quality when response time is less critical.", !realtimeActive, true)}
      </div>
    </article>
    <section class="settings-section-title" style="top:760px;"><h2>Translate Output</h2><p>Choose which output should appear after translation completes.</p></section>
    <article class="settings-card final-card" style="top:850px;height:176px;">
      <div class="settings-grid-2 compact-grid">
        <section class="settings-output-row">${icon("fileText")}<div><h3>Transcript</h3><p>Show translated text in the conversation.</p></div>${togglePill(true)}</section>
        <section class="settings-output-row">${icon("speaker")}<div><h3>Voice</h3><p>Play translated English voice automatically.</p></div>${togglePill(voiceEnabled)}</section>
      </div>
    </article>
    <section class="settings-section-title" style="top:1120px;"><h2>Advanced Translate Setting</h2><p>Reserved for future translation preferences.</p></section>
    <article class="advanced-empty-v22" style="position:absolute;left:0;top:1210px;height:170px;margin:0;"></article>
  </div>`;
}

export function developerSettingsView(args: {
  progress: number;
  cpu: string;
  ram: string;
  gpu: string;
  gpuStatus: string;
  logRows: string;
  note: string;
  logsExpanded: boolean;
  engineGood: boolean;
}): string {
  const progress = progressPercent(args.progress);
  const marker = safeMarker(progress);
  const cpu = escapeHtml(args.cpu);
  const gpu = escapeHtml(args.gpu);
  const ram = escapeHtml(args.ram);
  const gpuStatus = escapeHtml(args.gpuStatus);
  const note = escapeHtml(args.note);
  const cpuWidth = barWidth(args.cpu);
  const gpuWidth = barWidth(args.gpu);
  const ramWidth = barWidth(args.ram);
  const engineStatus = args.engineGood ? "Good" : "Check";
  const logHeight = args.logsExpanded ? 320 : 176;
  const logOverflow = args.logsExpanded ? "auto" : "hidden";
  const logSummary = args.logsExpanded ? "Showing all current diagnostic logs." : "Showing recent diagnostic logs.";
  const styledLogRows = args.logRows.replaceAll("<p>", '<p style="margin:0;color:var(--text);font-size:12.5px;font-weight:750;">').replaceAll("<strong>", '<strong style="display:inline-block;width:64px;color:var(--muted);font-weight:850;">');

  return `${pageStart("Developer", "Simple tools for monitoring runtime health and fixing common issues.", 1710)}
    <section class="settings-section-title" style="top:132px;"><h2>Monitoring</h2><p>Monitor hardware usage and engine health.</p></section>
    <article class="settings-card final-card" style="top:212px;height:330px;">
      <div class="settings-grid-2">
        <section class="settings-panel-heading">${icon("monitor")}<div><h3>Hardware Usage</h3><p>${gpuStatus}</p></div><div class="settings-bars"><div><strong>CPU</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${cpuWidth},#4b4f5d ${cpuWidth});"></span><em>${cpu}</em></div><div><strong>GPU</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${gpuWidth},#4b4f5d ${gpuWidth});"></span><em>${gpu}</em></div><div><strong>RAM</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${ramWidth},#4b4f5d ${ramWidth});"></span><em>${ram}</em></div></div></section>
        <section class="settings-panel-heading">${icon("pulse")}<div><h3>Health Engine</h3><p>Simple status for Launcher and Engine.</p></div><div class="health-list"><section>${icon("monitor")}<div><strong>Launcher</strong><p>Desktop shell and UI route</p></div><span>Good</span></section><section>${icon("pulse")}<div><strong>Engine</strong><p>Translation, transcript, and worker state</p></div><span>${engineStatus}</span></section></div></section>
      </div>
    </article>
    <section class="settings-section-title" style="top:626px;"><h2>Diagnostic</h2><p>Run checking, show current progress, and review diagnostic logs in one table.</p></section>
    <article class="settings-card final-card" style="top:706px;height:622px;">
      <section class="diagnostic-head">${icon("check")}<div><h3>Run Diagnostic</h3><p>Check launcher, audio device, translation engine, transcript, and local worker.</p></div><button id="runDiagnosticButton" type="button">Run Checking</button></section>
      <section class="diagnostic-progress"><div><strong>Checking translation engine</strong><span>Running</span></div><p>${note}</p><div class="progress-line"><i></i><b style="width:${progress}%;"></b><em style="left:calc(${marker}% - 5px);"></em><strong style="left:calc(${marker}% - 28px);">${progress}%</strong></div></section>
      <div class="diagnostic-divider"></div>
      <section class="diagnostic-log-title">${icon("logs")}<div><h3>Log Diagnostic</h3><p>${logSummary}</p></div></section>
      <section class="diagnostic-log-panel" style="height:${logHeight}px;overflow:${logOverflow};"><header><span><i></i><i></i><i></i></span><strong>developer-log/latest</strong><button id="seeAllLogsButton" type="button">${icon("maximize")}<span>${args.logsExpanded ? "Show Less" : "See All Logs"}</span></button></header><div class="developer-log-body">${styledLogRows}</div></section>
    </article>
    <section class="settings-section-title" style="top:1450px;"><h2>Advanced Developer Setting</h2><p>Reserved for future developer options.</p></section>
    <article class="advanced-empty-v22" style="position:absolute;left:0;top:1530px;height:170px;margin:0;"></article>
  </div>`;
}
