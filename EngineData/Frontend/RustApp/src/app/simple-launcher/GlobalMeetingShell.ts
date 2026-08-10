import { getCurrentWindow } from "@tauri-apps/api/window";
import { runtimeApi, type MeetingSessionStatus } from "../bridge/runtimeApi";
import {
  mapProductMeetingState,
  runtimeProductFacade,
  type ProductMeetingState,
} from "../bridge/runtimeProductFacade";
import { requireElement } from "../active-launcher/dom";

const GLOBAL_MEETING_REFRESH_MS = 1_200;

type ShellTone = "neutral" | "good" | "warning";

type GlobalMeetingShellRefs = {
  mainApp: HTMLElement;
  strip: HTMLElement;
  stripState: HTMLElement;
  stripSummary: HTMLElement;
  openMeetingButton: HTMLButtonElement;
  closeDialog: HTMLDialogElement;
  closeDialogMessage: HTMLParagraphElement;
  keepOpenButton: HTMLButtonElement;
  stopAndCloseButton: HTMLButtonElement;
};

let refreshTimer: number | null = null;
let refreshInFlight = false;
let closeCheckInFlight = false;
let stopAndCloseInFlight = false;
let closeAfterExistingStop = false;

function bindRefs(): GlobalMeetingShellRefs {
  return {
    mainApp: requireElement<HTMLElement>("#mainApp"),
    strip: requireElement<HTMLElement>("#globalMeetingStrip"),
    stripState: requireElement<HTMLElement>("#globalMeetingStripState"),
    stripSummary: requireElement<HTMLElement>("#globalMeetingStripSummary"),
    openMeetingButton: requireElement<HTMLButtonElement>("#globalMeetingOpenButton"),
    closeDialog: requireElement<HTMLDialogElement>("#meetingCloseDialog"),
    closeDialogMessage: requireElement<HTMLParagraphElement>("#meetingCloseDialogMessage"),
    keepOpenButton: requireElement<HTMLButtonElement>("#meetingCloseKeepOpenButton"),
    stopAndCloseButton: requireElement<HTMLButtonElement>("#meetingCloseStopButton"),
  };
}

function meetingStatusUnavailable(status: MeetingSessionStatus): boolean {
  return status.runtime_claim === "frontend_bridge_unavailable" || status.lifecycle === "unavailable";
}

function shellTone(meeting: ProductMeetingState): ShellTone {
  if (meeting.live && meeting.outboundStage === "attention_needed") return "warning";
  if (meeting.live) return "good";
  return "neutral";
}

function shellStateLabel(meeting: ProductMeetingState): string {
  if (meeting.live && meeting.outboundStage === "attention_needed") return "Needs attention";
  return meeting.label;
}

function shellSummary(meeting: ProductMeetingState): string {
  if (meeting.live && meeting.outboundStage === "attention_needed") {
    return "ID → EN · The latest outbound turn needs attention.";
  }
  if (meeting.paused) return "ID → EN · Translation is paused.";
  if (meeting.lifecycle === "starting") return "ID → EN · Starting translation.";
  if (meeting.lifecycle === "resuming") return "ID → EN · Resuming translation.";
  if (meeting.lifecycle === "stopping") return "ID → EN · Stopping safely.";
  if (meeting.outboundStage === "delivering") return "ID → EN · Speaking through Meeting Microphone.";
  if (["transcribing", "translating", "synthesizing"].includes(meeting.outboundStage)) {
    return "ID → EN · Processing finalized speech.";
  }
  return "ID → EN · Translation is live.";
}

function placeStrip(refs: GlobalMeetingShellRefs): void {
  const route = refs.mainApp.dataset.route ?? "meeting";
  const host = route === "settings"
    ? document.querySelector<HTMLElement>(".settings-topbar-v22")
    : document.querySelector<HTMLElement>(".simple-topbar");
  if (!host || refs.strip.parentElement === host) return;

  const topActions = host.querySelector<HTMLElement>(".top-actions");
  if (topActions) host.insertBefore(refs.strip, topActions);
  else host.append(refs.strip);
}

