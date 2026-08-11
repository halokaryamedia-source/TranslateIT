<script lang="ts">
  import type { MeetingCommittedTurnsSnapshot, MeetingSessionStatus } from "../app/bridge/runtimeApi";
  import type { ProductRuntimeSnapshot } from "../app/bridge/runtimeProductFacade";
  import MeetingActivity from "../components/meeting/MeetingActivity.svelte";
  import StatusBadge from "../components/ui/StatusBadge.svelte";
  import StatusRow from "../components/ui/StatusRow.svelte";

  type Tone = "neutral" | "good" | "warning";

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
  const checking = $derived(readiness.level === "checking" && !meeting.hasSession);
  const microphone = $derived(
    String(snapshot.inputStatus?.selected_device_name ?? snapshot.settings.audio.input_device_id ?? "").trim() || "Windows Default",
  );
  const meetingSound = $derived(String(snapshot.settings.audio.output_device_id ?? "").trim() || "Windows Default");
  const activityVisible = $derived(Boolean(meetingStatus && meeting.applicationOwned && meeting.hasSession && (meeting.live || meeting.busy)));

  function statusTone(ready: boolean, pending = false): Tone {
    if (ready) return "good";
    if (pending) return "neutral";
    return "warning";
  }

  const meetingTone = $derived(statusTone(meeting.live || readiness.meetingReady, checking || meeting.busy));
  const microphoneTone = $derived(statusTone(readiness.microphoneReady, checking));
  const routeTone = $derived(statusTone(readiness.meetingRouteReady, checking));

  const primaryLabel = $derived(
    actionBusy
      ? meeting.canStop ? "Stopping..." : "Starting..."
      : meeting.live ? "Stop Translation"
      : meeting.busy ? meeting.label === "Stopping" ? "Stopping..." : "Starting..."
      : "Start Translation",
  );
  const primaryDisabled = $derived(actionBusy || meeting.busy || (!meeting.canStart && !meeting.canStop));
</script>

<section class="ti-page">
  <header class="ti-page-header">
    <div>
      <span class="ti-kicker">Meeting translation</span>
      <h2 class="ti-page-title">{activityVisible ? "Meeting translation is active." : "Speak Indonesian. Your meeting hears English."}</h2>
      <p class="ti-page-copy">
        {activityVisible
          ? "Finalized speech is translated locally. Incoming English can appear as Indonesian text when its optional lane is available."
          : "Indonesian speech becomes English voice. Incoming English can appear as Indonesian text when available."}
      </p>
    </div>
    <StatusBadge
      label={meeting.live ? "Live" : meeting.busy ? meeting.label : readiness.meetingReady ? "Ready" : checking ? "Checking" : meeting.label}
      tone={meetingTone}
    />
  </header>

  <article class="ti-panel overflow-hidden">
    {#if activityVisible && meetingStatus}
      <div class="p-6">
        <MeetingActivity status={meetingStatus} turns={meetingTurns} />
      </div>
    {:else}
      <section class="grid border-b border-[var(--ti-border)] bg-[var(--ti-surface-soft)]">
        <div class="divide-y divide-[var(--ti-border)]">
          <StatusRow
            label="Your microphone"
            value={microphone}
            detail="The microphone you speak into."
            status={readiness.microphoneReady ? "Ready" : checking ? "Checking" : "Setup Needed"}
            tone={microphoneTone}
          />
          <StatusRow
            label="Incoming translation"
            value="English → Indonesian text"
            detail={`Meeting sound: ${meetingSound}. This lane is optional.`}
            status="Optional"
            tone="neutral"
          />
          <StatusRow
            label="Meeting microphone"
            value="TranslateIT Meeting Microphone"
            detail="Select this microphone inside Zoom, Meet, Teams, or another meeting app."
            status={readiness.meetingRouteReady ? "Ready" : checking ? "Checking" : "Setup Needed"}
            tone={routeTone}
          />
        </div>
      </section>
    {/if}

    <footer class="grid gap-4 p-6">
      <div class="ti-action-row">
        <button type="button" class="ti-button min-w-40" disabled={primaryDisabled} onclick={onMeetingAction}>{primaryLabel}</button>
        {#if !meeting.live && !meeting.busy}
          <button type="button" class="ti-button ti-button-secondary" onclick={onRefresh}>{readiness.meetingReady ? "Check Setup" : "Retry"}</button>
          {#if !readiness.meetingReady}
            <button type="button" class="ti-button ti-button-secondary" onclick={onFixSetup}>Fix Setup</button>
          {/if}
        {/if}
      </div>

      <div class="flex items-start gap-3 rounded-[var(--ti-radius-sm)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-4 py-3">
        <span class={`mt-1 size-2 shrink-0 rounded-full ${meeting.canStart || meeting.live ? "bg-[var(--ti-success)]" : checking || meeting.busy ? "bg-[var(--ti-text-soft)]" : "bg-[var(--ti-warning)]"}`}></span>
        <p class="m-0 text-sm leading-6 text-[var(--ti-text-muted)]">
          {meeting.canStart
            ? "Start Translation to begin the Meeting session. Moving to Text or Settings does not stop a live session."
            : meeting.message || "Complete Meeting setup before Start Translation can be used."}
        </p>
      </div>
    </footer>
  </article>
</section>
