import { icon } from "../shared/icons";
import type { AudioStudioValidationEvidence, HelperBridgeStatus, RuntimeSettings } from "../shared/types";
import { advancedEmpty, diagnosticActions, languageSelectField, monitoringPanel, outputRow, primaryButton, radioOption, selectButton, settingsActions, settingsCard, settingsField, settingsGrid, settingsPage, settingsSection, statusBadge } from "./uiPageFactory";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function barWidth(value: string): string {
  const match = value.match(/^(\d+)%$/);
  if (!match) return "0%";
  return `${Math.max(0, Math.min(100, Number(match[1])))}%`;
}
function progressPercent(value: number): number { return !Number.isFinite(value) ? 0 : Math.max(0, Math.min(100, Math.round(value))); }
function togglePill(active: boolean): string { return `<span class="settings-toggle-pill ${active ? "active" : ""}"><i></i></span>`; }
function safeTone(value = "neutral"): "neutral" | "good" | "warning" | "error" { return value === "good" || value === "warning" || value === "error" ? value : "neutral"; }
function statusRow(label: string, value: string, tone = "neutral"): string { return `<p class="developer-log-row"><strong>${escapeHtml(label)}</strong><span class="status-badge status-badge--${safeTone(tone)}">${escapeHtml(value)}</span></p>`; }

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
function helperControls(): string {
  return `<div class="settings-card-actions compact" aria-label="Helper bridge controls"><button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="start">Start Helper</button><button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="status">Worker Status</button><button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="preload-asr">Preload ASR</button><button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="preload-translation">Preload Translation</button><button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="tts-preflight">TTS Preflight</button><button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="synthesize-test">Synthesize Test</button><button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="stop">Stop Helper</button><button class="mic-test-button-v22 secondary" type="button" data-helper-bridge-action="cancel">Cancel Task</button></div>`;
}
function capturePreviewControls(): string {
  return `<div class="settings-card-actions compact" aria-label="Capture helper bridge preview controls"><button class="mic-test-button-v22 secondary" type="button" data-capture-bridge-action="start-preview">Preview Capture Start</button><button class="mic-test-button-v22 secondary" type="button" data-capture-bridge-action="stop-preview">Preview Capture Stop</button></div>`;
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

function statusField(label: string, value: string, tone: "neutral" | "good" | "warning" | "error" = "neutral"): string {
  return settingsField(label, `<div class="settings-status-row">${statusBadge(value, tone)}</div>`);
}

function voiceModeControls(): string {
  return `${radioOption("voiceModeToggleButton", "Click Toggle", "Click the microphone once to start, then click again to stop.", true, true).replace("id=\"voiceModeToggleButton\"", "id=\"voiceModeToggleButton\" data-voice-capture-mode=\"toggle\" aria-pressed=\"true\"")}${radioOption("voiceModePushToTalkButton", "Push to Talk", "Hold Ctrl+Space to record; release to stop and process locally.", false, true).replace("id=\"voiceModePushToTalkButton\"", "id=\"voiceModePushToTalkButton\" data-voice-capture-mode=\"push-to-talk\" aria-pressed=\"false\"")}`;
}

export function generalSettingsView(settings: RuntimeSettings, realtimeStatus: string | null, gpuStatus: string | null): string {
  const runtimeProfileLabel = settings.runtime_profile;
  const languageFocusLabel = settings.language_focus_mode === "id-en-focus" ? "ID/EN Focus" : settings.language_focus_mode === "general-focus" ? "General Focus" : settings.language_focus_mode;
  return settingsPage("General", "Basic launcher and local runtime preferences.", "settings-view--general", `${settingsCard("settings-card--general", `${settingsGrid(`${factorySelectField("Runtime Profile", runtimeProfileLabel, "pulse", "runtimeProfileButton")}${factorySelectField("Language Focus", languageFocusLabel, "chevron", "languageFocusButton")}${statusField("Realtime / Latency", realtimeStatus ?? "Checking", "neutral")}${statusField("GPU Policy", gpuStatus ?? "Checking", "neutral")}`)}${settingsActions(`${primaryButton("Save Settings", { id: "saveSettingsButton" })}${primaryButton("Reset Settings", { id: "resetSettingsButton", class: "secondary" })}`)}`)}${settingsSection("Advanced General Setting", "Advanced controls are intentionally hidden until they are connected to runtime-backed settings.")}${settingsCard("settings-card--diagnostic", `<p class="diagnostic-note">No placeholder buttons are exposed here. New controls must be connected to persisted settings before they appear.</p>`)}`);
}

export function audioSettingsView(settings: RuntimeSettings): string {
  const voiceEnabled = settings.audio.auto_play_out_voice;
  const realtimeActive = settings.runtime_profile !== "Quality";
  return settingsPage("Audio", "Manage microphone input, speaker output, volume, and voice behavior.", "settings-view--audio", `${settingsCard("settings-card--audio", `${settingsGrid(`${factorySelectField("Microphone", "Check microphone", "mic", "checkAudioInputButton")}${factorySelectField("Speaker", voiceEnabled ? "Voice output enabled" : "Voice output disabled", "speaker", "audioVoiceToggleButton")}${settingsField("Microphone Volume", '<div class="range-v22 mic-range"><span></span><i></i></div>', "Runtime meter only; device gain is managed by Windows for now.")}${settingsField("Speaker Volume", '<div class="range-v22 speaker-range"><span></span><i></i></div>', "Runtime meter only; output gain is managed by Windows for now.")}`)}<p class="diagnostic-note">Mic Test can now start microphone-only capture even when the full helper/model/provider pipeline is not ready. Full ASR > Translate > TTS still requires Start Helper and Worker Status.</p><div class="mic-test-row-v22">${primaryButton("Mic Test", { id: "micTestButton" })}<div class="meter-v22"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div>`)}${settingsSection("Voice", "Choose how TranslateIT starts and stops microphone capture.")}${settingsCard("settings-card--voice", settingsGrid(`${settingsField("Voice Profile", `${radioOption(null, "Normal", "Default microphone input without extra noise processing.", true)}${radioOption(null, "Noise", "Planned: reduce background noise and prioritize speech clarity.")}`, "Noise processing is visible as a planned feature until the DSP path is implemented.")}${settingsField("Voice Mode", voiceModeControls(), "Click Toggle is default. Push to Talk uses Ctrl+Space and does not activate while typing in text fields.")}`, true))}${settingsSection("Advanced Audio Setting", "Reserved controls are hidden until backed by runtime implementation.")}${settingsCard("settings-card--diagnostic", `<p class="diagnostic-note">Device list, sensitivity, and noise suppression will appear here only after they are connected to persisted runtime settings.</p>`)}`);
}

export function translateSettingsView(settings: RuntimeSettings, sourceLabel: string, targetLabel: string, activeSelector: "source" | "target" | null, languageOptions: { code: string; label: string }[]): string {
  const realtimeActive = settings.runtime_profile !== "Quality";
  const voiceEnabled = settings.audio.auto_play_out_voice;
  return settingsPage("Translate", "Configure language direction, translation speed, and output behavior.", "settings-view--translate", `${settingsCard("settings-card--language", `<div class="language-grid">${languageSelectField("Source Language", `<button id="sourceLanguageButton" class="select-field-v22" type="button" aria-expanded="${activeSelector === "source"}" style="grid-template-columns:minmax(0,1fr) 20px;"><span>${escapeHtml(sourceLabel)}</span>${icon("chevron")}</button>`, languageDropdown("source", activeSelector, settings.source_language, languageOptions))}<button id="swapLanguageButton" type="button" class="settings-swap-button" aria-label="Swap languages">${icon("swap")}</button>${languageSelectField("Target Language", `<button id="targetLanguageButton" class="select-field-v22" type="button" aria-expanded="${activeSelector === "target"}" style="grid-template-columns:minmax(0,1fr) 20px;"><span>${escapeHtml(targetLabel)}</span>${icon("chevron")}</button>`, languageDropdown("target", activeSelector, settings.target_language, languageOptions))}</div>${settingsActions(primaryButton("Save Translate", { id: "saveTranslateButton" }), true)}`)}${settingsSection("Realtime", "Choose how TranslateIT balances speed and translation quality.")}${settingsCard("settings-card--compact", settingsGrid(`${radioOption("realtimeModeButton", "Fast", "Prioritize low latency for live voice translation.", realtimeActive, true)}${radioOption("qualityModeButton", "Quality", "Prefer better translation quality when response time is less critical.", !realtimeActive, true)}`, true))}${settingsSection("Translate Output", "Choose which output should appear after translation completes.")}${settingsCard("settings-card--compact", settingsGrid(`${outputRow(icon("fileText"), "Transcript", "Show translated text in the conversation.", togglePill(true))}${outputRow(icon("speaker"), "Voice", "Play translated English voice automatically.", togglePill(voiceEnabled))}`, true))}${settingsSection("Advanced Translate Setting", "Reserved controls are hidden until backed by runtime implementation.")}${settingsCard("settings-card--diagnostic", `<p class="diagnostic-note">Dictionary, glossary, and prompt-style controls are intentionally not shown until the engine supports them.</p>`)}`);
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
  return settingsPage("Developer", "Simple tools for monitoring runtime health and fixing common issues.", "settings-view--developer", `${settingsSection("Monitoring", "Monitor hardware usage, latency, GPU policy, and engine health.", true)}${settingsCard("settings-card--monitoring", `${settingsGrid(`${monitoringPanel(icon("monitor"), "Hardware Usage", gpuStatus, `<div class="settings-bars"><div><strong>CPU</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${cpuWidth},#4b4f5d ${cpuWidth});"></span><em>${cpu}</em></div><div><strong>GPU</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${gpuWidth},#4b4f5d ${gpuWidth});"></span><em>${gpu}</em></div><div><strong>RAM</strong><span style="background:linear-gradient(90deg,#d6dbe3 ${ramWidth},#4b4f5d ${ramWidth});"></span><em>${ram}</em></div></div>`)}${monitoringPanel(icon("pulse"), "Health Engine", "Runtime policy and latency are shown in the top status pills.", `<div class="health-list"><section>${icon("monitor")}<div><strong>Launcher</strong><p>Desktop shell and UI route</p></div><span>Loaded</span></section><section>${icon("pulse")}<div><strong>Engine</strong><p>Translation, transcript, helper, and latency state</p></div><span>${engineStatus}</span></section></div>`)}`)}`)}${settingsSection("Architecture", "Current product boundary and runtime readiness semantics.")}${settingsCard("settings-card--diagnostic", `<div class="developer-log-body" aria-label="Architecture and runtime status">${statusRow("Shell", "Rust/Tauri final", "good")}${statusRow("Helper bridge", helperLabel(args.helperStatus), helperTone(args.helperStatus))}${statusRow("GPU policy", args.helperStatus?.cuda_ready ? "GPU primary candidate" : args.helperStatus?.degraded_mode ? "CPU fallback active" : "GPU not verified", args.helperStatus?.cuda_ready ? "good" : "warning")}${statusRow("Latency", "top status pill + latest evidence", "neutral")}${statusRow("Audio Studio metadata", "metadata_ready", "good")}${statusRow("Audio Studio provider", "provider depends on helper/model readiness", "warning")}</div><p class="diagnostic-note">${escapeHtml(args.helperStatus?.message ?? "Helper bridge status command has not returned yet.")}</p>${helperControls()}${capturePreviewControls()}`)}${settingsSection("Validation Evidence", "Latest Audio Studio local validation summary, if available.")}${settingsCard("settings-card--diagnostic", `<div class="developer-log-body" aria-label="Validation evidence status">${statusRow("Audio Studio evidence", evidenceLabel(evidence), evidenceTone(evidence))}${statusRow("Summary verifier", "npm run verify:audio-studio:summary <summary-json-path>", "neutral")}${statusRow("Architecture contracts", "npm run validate:architecture-contracts", "neutral")}</div><p class="diagnostic-note">${escapeHtml(evidenceDetail(evidence))}</p>`)}${settingsSection("Diagnostic", "Run checking, show current progress, and review diagnostic logs.")}${settingsCard("settings-card--diagnostic", `${diagnosticActions(primaryButton("Run Checking", { id: "runDiagnosticButton" }), "Checking translation engine", `${progress}%`)}<div class="progress-track"><span style="width:${progress}%;"></span></div><p class="diagnostic-note">${note}</p><section class="developer-log-card ${args.logsExpanded ? "expanded" : ""}"><header class="developer-log-header"><span>developer-log/latest</span><button id="seeAllLogsButton" type="button">${args.logsExpanded ? "Collapse" : "See All Logs"}</button></header><div class="developer-log-body" aria-label="Developer diagnostic logs">${styledLogRows}<p class="developer-log-summary">${escapeHtml(logSummary)}</p></div></section>`)}`);
}
