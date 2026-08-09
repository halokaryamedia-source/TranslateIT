import type { RuntimeSettings } from "../shared/types";
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

function deviceLabel(value: string | null | undefined): string {
  const clean = String(value ?? "").trim();
  return clean || "Windows Default";
}

function statusValue(value: string, tone: "neutral" | "good" | "warning" | "error" = "neutral"): string {
  return `<div class="settings-status-row">${statusBadge(value, tone)}</div>`;
}

function meetingSettingsView(settings: RuntimeSettings): string {
  const microphone = deviceLabel(settings.audio.input_device_id);
  const meetingSound = deviceLabel(settings.audio.output_device_id);
  return settingsPage(
    "Meeting",
    "Configure the audio and setup TranslateIT uses for meetings.",
    "settings-view--meeting",
    `${settingsSection("Meeting preferences", "Keep normal meeting controls simple and product-level.", true)}${settingsCard(
      "settings-card--meeting",
      `${settingsGrid(
        `${settingsField("Speaking mode", statusValue("Session Listening"), "Default meeting mode. Push-to-Talk remains the secondary interaction mode.")}${settingsField("Your microphone", statusValue(microphone), "The microphone you speak into for outbound translation.")}${settingsField("Meeting sound", statusValue(meetingSound), "Where you normally listen to the meeting. Incoming translation depends on this lane when available.")}${settingsField("Meeting microphone", statusValue("TranslateIT Meeting Microphone"), "Managed by TranslateIT and selected as the microphone inside the meeting application.")}`,
      )}${settingsActions(`${primaryButton("Check Microphone", { id: "checkAudioInputButton", class: "secondary" })}${primaryButton("Mic Test", { id: "micTestButton", class: "secondary" })}${primaryButton("Check Setup", { id: "meetingSetupButton", class: "secondary" })}`, true)}`,
    )}`,
  );
}

function historyPrivacySettingsView(): string {
  return settingsPage(
    "History & Privacy",
    "Control what TranslateIT keeps locally and understand Saved data ownership.",
    "settings-view--history-privacy",
    `${settingsSection("History", "History contains Meeting and Text activity when enabled.", true)}${settingsCard(
      "settings-card--history",
      `${settingsField("History controls", statusValue("Not connected yet", "warning"), "The current source slice establishes the final Settings hierarchy without pretending History persistence controls are already implemented.")}`,
    )}${settingsSection("Saved", "Saved items are explicit durable work and remain separate from automatic History.")}${settingsCard(
      "settings-card--saved",
      `${settingsField("Saved ownership", statusValue("Separate from History"), "Clearing History must not remove Saved items.")}`,
    )}${settingsSection("Clear History", "The destructive control stays unavailable until the History storage contract is connected.")}${settingsCard(
      "settings-card--diagnostic",
      `<p class="diagnostic-note">No placeholder Clear History button is exposed before the persistent storage behavior is implemented.</p>`,
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

export function renderMeetingSettingsTab(args: {
  ui: SettingsRenderRefs;
  settings: RuntimeSettings;
  onCheckAudioInput: () => void;
  onStartOrStopRecording: () => void;
  onCheckSetup: () => void;
}): void {
  args.ui.settingsContent.innerHTML = meetingSettingsView(args.settings);
  requireElement<HTMLButtonElement>("#checkAudioInputButton").addEventListener("click", () => args.onCheckAudioInput());
  requireElement<HTMLButtonElement>("#micTestButton").addEventListener("click", () => args.onStartOrStopRecording());
  requireElement<HTMLButtonElement>("#meetingSetupButton").addEventListener("click", () => args.onCheckSetup());
}

export function renderHistoryPrivacySettingsTab(args: {
  ui: SettingsRenderRefs;
}): void {
  args.ui.settingsContent.innerHTML = historyPrivacySettingsView();
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
