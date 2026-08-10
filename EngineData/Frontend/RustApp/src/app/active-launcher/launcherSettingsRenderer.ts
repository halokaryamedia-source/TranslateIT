import { runtimeProductFacade, type ProductAudioDeviceKind } from "../bridge/runtimeProductFacade";
import type { AudioDeviceListReport, RuntimeSettings } from "../shared/types";
import { requireElement } from "./dom";
import { primaryButton, settingsActions, settingsCard, settingsField, settingsGrid, settingsPage, settingsSection, statusBadge } from "./uiPageFactory";

type SettingsRenderRefs = { settingsContent: HTMLElement };

function escapeHtml(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function deviceSelect(id: string, current: string | null | undefined, label: string): string {
  const selected = String(current ?? "").trim();
  const pinned = selected ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>` : "";
  return `<select id="${id}" class="select-field-v22" aria-label="${escapeHtml(label)}"><option value=""${selected ? "" : " selected"}>Windows Default</option>${pinned}</select>`;
}

function meetingView(settings: RuntimeSettings): string {
  return settingsPage("Meeting", "Configure the audio TranslateIT uses for meeting translation.", "settings-view--meeting",
    `${settingsSection("Meeting setup", "Only current translation audio choices are shown here.", true)}${settingsCard("settings-card--meeting",
      `${settingsGrid(`${settingsField("Your microphone", deviceSelect("meetingMicrophoneSelect", settings.audio.input_device_id, "Your microphone"))}${settingsField("Meeting sound", deviceSelect("meetingSoundSelect", settings.audio.output_device_id, "Meeting sound"))}${settingsField("Meeting microphone", `<div class="settings-status-row">${statusBadge("TranslateIT Meeting Microphone", "neutral")}</div>`)}`)}<p id="meetingDeviceSelectionMessage" class="diagnostic-note" aria-live="polite"></p>${settingsActions(`${primaryButton("Check Microphone", { id: "checkAudioInputButton", class: "secondary" })}${primaryButton("Mic Test", { id: "micTestButton", class: "secondary" })}${primaryButton("Check Setup", { id: "meetingSetupButton", class: "secondary" })}`, true)}`)}`);
}

function advancedView(translationStatus: string, meetingStatus: string): string {
  const translationTone = translationStatus.toLowerCase().includes("ready") ? "good" : "warning";
  const meetingTone = meetingStatus.toLowerCase().includes("ready") ? "good" : "warning";
  return settingsPage("Advanced", "Setup health and troubleshooting stay separate from normal translation controls.", "settings-view--advanced",
    `${settingsSection("Setup health", "Open Diagnostics only when technical detail is needed.", true)}${settingsCard("settings-card--advanced",
      `${settingsGrid(`${settingsField("Local translation", `<div class="settings-status-row">${statusBadge(translationStatus, translationTone)}</div>`)}${settingsField("Meeting", `<div class="settings-status-row">${statusBadge(meetingStatus, meetingTone)}</div>`)}`)}${settingsActions(primaryButton("Open Diagnostics", { id: "openDiagnosticsButton", class: "secondary" }), true)}`)}`);
}

function populate(select: HTMLSelectElement, devices: Array<{ id?: string; name: string; is_default?: boolean }>, current: string | null | undefined): void {
  const selected = String(current ?? "").trim();
  select.replaceChildren();
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Windows Default";
  select.append(defaultOption);
  let found = !selected;
  for (const device of devices) {
    const id = String(device.id ?? device.name).trim();
    if (!id) continue;
    const option = document.createElement("option");
    option.value = id;
    option.textContent = device.is_default ? `${device.name} · current Windows default` : device.name;
    select.append(option);
    if (id === selected) found = true;
  }
  if (selected && !found) {
    const missing = document.createElement("option");
    missing.value = selected;
    missing.textContent = `${selected} · unavailable`;
    select.append(missing);
  }
  select.value = selected;
}

export function renderMeetingSettingsTab(args: {
  ui: SettingsRenderRefs;
  settings: RuntimeSettings;
  onCheckAudioInput: () => void;
  onStartOrStopRecording: () => void;
  onCheckSetup: () => void;
}): void {
  args.ui.settingsContent.innerHTML = meetingView(args.settings);
  requireElement<HTMLButtonElement>("#checkAudioInputButton").addEventListener("click", args.onCheckAudioInput);
  requireElement<HTMLButtonElement>("#micTestButton").addEventListener("click", args.onStartOrStopRecording);
  requireElement<HTMLButtonElement>("#meetingSetupButton").addEventListener("click", args.onCheckSetup);

  const microphone = requireElement<HTMLSelectElement>("#meetingMicrophoneSelect");
  const meetingSound = requireElement<HTMLSelectElement>("#meetingSoundSelect");
  const message = requireElement<HTMLElement>("#meetingDeviceSelectionMessage");
  let devices: AudioDeviceListReport | null = null;
  let busy = false;

  const applySelection = async (kind: ProductAudioDeviceKind, select: HTMLSelectElement) => {
    if (busy) return;
    const previous = kind === "microphone" ? args.settings.audio.input_device_id : args.settings.audio.output_device_id;
    const candidate = select.value.trim() || null;
    if ((previous ?? null) === candidate) return;
    busy = true;
    microphone.disabled = true;
    meetingSound.disabled = true;
    message.textContent = "Checking device before saving...";
    try {
      const result = await runtimeProductFacade.selectProductAudioDevice(kind, candidate);
      if (!result.ok) {
        select.value = String(previous ?? "");
        message.textContent = result.message;
        return;
      }
      Object.assign(args.settings, result.settings);
      message.textContent = result.message;
      if (devices) {
        populate(microphone, devices.input_devices, args.settings.audio.input_device_id);
        populate(meetingSound, devices.output_devices, args.settings.audio.output_device_id);
      }
    } catch (error) {
      select.value = String(previous ?? "");
      message.textContent = `Device preference was not changed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      busy = false;
      microphone.disabled = false;
      meetingSound.disabled = false;
    }
  };

  microphone.addEventListener("change", () => void applySelection("microphone", microphone));
  meetingSound.addEventListener("change", () => void applySelection("meeting-sound", meetingSound));
  message.textContent = "Loading available audio devices...";
  void runtimeProductFacade.loadProductAudioDevices().then((report) => {
    devices = report;
    populate(microphone, report.input_devices, args.settings.audio.input_device_id);
    populate(meetingSound, report.output_devices, args.settings.audio.output_device_id);
    message.textContent = report.ok ? "Choose a device to check it before saving." : report.note ?? "Audio devices are unavailable.";
  }).catch((error) => {
    message.textContent = `Audio devices could not be listed: ${error instanceof Error ? error.message : String(error)}`;
  });
}

export function renderAdvancedSettingsTab(args: {
  ui: SettingsRenderRefs;
  translationStatus: string;
  meetingStatus: string;
  onOpenDiagnostics: () => void;
}): void {
  args.ui.settingsContent.innerHTML = advancedView(args.translationStatus, args.meetingStatus);
  requireElement<HTMLButtonElement>("#openDiagnosticsButton").addEventListener("click", args.onOpenDiagnostics);
}
