<script lang="ts">
  import type { MeetingCommittedTurnsSnapshot, MeetingSessionStatus } from "../app/bridge/runtimeApi";
  import type { ProductRuntimeSnapshot } from "../app/bridge/runtimeProductFacade";
  import MeetingActivity from "../components/meeting/MeetingActivity.svelte";
  import StatusBadge from "../components/ui/StatusBadge.svelte";
  import StatusRow from "../components/ui/StatusRow.svelte";

  type Tone = "neutral" | "good" | "warning" | "danger";

  let {
    snapshot,
    meetingStatus,
    meetingTurns,
    actionBusy = false,
    onMeetingAction,
    onRefresh,
    onFixSetup,
  }: {
    snapshot: ProductRuntimeSnapshot;
    meetingStatus: MeetingSessionStatus | null;
    meetingTurns: MeetingCommittedTurnsSnapshot | null;
    actionBusy?: boolean;
    onMeetingAction: () => void | Promise<void>;
    onRefresh: () => void | Promise<void>;
    onFixSetup: () => void | Promise<void>;
  } = $props();

  const readiness = $derived(snapshot.readiness);
  const meeting = $derived(snapshot.meeting);
  const runtimeUnavailable = $derived(readiness.level === "unavailable" || meeting.label === "Unavailable");
  const checking = $derived(readiness.level === "checking" && !meeting.hasSession);
  const microphone = $derived(
    String(snapshot.inputStatus?.selected_device_name ?? snapshot.settings.audio.input_device_id ?? "").trim() || "Windows Default",
  );
  const meetingSound = $derived(String(snapshot.settings.audio.output_device_id ?? "").trim() || "Windows Default");
  const activityVisible = $derived(Boolean(meetingStatus && meeting.applicationOwned && meeting.hasSession && (meeting.live || meeting.busy)));

  function statusTone(ready: boolean, pending = false, unavailable = false): Tone {
    if (unavailable) return "danger";
    if (ready) return "good";
    if (pending) return "neutral";
    return "warning";
  }

  const microphoneUnavailable = $derived(readiness.microphoneStatus === "Unavailable");
  const microphoneTone = $derived(statusTone(readiness.microphoneReady, checking, microphoneUnavailable));
  const routeTone = $derived(statusTone(readiness.meetingRouteReady, checking, runtimeUnavailable));
  const meetingTone = $derived(statusTone(meeting.live || readiness.meetingReady, checking || meeting.busy, runtimeUnavailable));

  const primaryLabel = $derived(
    actionBusy
      ? meeting.canStop ? "Stopping..." : "Starting..."
      : meeting.live ? "Stop Translation"
      : meeting.busy ? meeting.label === "Stopping" ? "Stopping..." : "Starting..."
      : "Start Translation",
  );
  const primaryDisabled = $derived(actionBusy || meeting.busy || (!meeting.canStart && !meeting.canStop));

  const readyMessage = $derived(
    runtimeUnavailable
      ? "TranslateIT can't reach the local translator right now. Retry the check."
      : checking
        ? "Checking your microphone and meeting output..."
        : readiness.meetingReady
          ? "Ready to translate. Start when your meeting is open."
          : "Finish the setup items below before starting translation.",
  );
</script>

<section class="ti-page">
  <header class="ti-page-header">
    <div>
      <span class="ti-kicker">Meeting</span>
      <h2 class="ti-page-title">{activityVisible ? "Meeting translation" : "Speak Indonesian. Your meeting hears English."}</h2>
      <p class="ti-page-copy">
        {activityVisible
          ? "Speak normally. TranslateIT turns each finished phrase into English voice for your meeting."
          : "Use your normal microphone. TranslateIT sends the English translation through TranslateIT Meeting Microphone."}
      </p>
    </div>
    {#if meeting.live || meeting.busy || runtimeUnavailable || !readiness.meetingReady}
      <StatusBadge
        label={meeting.live ? "Live" : meeting.busy ? meeting.label : runtimeUnavailable ? "Unavailable" : checking ? "Checking" : "Setup Needed"}
        tone={meetingTone}
      />
    {/if}
  </header>

  <article class="ti-panel overflow-hidden">
    {#if activityVisible && meetingStatus}
      <div class="p-6">
        <MeetingActivity status={meetingStatus} turns={meetingTurns} />
      </div>
    {:else}
      <div class="border-b border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-6 py-5">
        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-5">
          <div>
            <span class="ti-field-label">You speak</span>
            <strong class="mt-1 block text-base font-semibold">Indonesian</strong>
          </div>
          <span class="text-lg text-[var(--ti-text-soft)]" aria-hidden="true">→</span>
          <div class="text-right">
            <span class="ti-field-label">Meeting hears</span>
            <strong class="mt-1 block text-base font-semibold">English voice</strong>
          </div>
        </div>
      </div>

      <div class="divide-y divide-[var(--ti-border)]">
        <StatusRow
          label="Your microphone"
          value={microphone}
          detail="The microphone you speak into."
          status={readiness.microphoneReady ? "" : microphoneUnavailable ? "Unavailable" : checking ? "Checking" : "Setup Needed"}
          tone={microphoneTone}
        />
        <StatusRow
          label="Meeting microphone"
          value="TranslateIT Meeting Microphone"
          detail="Choose this microphone in Zoom, Meet, Teams, or your meeting app."
          status={readiness.meetingRouteReady ? "" : runtimeUnavailable ? "Unavailable" : checking ? "Checking" : "Setup Needed"}
          tone={routeTone}
        />
        <StatusRow
          label="Incoming translation"
          value="English → Indonesian text"
          detail={`Optional · listens to ${meetingSound}`}
          status={runtimeUnavailable ? "Unavailable" : ""}
          tone={runtimeUnavailable ? "danger" : "neutral"}
        />
      </div>
    {/if}

    <footer class="grid gap-4 border-t border-[var(--ti-border)] p-6">
      <div class="ti-action-row">
        <button type="button" class={`ti-button min-w-44 ${meeting.canStop ? "ti-button-danger" : ""}`} disabled={primaryDisabled} onclick={onMeetingAction}>{primaryLabel}</button>
        {#if !meeting.live && !meeting.busy && !readiness.meetingReady}
          <button type="button" class="ti-button ti-button-secondary" onclick={onRefresh}>{runtimeUnavailable ? "Retry" : "Check Again"}</button>
          {#if !runtimeUnavailable}
            <button type="button" class="ti-button ti-button-secondary" onclick={onFixSetup}>Fix Setup</button>
          {/if}
        {/if}
      </div>

      {#if !activityVisible}
        <div class="flex items-center gap-2.5 text-sm text-[var(--ti-text-muted)]" aria-live="polite">
          <span class={`size-2 shrink-0 rounded-full ${runtimeUnavailable ? "bg-[var(--ti-danger)]" : readiness.meetingReady ? "bg-[var(--ti-success)]" : checking ? "bg-[var(--ti-text-soft)]" : "bg-[var(--ti-warning)]"}`} aria-hidden="true"></span>
          <span>{readyMessage}</span>
        </div>
      {/if}
    </footer>
  </article>
</section>
