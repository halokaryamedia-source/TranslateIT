import { icon } from "../shared/icons";
import type { RuntimeSettings } from "../shared/types";
import { advancedEmpty, primaryButton, radioOption, selectButton, settingsActions, settingsCard, settingsField, settingsGrid, settingsPage, settingsSection } from "./uiPageFactory";

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

function pageStart(title: string, description: string, modifier: string): string {
  return `<div class="settings-view ${modifier}"><section class="settings-view-header"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></section>`;
}

function selectField(id: string | null, label: string, value: string, iconName?: "mic" | "speaker" | "pulse" | "monitor" | "chevron"): string {
  const idAttr = id ? ` id="${id}"` : "";
  const iconColumn = iconName ? `${icon(iconName)}` : "";
  const grid = iconName ? "24px minmax(0,1fr) 20px" : "minmax(0,1fr) 20px";
  return `<section class="settings-field"><h3>${escapeHtml(label)}</h3><button${idAttr} class="select-field-v22" type="button" style="grid-template-columns:${grid};">${iconColumn}<span>${escapeHtml(value)}</span>${icon("chevron")}</button></section>`;
}

function radioRow(id: string | null, title: string, description: string, active = false, asButton = false): string {
  const idAttr = id ? ` id="${id}"` : "";
  const tag = asButton ? "button" : "label";
  const typeAttr = asButton ? ' type="button"' : "";
  return `<${tag}${idAttr}${typeAttr} class="radio-row-v22 ${active ? "active" : ""}"><span></span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(description)}</em></${tag}>`;
}

function togglePill(active: boolean): string {
  return `<span class="settings-toggle-pill ${active ? "active" : ""}"><i></i></span>`;
}

function languageDropdown(role: "source" | "target", activeSelector: "source" | "target" | null, selectedCode: string, options: { code: string; label: string }[]): string {
  if (activeSelector !== role) return "";
  const items = options
    .map((item) => {
      const active = item.code.toLowerCase() === selectedCode.toLowerCase();
      return `<button class="language-option-button ${active ? "active" : ""}" type="button" data-language-role="${role}" data-language-code="${escapeHtml(item.code)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.code.toUpperCase())}</span></button>`;
    })
    .join("");
  return `<div class="language-dropdown-panel" role="listbox">${items}</div>`;
}

function factorySelectField(label: string, value: string, iconName: "pulse" | "monitor" | "chevron"): string {
  const grid = "24px minmax(0,1fr) 20px";
  const button = selectButton(label, value, { style: `grid-template-columns:${grid};` })
    .replace("<span>", `${icon(iconName)}<span>`)
    .replace("</button>", `${icon("chevron")}</button>`);
  return settingsField(label, button);
}

export function generalSettingsView(settings: RuntimeSettings, realtimeStatus: string | null, gpuStatus: string | null): string {
  return settingsPage("General", "Basic launcher and local runtime preferences.", "settings-view--general", `
    ${settingsCard("settings-card--general", `
      ${settingsGrid(`
        ${factorySelectField("Runtime Profile", settings.runtime_profile, "pulse")}
        ${factorySelectField("Language Focus", settings.language_focus_mode, "chevron")}
        ${factorySelectField("Realtime Status", realtimeStatus ?? "Checking", "pulse")}
        ${factorySelectField("GPU Status", gpuStatus ?? "Checking", "monitor")}
      `)}
      ${settingsActions(`${primaryButton("Save Settings", { id: "saveSettingsButton" })}${primaryButton("Save Default", { id: "resetSettingsButton", class: "secondary" })}`)}
    `)}
    ${settingsSection("Advanced General Setting", "Reserved for future launcher preferences.")}
    ${advancedEmpty()}
  `);
}

export function audioSettingsView(settings: RuntimeSettings): string {
  const voiceEnabled = settings.audio.auto_play_out_voice;
  const realtimeActive = settings.runtime_profile !== "Quality";
  return settingsPage("Audio", "Manage microphone input, speaker output, volume, and voice behavior.", "settings-view--audio", `
    ${settingsCard("settings-card--audio", `
      ${settingsGrid(`
        ${selectField("checkAudioInputButton", "Microphone", "Default microphone", "mic")}
        ${selectField("audioVoiceToggleButton", "Speaker", voiceEnabled ? "Default speaker" : "Speaker disabled", "speaker")}
        ${settingsField("Microphone Volume", '<div class="range-v22 mic-range"><span></span><i></i></div>')}
        ${settingsField("Speaker Volume", '<div class="range-v22 speaker-range"><span></span><i></i></div>')}
      `)}
      <div class="mic-test-row-v22">
        ${primaryButton("Mic Test", { id: "micTestButton" })}
        <div class="meter-v22">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
    `)}
    ${settingsSection("Voice", "Configure voice input behavior and input processing profile.")}
    ${settingsCard("settings-card--voice", `
      ${settingsGrid(`
        ${settingsField("Voice Profile", `${radioOption(null, "Normal", "Default microphone input without extra noise processing.", true)}${radioOption(null, "Noise", "Reduce background noise and prioritize speech clarity.")}`, "Choose the microphone processing profile.")}
        ${settingsField("Voice Mode", `${radioOption("audioSensitivityButton", "Always On", "Voice input stays ready while the app is active.", realtimeActive, true)}${radioOption(null, "Push to Talk", "Voice input only activates while holding a selected key.")}`, "Choose how TranslateIT listens to voice input.")}
      `)}
    `)}
    ${settingsSection("Advanced Audio Setting", "Reserved for future audio device options.")}
    ${advancedEmpty()}
  `);
}