function renderStrip(meeting: ProductMeetingState, refs: GlobalMeetingShellRefs): void {
  placeStrip(refs);
  const outsideMeeting = refs.mainApp.dataset.route !== "meeting";
  const visible = outsideMeeting && meeting.applicationOwned && meeting.hasSession;
  refs.strip.hidden = !visible;
  if (!visible) return;

  refs.strip.dataset.tone = shellTone(meeting);
  refs.stripState.textContent = shellStateLabel(meeting);
  refs.stripSummary.textContent = shellSummary(meeting);
}

function showCloseDialog(
  refs: GlobalMeetingShellRefs,
  message: string,
  stopAndCloseEnabled: boolean,
): void {
  refs.closeDialogMessage.textContent = message;
  refs.closeDialog.dataset.stopAndCloseEnabled = stopAndCloseEnabled ? "true" : "false";
  refs.stopAndCloseButton.disabled = !stopAndCloseEnabled || stopAndCloseInFlight;
  refs.stopAndCloseButton.textContent = stopAndCloseInFlight ? "Stopping..." : "Stop & Close";
  if (!refs.closeDialog.open) refs.closeDialog.showModal();
}

function keepApplicationOpen(refs: GlobalMeetingShellRefs): void {
  closeAfterExistingStop = false;
  stopAndCloseInFlight = false;
  refs.stopAndCloseButton.disabled = false;
  refs.stopAndCloseButton.textContent = "Stop & Close";
  if (refs.closeDialog.open) refs.closeDialog.close();
}

async function destroyNativeWindow(refs: GlobalMeetingShellRefs): Promise<void> {
  closeAfterExistingStop = false;
  if (refs.closeDialog.open) refs.closeDialog.close();
  await getCurrentWindow().destroy();
}

function waitingForExistingStop(refs: GlobalMeetingShellRefs): void {
  closeAfterExistingStop = true;
  showCloseDialog(
    refs,
    "Translation is already stopping. TranslateIT will stay open until the canonical Stop lifecycle finishes, then this close request can complete.",
    false,
  );
}

function closeBlockedByUnknownStatus(refs: GlobalMeetingShellRefs): void {
  showCloseDialog(
    refs,
    "TranslateIT could not verify the current Meeting state, so closing was blocked. Select Stop & Close to retry the safety check, or Keep Open and try again later.",
    true,
  );
}

function closeBlockedByOtherRuntimeOwner(refs: GlobalMeetingShellRefs): void {
  showCloseDialog(
    refs,
    "Meeting resources are still owned by another TranslateIT runtime operation. Close remains blocked until that operation releases the Meeting resources.",
    false,
  );
}

async function inspectNativeCloseRequest(refs: GlobalMeetingShellRefs): Promise<void> {
  const status = await runtimeApi.getMeetingSessionStatus();
  if (meetingStatusUnavailable(status)) {
    closeBlockedByUnknownStatus(refs);
    return;
  }

  const meeting = mapProductMeetingState(status);
  renderStrip(meeting, refs);

  if (!status.has_session) {
    await destroyNativeWindow(refs);
    return;
  }
  if (!meeting.applicationOwned) {
    closeBlockedByOtherRuntimeOwner(refs);
    return;
  }
  if (meeting.lifecycle === "stopping") {
    waitingForExistingStop(refs);
    return;
  }

  showCloseDialog(
    refs,
    `${shellStateLabel(meeting)} Meeting Translation is still active. Stop & Close will run the same safe Stop lifecycle used by the Meeting workspace before TranslateIT exits.`,
    true,
  );
}

async function verifyStoppedThenDestroy(refs: GlobalMeetingShellRefs): Promise<boolean> {
  const status = await runtimeApi.getMeetingSessionStatus();
  if (meetingStatusUnavailable(status)) {
    closeBlockedByUnknownStatus(refs);
    return false;
  }
  const meeting = mapProductMeetingState(status);
  renderStrip(meeting, refs);
  if (!status.has_session) {
    await destroyNativeWindow(refs);
    return true;
  }
  if (meeting.applicationOwned && meeting.lifecycle === "stopping") {
    waitingForExistingStop(refs);
    return false;
  }

  showCloseDialog(
    refs,
    "TranslateIT did not receive proof that the Meeting session finished stopping, so the application remains open.",
    meeting.applicationOwned,
  );
  return false;
}

