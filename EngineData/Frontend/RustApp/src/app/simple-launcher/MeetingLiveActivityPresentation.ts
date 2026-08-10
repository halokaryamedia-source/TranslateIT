import { runtimeApi, type MeetingSessionStatus } from "../bridge/runtimeApi";
import { mapProductMeetingState } from "../bridge/runtimeProductFacade";

const MEETING_ACTIVITY_REFRESH_MS = 1_200;
const ACTIVE_MEETING_LABELS = new Set(["Live", "Paused", "Starting", "Resuming", "Stopping"]);

const READY_TITLE = "Speak Indonesian. Your meeting hears English.";
const READY_DESCRIPTION = "Indonesian speech becomes English voice. Incoming English can appear as Indonesian text when available.";

type ActivityCopy = {
  label: string;
  title: string;
  detail: string;
  tone: "neutral" | "good" | "warning";
};

type ActivityView = {
  section: HTMLElement;
  stage: HTMLElement;
  title: HTMLElement;
  detail: HTMLElement;
  meta: HTMLElement;
  headingTitle: HTMLElement;
  headingDescription: HTMLElement;
  setupRows: HTMLElement | null;
  setupPreferences: HTMLElement | null;
  setupReminder: HTMLElement | null;
  panel: HTMLElement;
};

let refreshTimer: number | null = null;
let statusObserver: MutationObserver | null = null;
let requestInFlight = false;

function currentMeetingLabel(): string {
  return document.getElementById("meetingReadinessStatus")?.textContent?.trim() ?? "";
}

function meetingWorkspaceVisible(): boolean {
  const app = document.getElementById("mainApp");
  const workspace = document.getElementById("meetingWorkspace");
  if (!app || !workspace || app.hidden || workspace.hidden) return false;
  if (app.classList.contains("is-hidden") || workspace.classList.contains("is-hidden")) return false;
  return true;
}

function shouldRefreshMeetingActivity(): boolean {
  return meetingWorkspaceVisible() && ACTIVE_MEETING_LABELS.has(currentMeetingLabel());
}

function ensureActivityView(): ActivityView | null {
  const panel = document.querySelector<HTMLElement>(".meeting-ready-panel");
  const headingTitle = document.getElementById("meetingReadyTitle");
  const headingDescription = panel?.querySelector<HTMLElement>(".meeting-ready-heading > p") ?? null;
  if (!panel || !headingTitle || !headingDescription) return null;

  let section = document.getElementById("meetingLiveActivityPresentation");
  if (!section) {
    section = document.createElement("section");
    section.id = "meetingLiveActivityPresentation";
    section.className = "meeting-live-activity-presentation";
    section.hidden = true;
    section.setAttribute("aria-live", "polite");
    section.innerHTML = `
      <header class="meeting-live-activity-header">
        <div>
          <span class="meeting-live-activity-kicker">Live activity</span>
          <strong id="meetingLiveActivityMeta">Indonesian → English voice</strong>
        </div>
        <span id="meetingLiveActivityStage" class="meeting-live-activity-stage" data-tone="neutral">Listening</span>
      </header>
      <div class="meeting-live-activity-state">
        <span class="meeting-live-activity-indicator" aria-hidden="true"></span>
        <div>
          <strong id="meetingLiveActivityTitle">Listening for Indonesian speech</strong>
          <p id="meetingLiveActivityDetail">TranslateIT is waiting for the next finalized utterance.</p>
        </div>
      </div>`;

    const actions = panel.querySelector<HTMLElement>(".meeting-ready-actions");
    if (actions) panel.insertBefore(section, actions);
    else panel.append(section);
  }

  const stage = document.getElementById("meetingLiveActivityStage");
  const title = document.getElementById("meetingLiveActivityTitle");
  const detail = document.getElementById("meetingLiveActivityDetail");
  const meta = document.getElementById("meetingLiveActivityMeta");
  if (!stage || !title || !detail || !meta) return null;

  return {
    section,
    stage,
    title,
    detail,
    meta,
    headingTitle,
    headingDescription,
    setupRows: panel.querySelector<HTMLElement>(".meeting-ready-rows"),
    setupPreferences: panel.querySelector<HTMLElement>(".meeting-ready-preferences"),
    setupReminder: panel.querySelector<HTMLElement>(".meeting-ready-reminder"),
    panel,
  };
}

function setSetupVisibility(view: ActivityView, visible: boolean): void {
  if (view.setupRows) view.setupRows.hidden = !visible;
  if (view.setupPreferences) view.setupPreferences.hidden = !visible;
  if (view.setupReminder) view.setupReminder.hidden = !visible;
}

function renderReadySurface(): void {
  const view = ensureActivityView();
  if (!view) return;
  view.panel.dataset.meetingView = "ready";
  view.section.hidden = true;
  setSetupVisibility(view, true);
  view.headingTitle.textContent = READY_TITLE;
  view.headingDescription.textContent = READY_DESCRIPTION;
}

