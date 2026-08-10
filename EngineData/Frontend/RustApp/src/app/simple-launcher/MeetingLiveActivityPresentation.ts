import {
  runtimeApi,
  type MeetingCommittedTurn,
  type MeetingCommittedTurnsSnapshot,
  type MeetingSessionStatus,
} from "../bridge/runtimeApi";
import { mapProductMeetingState } from "../bridge/runtimeProductFacade";

const MEETING_ACTIVITY_REFRESH_MS = 1_200;
const ACTIVE_MEETING_LABELS = new Set(["Live", "Starting", "Stopping"]);

const READY_TITLE = "Speak Indonesian. Your meeting hears English.";
const READY_DESCRIPTION = "Indonesian speech becomes English voice. Incoming English can appear as Indonesian text when available.";

type ActivityCopy = {
  label: string;
  title: string;
  detail: string;
  tone: "neutral" | "good" | "warning";
};

type IncomingRuntimeStatus = {
  session_id?: string | null;
  stage?: string;
  capture_active?: boolean;
  suppressed?: boolean;
  degraded?: boolean;
  blocker?: string;
  note?: string;
};

type ActivityView = {
  section: HTMLElement;
  stage: HTMLElement;
  title: HTMLElement;
  detail: HTMLElement;
  meta: HTMLElement;
  incomingState: HTMLElement;
  transcriptTurns: HTMLElement;
  transcriptEmpty: HTMLElement;
  transcriptNotice: HTMLElement;
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
          <strong id="meetingLiveActivityMeta">ID → EN voice · EN → ID text</strong>
        </div>
        <span id="meetingLiveActivityStage" class="meeting-live-activity-stage" data-tone="neutral">Listening</span>
      </header>
      <div class="meeting-live-activity-state">
        <span class="meeting-live-activity-indicator" aria-hidden="true"></span>
        <div>
          <strong id="meetingLiveActivityTitle">Listening for Indonesian speech</strong>
          <p id="meetingLiveActivityDetail">TranslateIT is waiting for the next finalized utterance.</p>
        </div>
      </div>
      <p id="meetingLiveIncomingState" class="meeting-live-incoming-state" data-tone="neutral" hidden></p>
      <section class="meeting-live-transcript" aria-label="Meeting transcript">
        <header class="meeting-live-transcript-header">
          <strong>Transcript</strong>
          <span>Finalized Meeting turns</span>
        </header>
        <p id="meetingLiveTranscriptNotice" class="meeting-live-transcript-notice" hidden></p>
        <div id="meetingLiveTranscriptTurns" class="meeting-live-transcript-turns"></div>
        <p id="meetingLiveTranscriptEmpty" class="meeting-live-transcript-empty">No finalized translation yet. Committed Meeting turns will appear here in speech order.</p>
      </section>`;

    const actions = panel.querySelector<HTMLElement>(".meeting-ready-actions");
    if (actions) panel.insertBefore(section, actions);
    else panel.append(section);
  }

  const stage = document.getElementById("meetingLiveActivityStage");
  const title = document.getElementById("meetingLiveActivityTitle");
  const detail = document.getElementById("meetingLiveActivityDetail");
  const meta = document.getElementById("meetingLiveActivityMeta");
  const incomingState = document.getElementById("meetingLiveIncomingState");
  const transcriptTurns = document.getElementById("meetingLiveTranscriptTurns");
  const transcriptEmpty = document.getElementById("meetingLiveTranscriptEmpty");
  const transcriptNotice = document.getElementById("meetingLiveTranscriptNotice");
  if (!stage || !title || !detail || !meta || !incomingState || !transcriptTurns || !transcriptEmpty || !transcriptNotice) return null;

  return {
    section,
    stage,
    title,
    detail,
    meta,
    incomingState,
    transcriptTurns,
    transcriptEmpty,
    transcriptNotice,
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

function clearTranscriptPresentation(view: ActivityView): void {
  view.transcriptTurns.replaceChildren();
  view.transcriptNotice.hidden = true;
  view.transcriptNotice.textContent = "";
  view.transcriptEmpty.hidden = false;
  view.incomingState.hidden = true;
  view.incomingState.textContent = "";
}

function renderReadySurface(): void {
  const view = ensureActivityView();
  if (!view) return;
  view.panel.dataset.meetingView = "ready";
  view.section.hidden = true;
  setSetupVisibility(view, true);
  clearTranscriptPresentation(view);
  view.headingTitle.textContent = READY_TITLE;
  view.headingDescription.textContent = READY_DESCRIPTION;
}

function activityCopy(status: MeetingSessionStatus): ActivityCopy {
  const meeting = mapProductMeetingState(status);
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

function deliveryLabel(state: string | null | undefined): string {
  switch (state) {
    case "preparing_voice":
      return "Preparing voice";
    case "speaking":
      return "Speaking";
    case "output_complete":
      return "Output complete";
    case "output_failed":
      return "Output failed";
    case "interrupted":
      return "Interrupted";
    default:
      return "Processing";
  }
}

function createTranscriptTurn(turn: MeetingCommittedTurn): HTMLElement {
  const incoming = turn.lane === "incoming";
  const article = document.createElement("article");
  article.className = "meeting-live-transcript-turn";
  article.dataset.lane = incoming ? "incoming" : "you";
  if (!incoming && turn.delivery_state) article.dataset.deliveryState = turn.delivery_state;

  const header = document.createElement("header");
  header.className = "meeting-live-transcript-turn-header";

  const lane = document.createElement("span");
  lane.className = "meeting-live-transcript-lane";
  lane.textContent = incoming ? "INCOMING" : "YOU";
  header.append(lane);

  if (!incoming) {
    const delivery = document.createElement("span");
    delivery.className = "meeting-live-transcript-delivery";
    delivery.textContent = deliveryLabel(turn.delivery_state);
    header.append(delivery);
  }

  const primary = document.createElement("p");
  primary.className = "meeting-live-transcript-source";
  primary.lang = "id";
  primary.textContent = incoming ? turn.translated_text : turn.source_text;

  const secondary = document.createElement("p");
  secondary.className = "meeting-live-transcript-translation";
  secondary.lang = "en";
  secondary.textContent = incoming ? turn.source_text : turn.translated_text;

  article.append(header, primary, secondary);
  return article;
}

function renderIncomingStatus(status: MeetingSessionStatus, view: ActivityView): void {
  const incoming = (status as MeetingSessionStatus & { incoming?: IncomingRuntimeStatus }).incoming;
  if (!incoming || !status.has_session) {
    view.incomingState.hidden = true;
    view.incomingState.textContent = "";
    return;
  }

  view.incomingState.hidden = false;
  if (incoming.degraded) {
    view.incomingState.dataset.tone = "warning";
    view.incomingState.textContent = "Incoming translation is unavailable or degraded. Outbound Indonesian → English voice remains independent.";
    return;
  }
  if (incoming.suppressed || incoming.stage === "suppressed") {
    view.incomingState.dataset.tone = "neutral";
    view.incomingState.textContent = "Incoming is briefly suppressed while TranslateIT is speaking, so its own English voice is not treated as remote speech.";
    return;
  }
  if (incoming.capture_active) {
    view.incomingState.dataset.tone = "good";
    view.incomingState.textContent = incoming.stage === "transcribing" || incoming.stage === "translating"
      ? "Incoming English speech is being prepared as Indonesian text."
      : "Incoming English → Indonesian text is listening through Meeting Sound.";
    return;
  }

  view.incomingState.dataset.tone = "neutral";
  view.incomingState.textContent = "Incoming Meeting Sound is not active. Outbound translation can continue independently.";
}

function renderCommittedTurns(snapshot: MeetingCommittedTurnsSnapshot, status: MeetingSessionStatus, view: ActivityView): void {
  view.transcriptTurns.replaceChildren();

  if (!snapshot.ok || !snapshot.has_session || snapshot.session_id !== status.session_id) {
    view.transcriptNotice.hidden = false;
    view.transcriptNotice.textContent = snapshot.ok
      ? "The transcript snapshot is changing with the current Meeting session. It will refresh automatically."
      : "The live transcript is temporarily unavailable. Meeting lifecycle controls remain available.";
    view.transcriptEmpty.hidden = true;
    return;
  }

  if (snapshot.truncated || snapshot.dropped_turn_count > 0) {
    view.transcriptNotice.hidden = false;
    view.transcriptNotice.textContent = `${snapshot.dropped_turn_count} earlier turn${snapshot.dropped_turn_count === 1 ? " is" : "s are"} no longer shown in this bounded live view.`;
  } else {
    view.transcriptNotice.hidden = true;
    view.transcriptNotice.textContent = "";
  }

  const fragment = document.createDocumentFragment();
  const orderedTurns = [...snapshot.turns].sort((a, b) => a.sequence - b.sequence);
  for (const turn of orderedTurns) fragment.append(createTranscriptTurn(turn));
  view.transcriptTurns.append(fragment);
  view.transcriptEmpty.hidden = orderedTurns.length > 0;
}

function renderMeetingStatus(status: MeetingSessionStatus, turns: MeetingCommittedTurnsSnapshot): void {
  const view = ensureActivityView();
  if (!view) return;

  const meeting = mapProductMeetingState(status);
  const showActivity = meeting.applicationOwned && meeting.hasSession && (meeting.live || meeting.busy);
  if (!showActivity) return;

  const copy = activityCopy(status);
  view.panel.dataset.meetingView = "activity";
  setSetupVisibility(view, false);
  view.section.hidden = false;
  view.stage.textContent = copy.label;
  view.stage.dataset.tone = copy.tone;
  view.title.textContent = copy.title;
  view.detail.textContent = copy.detail;
  view.meta.textContent = "ID → EN voice · EN → ID text";
  renderIncomingStatus(status, view);
  renderCommittedTurns(turns, status, view);

  if (meeting.lifecycle === "starting") {
    view.headingTitle.textContent = "Starting Meeting translation.";
    view.headingDescription.textContent = "TranslateIT is opening the required outbound resources before translation becomes Live.";
  } else if (meeting.lifecycle === "stopping") {
    view.headingTitle.textContent = "Stopping Meeting translation.";
    view.headingDescription.textContent = "TranslateIT is revoking output authority and cleaning the active Meeting resources safely.";
  } else {
    view.headingTitle.textContent = "Meeting translation is live.";
    view.headingDescription.textContent = "Speak Indonesian normally. Finalized YOU and INCOMING translations appear below in speech order.";
  }
}

async function refreshMeetingActivity(): Promise<void> {
  if (requestInFlight || !shouldRefreshMeetingActivity()) return;
  requestInFlight = true;
  try {
    const [status, turns] = await Promise.all([
      runtimeApi.getMeetingSessionStatus(),
      runtimeApi.getMeetingCommittedTurns(),
    ]);
    if (status.runtime_claim === "frontend_bridge_unavailable" || status.lifecycle === "unavailable") return;
    renderMeetingStatus(status, turns);
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
