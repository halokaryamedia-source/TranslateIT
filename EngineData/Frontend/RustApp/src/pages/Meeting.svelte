<script lang="ts">
  import type {
    MeetingCommittedTurnsSnapshot,
    MeetingSessionStatus,
  } from "../app/bridge/runtimeApi";
  import type { ProductRuntimeSnapshot } from "../app/bridge/runtimeProductFacade";
  import MeetingActivity from "../components/meeting/MeetingActivity.svelte";
  import StatusBadge from "../components/ui/StatusBadge.svelte";

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

  const meetingTone = $derived<"neutral" | "good" | "warning">(
    meeting.live || readiness.meetingReady ? "good" : checking || meeting.busy ? "neutral" : "warning",
  );
  const microphoneTone = $derived<"neutral" | "good" | "warning">(readiness.microphoneReady ? "good" : checking ? "neutral" : "warning");
  const routeTone = $derived<"neutral" | "good" | "warning">(readiness.meetingRouteReady ? "good" : checking ? "neutral" : "warning");

  const primaryLabel = $derived(
    actionBusy
      ? meeting.canStop ? "Stopping..." : "Starting..."
      : meeting.live ? "Stop Translation"
      : meeting.busy ? meeting.label === "Stopping" ? "Stopping..." : "Starting..."
      : "Start Translation",
  );
  const primaryDisabled = $derived(actionBusy || meeting.busy || (!meeting.canStart && !meeting.canStop));
</script>

<section class="mx-auto grid w-full max-w-[1040px] gap-5 px-8 py-8">
  <header class="flex items-start justify-between gap-8">
    <div>
      <span class="ti-kicker">Meeting translation</span>
      <h2 class="mb-0 mt-2 text-3xl font-black tracking-[-0.035em]">
        {activityVisible ? "Meeting translation is active." : "Speak Indonesian. Your meeting hears English."}
      </h2>
      <p class="mb-0 mt-3 max-w-2xl text-sm leading-6 text-[var(--ti-text-muted)]">
        {activityVisible
          ? "Finalized speech is translated locally. Incoming English can appear as Indonesian text when its optional lane is available."
          : "Indonesian speech becomes English voice. Incoming English can appear as Indonesian text when available."}
      </p>
    </div>
    <StatusBadge label={meeting.live ? "Live" : meeting.busy ? meeting.label : readiness.meetingReady ? "Ready" : checking ? "Checking" : meeting.label} tone={meetingTone} />
  </header>

  <article class="ti-panel p-6">
    {#if activityVisible && meetingStatus}
      <MeetingActivity status={meetingStatus} turns={meetingTurns} />
    {:else}
      <div class="grid divide-y divide-[var(--ti-border)] rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)]">
        <section class="flex items-center justify-between gap-6 p-5">
          <div>
            <span class="text-xs text-[var(--ti-text-muted)]">Your microphone</span>
            <strong class="mt-1 block text-sm">{microphone}</strong>
            <small class="mt-1 block text-xs text-[var(--ti-text-soft)]">The microphone you speak into.</small>
          </div>
          <StatusBadge label={readiness.microphoneReady ? "Ready" : checking ? "Checking" : "Setup Needed"} tone={microphoneTone} />
        </section>

        <section class="flex items-center justify-between gap-6 p-5">
          <div>
            <span class="text-xs text-[var(--ti-text-muted)]">Incoming translation</span>
            <strong class="mt-1 block text-sm">English → Indonesian text</strong>
            <small class="mt-1 block text-xs text-[var(--ti-text-soft)]">Meeting sound: {meetingSound}</small>
          </div>
          <StatusBadge label="Optional" tone="neutral" />
        </section>

        <section class="flex items-center justify-between gap-6 p-5">
          <div>
            <span class="text-xs text-[var(--ti-text-muted)]">Meeting microphone</span>
            <strong class="mt-1 block text-sm">TranslateIT Meeting Microphone</strong>
            <small class="mt-1 block text-xs text-[var(--ti-text-soft)]">Select this microphone inside Zoom, Meet, Teams, or another meeting app.</small>
          </div>
          <StatusBadge label={readiness.meetingRouteReady ? "Ready" : checking ? "Checking" : "Setup Needed"} tone={routeTone} />
        </section>
      </div>
    {/if}

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <button type="button" class="ti-button" disabled={primaryDisabled} onclick={onMeetingAction}>{primaryLabel}</button>
      {#if !meeting.live && !meeting.busy}
        <button type="button" class="ti-button ti-button-secondary" onclick={onRefresh}>{readiness.meetingReady ? "Check Setup" : "Retry"}</button>
        {#if !readiness.meetingReady}
          <button type="button" class="ti-button ti-button-secondary" onclick={onFixSetup}>Fix Setup</button>
        {/if}
      {/if}
    </div>

    <p class="mb-0 mt-4 text-sm leading-6 text-[var(--ti-text-muted)]">
      {meeting.canStart
        ? "Start Translation to begin the Meeting session. Moving to Text or Settings does not stop a live session."
        : meeting.message || "Complete Meeting setup before Start Translation can be used."}
    </p>
  </article>
</section>