function activityCopy(status: MeetingSessionStatus): ActivityCopy {
  const meeting = mapProductMeetingState(status);
  if (meeting.paused) {
    return {
      label: "Paused",
      title: "Outbound translation is paused",
      detail: "The Meeting session remains open. Resume Translation when you want translated voice to continue.",
      tone: "neutral",
    };
  }

  const outbound = status.outbound;
  switch (outbound.stage) {
    case "transcribing":
      return {
        label: "Transcribing",
        title: "Turning your speech into text",
        detail: "The latest finalized Indonesian speech is being transcribed locally.",
        tone: "good",
      };
    case "translating":
      return {
        label: "Translating",
        title: "Translating the latest speech",
        detail: "The finalized Indonesian utterance is being translated to English.",
        tone: "good",
      };
    case "synthesizing":
      return {
        label: "Preparing voice",
        title: "Preparing the English voice",
        detail: "The translated English text is being prepared for Meeting output.",
        tone: "good",
      };
    case "delivering":
      return {
        label: "Speaking",
        title: "Speaking through Meeting Microphone",
        detail: "Translated English voice is being sent through TranslateIT Meeting Microphone.",
        tone: "good",
      };
    case "attention_needed":
      return {
        label: "Needs attention",
        title: "The latest outbound turn did not finish",
        detail: "Translation remains under your control. Technical detail is available in Diagnostics if needed.",
        tone: "warning",
      };
    case "paused":
      return {
        label: "Paused",
        title: "Outbound translation is paused",
        detail: "New and pending translated voice is paused for this Meeting session.",
        tone: "neutral",
      };
    case "listening":
      return {
        label: "Listening",
        title: outbound.utterance_sequence > 0 ? "Ready for your next utterance" : "Listening for Indonesian speech",
        detail: outbound.utterance_sequence > 0
          ? "The current outbound turn has finished processing. TranslateIT is ready for the next finalized utterance."
          : "Speak normally. TranslateIT waits for a finalized utterance before starting outbound translation.",
        tone: "good",
      };
    default:
      return {
        label: meeting.busy ? meeting.label : "Live",
        title: meeting.busy ? meeting.message : "Meeting translation is active",
        detail: "TranslateIT is following the current Meeting session.",
        tone: meeting.busy ? "neutral" : "good",
      };
  }
}

function renderMeetingStatus(status: MeetingSessionStatus): void {
  const view = ensureActivityView();
  if (!view) return;

  const meeting = mapProductMeetingState(status);
  const showActivity = meeting.applicationOwned && meeting.hasSession && (meeting.live || meeting.paused || meeting.busy);
  if (!showActivity) return;

  const copy = activityCopy(status);
  view.panel.dataset.meetingView = "activity";
  setSetupVisibility(view, false);
  view.section.hidden = false;
  view.stage.textContent = copy.label;
  view.stage.dataset.tone = copy.tone;
  view.title.textContent = copy.title;
  view.detail.textContent = copy.detail;
  view.meta.textContent = "Indonesian → English voice · Realtime";

  if (meeting.paused) {
    view.headingTitle.textContent = "Meeting translation is paused.";
    view.headingDescription.textContent = "The Meeting session is still open. Resume when you want outbound translated voice to continue.";
  } else if (meeting.lifecycle === "resuming") {
    view.headingTitle.textContent = "Resuming Meeting translation.";
    view.headingDescription.textContent = "TranslateIT is reopening the required outbound resources for this Meeting session.";
  } else {
    view.headingTitle.textContent = "Meeting translation is live.";
    view.headingDescription.textContent = "Speak Indonesian normally. Current outbound activity appears below while TranslateIT prepares English voice for your meeting.";
  }
}

async function refreshMeetingActivity(): Promise<void> {
  if (requestInFlight || !shouldRefreshMeetingActivity()) return;
  requestInFlight = true;
  try {
    const status = await runtimeApi.getMeetingSessionStatus();
    if (status.runtime_claim === "frontend_bridge_unavailable" || status.lifecycle === "unavailable") return;
    renderMeetingStatus(status);
  } catch {
    // The primary controller owns product error/recovery presentation. This view does
    // not create a parallel fallback or lifecycle truth when a read fails.
  } finally {
    requestInFlight = false;
  }
}

function syncFromPrimaryMeetingState(): void {
  if (!shouldRefreshMeetingActivity()) {
    renderReadySurface();
    return;
  }
  void refreshMeetingActivity();
}

export function startMeetingLiveActivityPresentation(): void {
  if (refreshTimer !== null) return;

  ensureActivityView();
  const statusElement = document.getElementById("meetingReadinessStatus");
  if (statusElement) {
    statusObserver = new MutationObserver(syncFromPrimaryMeetingState);
    statusObserver.observe(statusElement, { childList: true, characterData: true, subtree: true });
  }

  refreshTimer = window.setInterval(() => {
    if (shouldRefreshMeetingActivity()) void refreshMeetingActivity();
  }, MEETING_ACTIVITY_REFRESH_MS);

  syncFromPrimaryMeetingState();
}
