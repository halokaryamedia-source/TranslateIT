import { icon } from "../shared/icons";
import type { AudioStudioValidationEvidence, HelperBridgeStatus, RuntimeSettings } from "../shared/types";
import { advancedEmpty, diagnosticActions, languageSelectField, monitoringPanel, outputRow, primaryButton, radioOption, selectButton, settingsActions, settingsCard, settingsField, settingsGrid, settingsPage, settingsSection } from "./uiPageFactory";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function barWidth(value: string): string { return /^\d+%$/.test(value) ? value : "0%"; }
function progressPercent(value: number): number { return !Number.isFinite(value) ? 0 : Math.max(0, Math.min(100, Math.round(value))); }
function togglePill(active: boolean): string { return `<span class="settings-toggle-pill ${active ? "active" : ""}"><i></i></span>`; }
function statusRow(label: string, value: string, tone = "neutral"): string { return `<p class="developer-log-row"><strong>${escapeHtml(label)}</strong><span class="status-badge status-badge--${escapeHtml(tone)}">${escapeHtml(value)}</span></p>`; }

function helperTone(helperStatus: HelperBridgeStatus | null): string {
  if (!helperStatus) return "warning";
  if (helperStatus.state === "error" || helperStatus.state === "blocked") return "error";
  if (helperStatus.provider_ready && helperStatus.cuda_ready) return "good";
  if (helperStatus.provider_ready || helperStatus.state === "ready" || helperStatus.degraded_mode) return "warning";
  return "warning";
}

function helperLabel(helperStatus: HelperBridgeStatus | null): string {
  if (!helperStatus) return "status unavailable";
  const provider = helperStatus.provider_ready ? "provider ready" : "provider pending";
  const cuda = helperStatus.cuda_ready ? "CUDA ready" : "CUDA not verified";
  return `${helperStatus.state} / ${provider} / ${cuda}`;
}
function evidenceTone(evidence: AudioStudioValidationEvidence | null): string { return evidence?.ok ? "good" : "warning"; }
function evidenceLabel(evidence: AudioStudioValidationEvidence | null): string { return evidence ? evidence.stage : "not loaded"; }
function evidenceDetail(evidence: AudioStudioValidationEvidence | null): string {
  if (!evidence) return "Run Checking to refresh Audio Studio validation evidence.";
  if (evidence.ok) return evidence.summary_path ?? "Audio Studio validation summary loaded.";
  return evidence.blocker ?? evidence.evidence_dir ?? "Audio Studio validation evidence is unavailable.";
}

function languageDropdown(role: "source" | "target", activeSelector: "source" | "target" | null, selectedCode: string, options: { code: string; label: string }[]): string {
  if (activeSelector !== role) return "";
  const items = options.map((item) => `<button class="language-option-button ${item.code.toLowerCase() === selectedCode.toLowerCase() ? "active" : ""}" type="button" data-language-role="${role}" data-language-code="${escapeHtml(item.code)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.code.toUpperCase())}</span></button>`).join("");
  return `<div class="language-dropdown-panel" role="listbox">${items}</div>`;
}

function factorySelectField(label: string, value: string, iconName: "mic" | "speaker" | "pulse" | "monitor" | "chevron", id?: string): string {
  const grid = "24px minmax(0,1fr) 20px";
  const button = selectButton(label, value, { ...(id ? { id } : {}), style: `grid-template-columns:${grid};` }).replace("<span>", `${icon(iconName)}<span>`).replace("</button>", `${icon("chevron")}</button>`);
  return settingsField(label, button);
}

export function generalSettingsView(settings: RuntimeSettings, realtimeStatus: string | null, gpuStatus: string | null): string {
  return settingsPage("General", "Basic launcher and local runtime preferences.", "settings-view--general", `${settingsCard("settings-card--general", `${settingsGrid(`${factorySelectField("Runtime Profile", settings.runtime_profile, "pulse")}${factorySelectField("Language Focus", settings.language_focus_mode, "chevron")}${factorySelectField("Realtime Status", realtimeStatus ?? "Checking", "pulse")}${factorySelectField("GPU Status", gpuStatus ?? "Checking", "monitor")}`)}${settingsActions(`${primaryButton("Save Settings", { id: "saveSettingsButton" })}${primaryButton("Save Default", { id: "resetSettingsButton", class: "secondary" })}`)}`)}${settingsSection("Advanced General Setting", "Reserved for future launcher preferences.")}${advancedEmpty()}`);
}