async function handleStopAndClose(refs: GlobalMeetingShellRefs): Promise<void> {
  if (stopAndCloseInFlight) return;
  stopAndCloseInFlight = true;
  refs.stopAndCloseButton.disabled = true;
  refs.stopAndCloseButton.textContent = "Stopping...";

  try {
    const status = await runtimeApi.getMeetingSessionStatus();
    if (meetingStatusUnavailable(status)) {
      closeBlockedByUnknownStatus(refs);
      return;
    }

    const meeting = mapProductMeetingState(status);
    renderStrip(meeting, refs);
    if (!status.has_session) {
      await destroyNativeWindow(refs);
      return;
    }
    if (!meeting.applicationOwned) {
      closeBlockedByOtherRuntimeOwner(refs);
      return;
    }
    if (meeting.lifecycle === "stopping") {
      waitingForExistingStop(refs);
      return;
    }

    const result = await runtimeProductFacade.runProductMeetingAction("stop");
    if (!result.ok) {
      showCloseDialog(
        refs,
        `Translation could not be stopped safely, so TranslateIT remains open. ${result.message}`,
        true,
      );
      return;
    }
    if (result.meeting.hasSession) {
      if (result.meeting.lifecycle === "stopping") {
        waitingForExistingStop(refs);
      } else {
        showCloseDialog(
          refs,
          "Stop finished without proof that the Meeting session was cleared. TranslateIT remains open.",
          true,
        );
      }
      return;
    }

    await verifyStoppedThenDestroy(refs);
  } catch (error) {
    showCloseDialog(
      refs,
      `TranslateIT could not complete the safe close check. ${error instanceof Error ? error.message : String(error)}`,
      true,
    );
  } finally {
    stopAndCloseInFlight = false;
    if (refs.closeDialog.open && !closeAfterExistingStop) {
      const enabled = refs.closeDialog.dataset.stopAndCloseEnabled === "true";
      refs.stopAndCloseButton.disabled = !enabled;
      refs.stopAndCloseButton.textContent = "Stop & Close";
    }
  }
}

async function refreshGlobalMeetingStatus(refs: GlobalMeetingShellRefs): Promise<void> {
  if (refreshInFlight) return;
  const desktopVisible = !refs.mainApp.classList.contains("is-hidden");
  const outsideMeeting = refs.mainApp.dataset.route !== "meeting";
  if (!desktopVisible || (!outsideMeeting && !closeAfterExistingStop)) return;

  refreshInFlight = true;
  try {
    const status = await runtimeApi.getMeetingSessionStatus();
    if (meetingStatusUnavailable(status)) {
      if (closeAfterExistingStop) {
        refs.closeDialogMessage.textContent = "Translation was stopping, but TranslateIT cannot currently verify that the Meeting session has cleared. The application remains open.";
      }
      return;
    }

    const meeting = mapProductMeetingState(status);
    renderStrip(meeting, refs);
    if (closeAfterExistingStop && !status.has_session) {
      await destroyNativeWindow(refs);
    }
  } finally {
    refreshInFlight = false;
  }
}

async function installNativeCloseGuard(refs: GlobalMeetingShellRefs): Promise<void> {
  try {
    await getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      if (closeCheckInFlight || stopAndCloseInFlight) return;

      closeCheckInFlight = true;
      try {
        await inspectNativeCloseRequest(refs);
      } catch (error) {
        showCloseDialog(
          refs,
          `TranslateIT could not verify whether Meeting Translation is still active. Closing was blocked. ${error instanceof Error ? error.message : String(error)}`,
          true,
        );
      } finally {
        closeCheckInFlight = false;
      }
    });
  } catch {
    // Browser-only development previews do not expose the native Tauri close event.
    // No fallback close success is fabricated here.
  }
}

export async function startGlobalMeetingShell(): Promise<void> {
  if (refreshTimer !== null) return;
  const refs = bindRefs();

  refs.openMeetingButton.addEventListener("click", () => {
    refs.strip.hidden = true;
    document.getElementById("meetingNavButton")?.click();
  });
  refs.keepOpenButton.addEventListener("click", () => keepApplicationOpen(refs));
  refs.stopAndCloseButton.addEventListener("click", () => void handleStopAndClose(refs));

  await installNativeCloseGuard(refs);
  await refreshGlobalMeetingStatus(refs);
  refreshTimer = window.setInterval(() => void refreshGlobalMeetingStatus(refs), GLOBAL_MEETING_REFRESH_MS);
}