export function translateSettingsView(settings: RuntimeSettings, sourceLabel: string, targetLabel: string, activeSelector: "source" | "target" | null, languageOptions: { code: string; label: string }[]): string {
  const realtimeActive = settings.runtime_profile !== "Quality";
  const voiceEnabled = settings.audio.auto_play_out_voice;
  return `${pageStart("Translate", "Configure language direction, translation speed, and output behavior.", "settings-view--translate")}
    <article class="settings-card settings-card--language">
      <div class="language-grid">
        <section class="settings-field language-block"><h3>Source Language</h3><button id="sourceLanguageButton" class="select-field-v22" type="button" aria-expanded="${activeSelector === "source"}" style="grid-template-columns:minmax(0,1fr) 20px;"><span>${escapeHtml(sourceLabel)}</span>${icon("chevron")}</button>${languageDropdown("source", activeSelector, settings.source_language, languageOptions)}</section>
        <button id="swapLanguageButton" type="button" class="settings-swap-button" aria-label="Swap languages">${icon("swap")}</button>
        <section class="settings-field language-block"><h3>Target Language</h3><button id="targetLanguageButton" class="select-field-v22" type="button" aria-expanded="${activeSelector === "target"}" style="grid-template-columns:minmax(0,1fr) 20px;"><span>${escapeHtml(targetLabel)}</span>${icon("chevron")}</button>${languageDropdown("target", activeSelector, settings.target_language, languageOptions)}</section>
      </div>
      <div class="settings-card-actions compact"><button id="saveTranslateButton" class="mic-test-button-v22" type="button">Save Translate</button></div>
    </article>
    <section class="settings-section-title"><h2>Realtime</h2><p>Choose how TranslateIT balances speed and translation quality.</p></section>
    <article class="settings-card settings-card--compact">
      <div class="settings-grid-2 compact-grid">
        ${radioRow("realtimeModeButton", "Fast", "Prioritize low latency for live voice translation.", realtimeActive, true)}
        ${radioRow("qualityModeButton", "Quality", "Prefer better translation quality when response time is less critical.", !realtimeActive, true)}
      </div>
    </article>
    <section class="settings-section-title"><h2>Translate Output</h2><p>Choose which output should appear after translation completes.</p></section>
    <article class="settings-card settings-card--compact">
      <div class="settings-grid-2 compact-grid">
        <section class="settings-output-row">${icon("fileText")}<div><h3>Transcript</h3><p>Show translated text in the conversation.</p></div>${togglePill(true)}</section>
        <section class="settings-output-row">${icon("speaker")}<div><h3>Voice</h3><p>Play translated English voice automatically.</p></div>${togglePill(voiceEnabled)}</section>
      </div>
    </article>
    <section class="settings-section-title"><h2>Advanced Translate Setting</h2><p>Reserved for future translation preferences.</p></section>
    <article class="advanced-empty-v22"></article>
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
  const cpu = escapeHtml(args.cpu);
  const gpu = escapeHtml(args.gpu);
  const ram = escapeHtml(args.ram);
  const gpuStatus = escapeHtml(args.gpuStatus);
  const note = escapeHtml(args.note);
  const cpuWidth = barWidth(args.cpu);
  const gpuWidth = barWidth(args.gpu);
  const ramWidth = barWidth(args.ram);
  const engineStatus = args.engineGood ? "Good" : "Check";
  const logSummary = args.logsExpanded ? "Showing all current diagnostic logs." : "Showing recent diagnostic logs.";
  const styledLogRows = args.logRows.replaceAll("<p>", '<p class="developer-log-row">').replaceAll("<strong>", '<strong>');

  return `${pageStart("Developer", "Simple tools for monitoring runtime health and fixing common issues.", "settings-view--developer")}
    <section class="settings-section-title first"><h2>Monitoring</h2><p>Monitor hardware usage and engine health.</p></section>
    <article class="settings-card settings-card--monitoring">
      <div class="settings-grid-2">
        <section class="settings-panel-heading">${icon("monitor")}<div><h3>Hardware Usage</h3><p>${gpuStatus}</p></div><div class="settings-bars"><div><strong>CPU</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${cpuWidth},#4b4f5d ${cpuWidth});"></span><em>${cpu}</em></div><div><strong>GPU</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${gpuWidth},#4b4f5d ${gpuWidth});"></span><em>${gpu}</em></div><div><strong>RAM</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${ramWidth},#4b4f5d ${ramWidth});"></span><em>${ram}</em></div></div></section>
        <section class="settings-panel-heading">${icon("pulse")}<div><h3>Health Engine</h3><p>Simple status for Launcher and Engine.</p></div><div class="health-list"><section>${icon("monitor")}<div><strong>Launcher</strong><p>Desktop shell and UI route</p></div><span>Good</span></section><section>${icon("pulse")}<div><strong>Engine</strong><p>Translation, transcript, and worker state</p></div><span>${engineStatus}</span></section></div></section>
      </div>
    </article>
    <section class="settings-section-title"><h2>Diagnostic</h2><p>Run checking, show current progress, and review diagnostic logs.</p></section>
    <article class="settings-card settings-card--diagnostic">
      <div class="diagnostic-actions"><button id="runDiagnosticButton" class="mic-test-button-v22" type="button">Run Checking</button><div><strong>Checking translation engine</strong><span>${progress}%</span></div></div>
      <div class="progress-track"><span style="width:${progress}%;"></span></div>
      <p class="diagnostic-note">${note}</p>
      <section class="developer-log-card ${args.logsExpanded ? "expanded" : ""}">
        <header class="developer-log-header"><span>developer-log/latest</span><button id="seeAllLogsButton" type="button">${args.logsExpanded ? "Collapse" : "See All Logs"}</button></header>
        <div class="developer-log-body" aria-label="Developer diagnostic logs">${styledLogRows}<p class="developer-log-summary">${escapeHtml(logSummary)}</p></div>
      </section>
    </article>
  </div>`;
}