export function audioSettingsView(settings: RuntimeSettings): string {
  const voiceEnabled = settings.audio.auto_play_out_voice;
  const realtimeActive = settings.runtime_profile !== "Quality";
  return settingsPage("Audio", "Manage microphone input, speaker output, volume, and voice behavior.", "settings-view--audio", `${settingsCard("settings-card--audio", `${settingsGrid(`${factorySelectField("Microphone", "Choose microphone", "mic", "checkAudioInputButton")}${factorySelectField("Speaker", voiceEnabled ? "Choose speaker" : "Enable speaker", "speaker", "audioVoiceToggleButton")}${settingsField("Microphone Volume", '<div class="range-v22 mic-range"><span></span><i></i></div>')}${settingsField("Speaker Volume", '<div class="range-v22 speaker-range"><span></span><i></i></div>')}`)}<div class="mic-test-row-v22">${primaryButton("Mic Test", { id: "micTestButton" })}<div class="meter-v22"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div>`)}${settingsSection("Voice", "Configure voice input behavior and input processing profile.")}${settingsCard("settings-card--voice", settingsGrid(`${settingsField("Voice Profile", `${radioOption(null, "Normal", "Default microphone input without extra noise processing.", true)}${radioOption(null, "Noise", "Reduce background noise and prioritize speech clarity.")}`, "Choose the microphone processing profile.")}${settingsField("Voice Mode", `${radioOption("audioSensitivityButton", "Always On", "Voice input stays ready while the app is active.", realtimeActive, true)}${radioOption(null, "Push to Talk", "Voice input only activates while holding a selected key.")}`, "Choose how TranslateIT listens to voice input.")}`))}${settingsSection("Advanced Audio Setting", "Reserved for future audio device options.")}${advancedEmpty()}`);
}

export function translateSettingsView(settings: RuntimeSettings, sourceLabel: string, targetLabel: string, activeSelector: "source" | "target" | null, languageOptions: { code: string; label: string }[]): string {
  const realtimeActive = settings.runtime_profile !== "Quality";
  const voiceEnabled = settings.audio.auto_play_out_voice;
  return settingsPage("Translate", "Configure language direction, translation speed, and output behavior.", "settings-view--translate", `${settingsCard("settings-card--language", `<div class="language-grid">${languageSelectField("Source Language", `<button id="sourceLanguageButton" class="select-field-v22" type="button" aria-expanded="${activeSelector === "source"}" style="grid-template-columns:minmax(0,1fr) 20px;"><span>${escapeHtml(sourceLabel)}</span>${icon("chevron")}</button>`, languageDropdown("source", activeSelector, settings.source_language, languageOptions))}<button id="swapLanguageButton" type="button" class="settings-swap-button" aria-label="Swap languages">${icon("swap")}</button>${languageSelectField("Target Language", `<button id="targetLanguageButton" class="select-field-v22" type="button" aria-expanded="${activeSelector === "target"}" style="grid-template-columns:minmax(0,1fr) 20px;"><span>${escapeHtml(targetLabel)}</span>${icon("chevron")}</button>`, languageDropdown("target", activeSelector, settings.target_language, languageOptions))}</div>${settingsActions(primaryButton("Save Translate", { id: "saveTranslateButton" }), true)}`)}${settingsSection("Realtime", "Choose how TranslateIT balances speed and translation quality.")}${settingsCard("settings-card--compact", settingsGrid(`${radioOption("realtimeModeButton", "Fast", "Prioritize low latency for live voice translation.", realtimeActive, true)}${radioOption("qualityModeButton", "Quality", "Prefer better translation quality when response time is less critical.", !realtimeActive, true)}`, true))}${settingsSection("Translate Output", "Choose which output should appear after translation completes.")}${settingsCard("settings-card--compact", settingsGrid(`${outputRow(icon("fileText"), "Transcript", "Show translated text in the conversation.", togglePill(true))}${outputRow(icon("speaker"), "Voice", "Play translated English voice automatically.", togglePill(voiceEnabled))}`, true))}${settingsSection("Advanced Translate Setting", "Reserved for future translation preferences.")}${advancedEmpty()}`);
}

