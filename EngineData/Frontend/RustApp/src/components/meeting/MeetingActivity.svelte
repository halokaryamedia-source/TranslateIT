<script lang="ts">
  import type { MeetingCommittedTurn, MeetingCommittedTurnsSnapshot, MeetingSessionStatus } from "../../app/bridge/runtimeApi";
  import { mapProductMeetingState } from "../../app/bridge/runtimeProductFacade";
  import StatusBadge from "../ui/StatusBadge.svelte";

  let {
    status,
    turns,
  }: {
    status: MeetingSessionStatus;
    turns: MeetingCommittedTurnsSnapshot | null;
  } = $props();

  const meeting = $derived(mapProductMeetingState(status));
  const orderedTurns = $derived(
    turns?.ok && turns.has_session && turns.session_id === status.session_id
      ? [...turns.turns].sort((a, b) => a.sequence - b.sequence)
      : [],
  );

  function stageCopy(stage: string): { label: string; title: string; detail: string; tone: "neutral" | "good" | "warning" } {
    switch (stage) {
      case "transcribing":
        return { label: "Transcribing", title: "Turning your speech into text", detail: "The latest finalized Indonesian speech is being transcribed locally.", tone: "good" };
      case "translating":
        return { label: "Translating", title: "Translating the latest speech", detail: "The finalized Indonesian utterance is being translated to English.", tone: "good" };
      case "synthesizing":
        return { label: "Preparing voice", title: "Preparing the English voice", detail: "The translated English text is being prepared for Meeting output.", tone: "good" };
      case "delivering":
        return { label: "Speaking", title: "Speaking through Meeting Microphone", detail: "Translated English voice is being sent through TranslateIT Meeting Microphone.", tone: "good" };
      case "attention_needed":
        return { label: "Needs attention", title: "The latest outbound turn did not finish", detail: "Translation remains under your control. Technical detail is available in Diagnostics if needed.", tone: "warning" };
      case "listening":
        return {
          label: "Listening",
          title: status.outbound.utterance_sequence > 0 ? "Ready for your next utterance" : "Listening for Indonesian speech",
          detail: status.outbound.utterance_sequence > 0
            ? "The current outbound turn finished processing. TranslateIT is ready for the next finalized utterance."
            : "Speak normally. TranslateIT waits for finalized speech before starting outbound translation.",
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

  const activity = $derived(stageCopy(status.outbound.stage));

  function deliveryLabel(turn: MeetingCommittedTurn): string {
    switch (turn.delivery_state) {
      case "preparing_voice": return "Preparing voice";
      case "speaking": return "Speaking";
      case "output_complete": return "Output complete";
      case "output_failed": return "Output failed";
      case "interrupted": return "Interrupted";
      default: return "Processing";
    }
  }

  function incomingCopy(): { label: string; badge: string; tone: "neutral" | "good" | "warning" } {
    const incoming = status.incoming;
    if (incoming.degraded) {
      return { label: "Incoming translation is unavailable or degraded. Outbound Indonesian → English voice remains independent.", badge: "Degraded", tone: "warning" };
    }
    if (incoming.suppressed || incoming.stage === "suppressed") {
      return { label: "Incoming is briefly suppressed while TranslateIT is speaking, so its own English voice is not treated as remote speech.", badge: "Suppressed", tone: "neutral" };
    }
    if (incoming.capture_active) {
      return {
        label: incoming.stage === "transcribing" || incoming.stage === "translating"
          ? "Incoming English speech is being prepared as Indonesian text."
          : "Incoming English → Indonesian text is listening through Meeting Sound.",
        badge: incoming.stage === "transcribing" || incoming.stage === "translating" ? "Processing" : "Listening",
        tone: "good",
      };
    }
    return { label: "Incoming Meeting Sound is not active. Outbound translation can continue independently.", badge: "Optional", tone: "neutral" };
  }

  const incoming = $derived(incomingCopy());
</script>

<section class="grid gap-4" aria-live="polite">
  <div class="ti-subtle-card flex items-start justify-between gap-6 p-5">
    <div class="min-w-0">
      <span class="ti-kicker">Live activity</span>
      <h3 class="mb-0 mt-2 text-lg font-bold tracking-[-0.015em]">{activity.title}</h3>
      <p class="mb-0 mt-2 max-w-2xl text-sm leading-6 text-[var(--ti-text-muted)]">{activity.detail}</p>
    </div>
    <StatusBadge label={activity.label} tone={activity.tone} />
  </div>

  <div class="ti-subtle-card flex items-center justify-between gap-5 px-4 py-3">
    <p class="m-0 text-sm leading-6 text-[var(--ti-text-muted)]">{incoming.label}</p>
    <StatusBadge label={incoming.badge} tone={incoming.tone} />
  </div>

  <section class="overflow-hidden rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)]" aria-label="Meeting transcript">
    <header class="flex items-center justify-between border-b border-[var(--ti-border)] px-5 py-4">
      <div>
        <strong class="block text-sm">Transcript</strong>
        <span class="mt-1 block text-[11px] text-[var(--ti-text-soft)]">Finalized speech only</span>
      </div>
      <span class="ti-pill">{orderedTurns.length} turn{orderedTurns.length === 1 ? "" : "s"}</span>
    </header>

    {#if !turns || !turns.ok || !turns.has_session || turns.session_id !== status.session_id}
      <p class="m-0 px-5 py-5 text-sm leading-6 text-[var(--ti-text-muted)]">The live transcript is temporarily unavailable. Meeting lifecycle controls remain available.</p>
    {:else}
      {#if turns.truncated || turns.dropped_turn_count > 0}
        <p class="m-0 border-b border-[var(--ti-warning-border)] bg-[var(--ti-warning-surface)] px-5 py-3 text-xs leading-5 text-[var(--ti-warning)]">
          {turns.dropped_turn_count} earlier turn{turns.dropped_turn_count === 1 ? " is" : "s are"} no longer shown in this bounded live view.
        </p>
      {/if}

      {#if orderedTurns.length === 0}
        <p class="m-0 px-5 py-7 text-sm leading-6 text-[var(--ti-text-muted)]">No finalized translation yet. Committed Meeting turns will appear here in speech order.</p>
      {:else}
        <div class="max-h-[420px] overflow-y-auto bg-[var(--ti-surface)]">
          {#each orderedTurns as turn (turn.sequence)}
            <article class="border-b border-[var(--ti-border)] px-5 py-4 last:border-b-0">
              <header class="mb-3 flex items-center justify-between gap-4">
                <div class="flex items-center gap-2">
                  <span class={`size-2 rounded-full ${turn.lane === "incoming" ? "bg-[var(--ti-text-soft)]" : "bg-[var(--ti-success)]"}`}></span>
                  <span class="text-[11px] font-black tracking-[0.12em] text-[var(--ti-text-muted)]">{turn.lane === "incoming" ? "INCOMING" : "YOU"}</span>
                </div>
                {#if turn.lane !== "incoming"}
                  <span class="text-xs text-[var(--ti-text-soft)]">{deliveryLabel(turn)}</span>
                {/if}
              </header>
              <p class="m-0 text-[15px] font-semibold leading-6" lang="id">{turn.lane === "incoming" ? turn.translated_text : turn.source_text}</p>
              <div class="mt-2 flex items-start gap-2">
                <span class="mt-1 text-[10px] font-bold tracking-[0.08em] text-[var(--ti-text-soft)]">EN</span>
                <p class="m-0 text-sm leading-6 text-[var(--ti-text-muted)]" lang="en">{turn.lane === "incoming" ? turn.source_text : turn.translated_text}</p>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    {/if}
  </section>
</section>
