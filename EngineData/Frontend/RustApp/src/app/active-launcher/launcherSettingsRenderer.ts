import { runtimeProductFacade, type ProductAudioDeviceKind } from "../bridge/runtimeProductFacade";
import type { AudioDeviceListReport, RuntimeSettings } from "../shared/types";
import { requireElement } from "./dom";
import {
  primaryButton,
  settingsActions,
  settingsCard,
  settingsField,
  settingsGrid,
  settingsPage,
  settingsSection,
  statusBadge,
} from "./uiPageFactory";

type SettingsRenderRefs = {
  settingsContent: HTMLElement;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function deviceLabel(value: string | null | undefined): string {
  const clean = String(value ?? "").trim();
  return clean || "Windows Default";
}

function statusValue(value: string, tone: "neutral" | "good" | "warning" | "error" = "neutral"): string {
  return `<div class="settings-status-row">${statusBadge(value, tone)}</div>`;
}

function deviceSelect(id: string, current: string | null | undefined, label: string): string {
  const currentValue = String(current ?? "").trim();
  const currentOption = currentValue
    ? `<option value="${escapeHtml(currentValue)}" selected>${escapeHtml(currentValue)}</option>`
    : "";
  return `<select id="${id}" class="select-field-v22" aria-label="${escapeHtml(label)}"><option value=""${currentValue ? "" : " selected"}>Windows Default</option>${currentOption}</select>`;
}

function meetingSettingsView(settings: RuntimeSettings): string {
  const microphone = settings.audio.input_device_id;
  const meetingSound = settings.audio.output_device_id;
  return settingsPage(
    "Meeting",
    "Configure the audio and setup TranslateIT uses for meetings.",
    "settings-view--meeting",
    `${settingsSection("Meeting preferences", "Keep normal meeting controls simple and product-level.", true)}${settingsCard(
      "settings-card--meeting",
      `${settingsGrid(
        `${settingsField("Speaking mode", statusValue("Session Listening"), "Default meeting mode. Push-to-Talk remains the secondary interaction mode.")}${settingsField("Your microphone", deviceSelect("meetingMicrophoneSelect", microphone, "Your microphone"), "Choose Windows Default or pin one microphone. A candidate is checked before the preference is replaced.")}${settingsField("Meeting sound", deviceSelect("meetingSoundSelect", meetingSound, "Meeting sound"), "Choose where you listen to meetings. The output endpoint is checked before it is saved; incoming translation remains a separate capability.")}${settingsField("Meeting microphone", statusValue("TranslateIT Meeting Microphone"), "Managed by TranslateIT and selected as the microphone inside the meeting application.")}`,
      )}<p id="meetingDeviceSelectionMessage" class="diagnostic-note" aria-live="polite"></p>${settingsActions(`${primaryButton("Check Microphone", { id: "checkAudioInputButton", class: "secondary" })}${primaryButton("Mic Test", { id: "micTestButton", class: "secondary" })}${primaryButton("Check Setup", { id: "meetingSetupButton", class: "secondary" })}`, true)}`,
    )}`,
  );
}

function historyPrivacySettingsView(settings: RuntimeSettings, busy: boolean): string {
  const enabled = settings.history_enabled !== false;
  const checked = enabled ? " checked" : "";
  const disabled = busy ? " disabled" : "";

  return settingsPage(
    "History & Privacy",
    "Control what TranslateIT keeps locally and understand Saved data ownership.",
    "settings-view--history-privacy",
    `${settingsSection("History", "History contains Meeting and Text activity when enabled.", true)}${settingsCard(
      "settings-card--history",
      `<div class="history-privacy-control-row"><div><h3>Keep History</h3><p>Automatically keep completed Meeting and Text activity in Recent when the connected workflow supports it.</p></div><label class="history-privacy-toggle"><input id="historyEnabledToggle" type="checkbox"${checked}${disabled} /><span class="history-privacy-toggle-track" aria-hidden="true"></span><strong>${enabled ? "On" : "Off"}</strong></label></div><p class="history-privacy-note">Turning History off affects new/current retention only. Existing Recent and Saved items are not deleted.</p>`,
    )}${settingsSection("Saved", "Saved items are explicit durable work and remain separate from automatic History.")}${settingsCard(
      "settings-card--saved",
      `${settingsField("Saved ownership", statusValue("Separate from History"), "Saved items remain available when History is turned off and are not removed by Clear History.")}`,
    )}${settingsSection("Clear History", "Delete automatic Recent History without deleting Saved items.")}${settingsCard(
      "settings-card--history-clear",
      `<div class="history-clear-row"><div><h3>Clear Recent History</h3><p>Meeting and Text items in Recent will be deleted. Saved items will not be affected.</p></div>${primaryButton("Clear History", { id: "clearHistoryButton", class: "secondary history-clear-button", disabled: busy })}</div><p id="historyPrivacyMessage" class="history-privacy-message" aria-live="polite"></p>`,
    )}`,
  );
}

function advancedSettingsView(translationStatus: string, meetingStatus: string): string {
  const translationTone = translationStatus.toLowerCase().includes("ready") ? "good" : "warning";
  const meetingTone = meetingStatus.toLowerCase().includes("ready") ? "good" : "warning";
  return settingsPage(
    "Advanced",
    "Setup health and technical troubleshooting live here, away from normal meeting controls.",
    "settings-view--advanced",
    `${settingsSection("Setup health", "Product-level health stays readable without exposing implementation controls.", true)}${settingsCard(
      "settings-card--advanced",
      `${settingsGrid(`${settingsField("Local translation", statusValue(translationStatus, translationTone))}${settingsField("Meeting", statusValue(meetingStatus, meetingTone))}`)}${settingsActions(primaryButton("Open Diagnostics", { id: "openDiagnosticsButton", class: "secondary" }), true)}`,
    )}`,
  );
}

function populateDeviceSelect(
  select: HTMLSelectElement,
  devices: Array<{ id?: string; name: string; is_default?: boolean }>,
  currentValue: string | null | undefined,
): void {
  const committed = String(currentValue ?? "").trim();
  select.replaceChildren();
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Windows Default";
  select.append(defaultOption);

  let committedFound = !committed;
  devices.forEach((device) => {
    const id = String(device.id ?? device.name).trim();
    if (!id) return;
    const option = document.createElement("option");
    option.value = id;
    option.textContent = device.is_default ? `${device.name} · current Windows default` : device.name;
    select.append(option);
    if (id === committed) committedFound = true;
  });

  if (committed && !committedFound) {
    const unavailable = document.createElement("option");
    unavailable.value = committed;
    unavailable.textContent = `${committed} · unavailable`;
    select.append(unavailable);
  }
  select.value = committed;
}

function syncSettings(target: RuntimeSettings, source: RuntimeSettings): void {
  Object.assign(target, source);
}

function syncMeetingDeviceLabel(kind: ProductAudioDeviceKind, settings: RuntimeSettings): void {
  if (kind === "microphone") {
    const value = document.getElementById("meetingInputDeviceValue");
    if (value) value.textContent = deviceLabel(settings.audio.input_device_id);
    return;
  }
  const value = document.getElementById("meetingSoundDeviceValue");
  if (value) value.textContent = `Meeting sound: ${deviceLabel(settings.audio.output_device_id)}`;
}

export function renderMeetingSettingsTab(args: {
  ui: SettingsRenderRefs;
  settings: RuntimeSettings;
  onCheckAudioInput: () => void;
  onStartOrStopRecording: () => void;
  onCheckSetup: () => void;
  onDeviceSelectionCommitted: (kind: ProductAudioDeviceKind) => void;
}): void {
  args.ui.settingsContent.innerHTML = meetingSettingsView(args.settings);
  requireElement<HTMLButtonElement>("#checkAudioInputButton").addEventListener("click", () => args.onCheckAudioInput());
  requireElement<HTMLButtonElement>("#micTestButton").addEventListener("click", () => args.onStartOrStopRecording());
  requireElement<HTMLButtonElement>("#meetingSetupButton").addEventListener("click", () => args.onCheckSetup());

  const microphoneSelect = requireElement<HTMLSelectElement>("#meetingMicrophoneSelect");
  const meetingSoundSelect = requireElement<HTMLSelectElement>("#meetingSoundSelect");
  const message = requireElement<HTMLElement>("#meetingDeviceSelectionMessage");
  let devices: AudioDeviceListReport | null = null;
  let busy = false;

  const setBusy = (value: boolean) => {
    busy = value;
    microphoneSelect.disabled = value;
    meetingSoundSelect.disabled = value;
  };

  const applySelection = async (kind: ProductAudioDeviceKind, select: HTMLSelectElement) => {
    if (busy) return;
    const previousValue = kind === "microphone" ? args.settings.audio.input_device_id : args.settings.audio.output_device_id;
    const candidate = select.value.trim() || null;
    if ((previousValue ?? null) === candidate) return;

    setBusy(true);
    message.textContent = kind === "microphone" ? "Checking microphone before saving..." : "Checking Meeting sound before saving...";
    try {
      const result = await runtimeProductFacade.selectProductAudioDevice(kind, candidate);
      if (!result.ok) {
        select.value = String(previousValue ?? "");
        message.textContent = result.message;
        return;
      }
      syncSettings(args.settings, result.settings);
      syncMeetingDeviceLabel(kind, args.settings);
      message.textContent = result.message;
      if (devices) {
        populateDeviceSelect(microphoneSelect, devices.input_devices, args.settings.audio.input_device_id);
        populateDeviceSelect(meetingSoundSelect, devices.output_devices, args.settings.audio.output_device_id);
      }
      args.onDeviceSelectionCommitted(kind);
    } catch (error) {
      select.value = String(previousValue ?? "");
      message.textContent = `Device preference was not changed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      setBusy(false);
    }
  };

  microphoneSelect.addEventListener("change", () => void applySelection("microphone", microphoneSelect));
  meetingSoundSelect.addEventListener("change", () => void applySelection("meeting-sound", meetingSoundSelect));

  message.textContent = "Loading available audio devices...";
  void runtimeProductFacade.loadProductAudioDevices()
    .then((report) => {
      devices = report;
      populateDeviceSelect(microphoneSelect, report.input_devices, args.settings.audio.input_device_id);
      populateDeviceSelect(meetingSoundSelect, report.output_devices, args.settings.audio.output_device_id);
      message.textContent = report.ok ? "Choose a device to check it before saving." : report.note;
    })
    .catch((error) => {
      message.textContent = `Audio devices could not be listed: ${error instanceof Error ? error.message : String(error)}`;
    });
}

export function renderHistoryPrivacySettingsTab(args: {
  ui: SettingsRenderRefs;
  settings: RuntimeSettings;
  statusMessage: string;
  busy: boolean;
  onHistoryEnabledChange: (enabled: boolean) => void;
  onClearHistory: () => void;
}): void {
  args.ui.settingsContent.innerHTML = historyPrivacySettingsView(args.settings, args.busy);
  requireElement<HTMLElement>("#historyPrivacyMessage").textContent = args.statusMessage;
  const toggle = requireElement<HTMLInputElement>("#historyEnabledToggle");
  toggle.addEventListener("change", () => args.onHistoryEnabledChange(toggle.checked));
  requireElement<HTMLButtonElement>("#clearHistoryButton").addEventListener("click", () => args.onClearHistory());
}

export function renderAdvancedSettingsTab(args: {
  ui: SettingsRenderRefs;
  translationStatus: string;
  meetingStatus: string;
  onOpenDiagnostics: () => void;
}): void {
  args.ui.settingsContent.innerHTML = advancedSettingsView(args.translationStatus, args.meetingStatus);
  requireElement<HTMLButtonElement>("#openDiagnosticsButton").addEventListener("click", () => args.onOpenDiagnostics());
}