export function developerSettingsView(args: { progress: number; cpu: string; ram: string; gpu: string; gpuStatus: string; logRows: string; note: string; logsExpanded: boolean; engineGood: boolean; helperStatus: HelperBridgeStatus | null; audioStudioEvidence?: AudioStudioValidationEvidence | null; }): string {
  const progress = progressPercent(args.progress);
  const cpu = escapeHtml(args.cpu);
  const gpu = escapeHtml(args.gpu);
  const ram = escapeHtml(args.ram);
  const gpuStatus = escapeHtml(args.gpuStatus);
  const note = escapeHtml(args.note);
  const cpuWidth = barWidth(args.cpu);
  const gpuWidth = barWidth(args.gpu);
  const ramWidth = barWidth(args.ram);
  const engineStatus = args.engineGood ? "Loaded" : "Check";
  const logSummary = args.logsExpanded ? "Showing all current diagnostic logs." : "Showing recent diagnostic logs.";
  const styledLogRows = args.logRows.replaceAll("<p>", '<p class="developer-log-row">').replaceAll("<strong>", '<strong>');
  const evidence = args.audioStudioEvidence ?? null;
  return settingsPage("Developer", "Simple tools for monitoring runtime health and fixing common issues.", "settings-view--developer", `${settingsSection("Monitoring", "Monitor hardware usage and engine health.", true)}${settingsCard("settings-card--monitoring", `${settingsGrid(`${monitoringPanel(icon("monitor"), "Hardware Usage", gpuStatus, `<div class="settings-bars"><div><strong>CPU</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${cpuWidth},#4b4f5d ${cpuWidth});"></span><em>${cpu}</em></div><div><strong>GPU</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${gpuWidth},#4b4f5d ${gpuWidth});"></span><em>${gpu}</em></div><div><strong>RAM</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${ramWidth},#4b4f5d ${ramWidth});"></span><em>${ram}</em></div></div>`)}${monitoringPanel(icon("pulse"), "Health Engine", "Simple status for Launcher and Engine.", `<div class="health-list"><section>${icon("monitor")}<div><strong>Launcher</strong><p>Desktop shell and UI route</p></div><span>Loaded</span></section><section>${icon("pulse")}<div><strong>Engine</strong><p>Translation, transcript, and worker state</p></div><span>${engineStatus}</span></section></div>`)}`)}`)}${settingsSection("Architecture", "Current product boundary and runtime readiness semantics.")}${settingsCard("settings-card--diagnostic", `<div class="developer-log-body" aria-label="Architecture and runtime status">${statusRow("Shell", "Rust/Tauri final", "good")}${statusRow("Helper bridge", helperLabel(args.helperStatus), helperTone(args.helperStatus))}${statusRow("Audio Studio metadata", "metadata_ready", "good")}${statusRow("Audio Studio provider", "provider_blocked", "warning")}${statusRow("CUDA/provider fallback", args.helperStatus?.degraded_mode ? "degraded mode visible" : "must be visible before runtime ready", "warning")}</div><p class="diagnostic-note">${escapeHtml(args.helperStatus?.message ?? "Helper bridge status command has not returned yet.")}</p>`)}${settingsSection("Validation Evidence", "Latest Audio Studio local validation summary, if available.")}${settingsCard("settings-card--diagnostic", `<div class="developer-log-body" aria-label="Validation evidence status">${statusRow("Audio Studio evidence", evidenceLabel(evidence), evidenceTone(evidence))}${statusRow("Summary verifier", "npm run verify:audio-studio:summary <summary-json-path>", "neutral")}${statusRow("Architecture contracts", "npm run validate:architecture-contracts", "neutral")}</div><p class="diagnostic-note">${escapeHtml(evidenceDetail(evidence))}</p>`)}${settingsSection("Diagnostic", "Run checking, show current progress, and review diagnostic logs.")}${settingsCard("settings-card--diagnostic", `${diagnosticActions(primaryButton("Run Checking", { id: "runDiagnosticButton" }), "Checking translation engine", `${progress}%`)}<div class="progress-track"><span style="width:${progress}%;"></span></div><p class="diagnostic-note">${note}</p><section class="developer-log-card ${args.logsExpanded ? "expanded" : ""}"><header class="developer-log-header"><span>developer-log/latest</span><button id="seeAllLogsButton" type="button">${args.logsExpanded ? "Collapse" : "See All Logs"}</button></header><div class="developer-log-body" aria-label="Developer diagnostic logs">${styledLogRows}<p class="developer-log-summary">${escapeHtml(logSummary)}</p></div></section>`)}`);
}
