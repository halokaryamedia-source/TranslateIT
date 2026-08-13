<script lang="ts">
  import { Check, Play, Square } from "@lucide/svelte";
  import { onMount } from "svelte";
  import {
    voiceLabBuildApi,
    type VoiceLabBuildActionResult,
    type VoiceLabBuildStatus,
  } from "../../app/bridge/voiceLabBuildApi";

  let { onNotice }: { onNotice: (message: string) => void } = $props();

  let build = $state<VoiceLabBuildStatus>({
    active: false,
    generation: null,
    phase: "checking",
    message: "Checking VoiceLab recordings...",
    accepted_take_count: 0,
    accepted_duration_ms: 0,
    minimum_duration_ms: 60_000,
    can_build: false,
    evaluation_ready: false,
    evaluation_samples: [],
    approved_voice_ready: false,
  });
  let authorized = $state(false);
  let busy = $state(false);
  let playingLineId = $state<number | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let audio: HTMLAudioElement | null = null;
  let audioUrl: string | null = null;

  function formatDuration(milliseconds: number): string {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function stopAudio(): void {
    audio?.pause();
    audio = null;
    playingLineId = null;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }

  function schedulePoll(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!build.active) return;
    timer = setTimeout(() => void refresh(), 1400);
  }

  function applyStatus(next: VoiceLabBuildStatus): void {
    build = next;
    schedulePoll();
  }

  function applyResult(result: VoiceLabBuildActionResult): void {
    applyStatus(result.build);
    onNotice(result.message);
  }

  async function refresh(): Promise<void> {
    applyStatus(await voiceLabBuildApi.getStatus());
  }

  async function startBuild(): Promise<void> {
    if (busy || !build.can_build || !authorized) return;
    stopAudio();
    busy = true;
    try {
      applyResult(await voiceLabBuildApi.start(authorized));
    } finally {
      busy = false;
    }
  }

  async function cancelBuild(): Promise<void> {
    if (busy || !build.active) return;
    busy = true;
    try {
      applyResult(await voiceLabBuildApi.cancel());
    } finally {
      busy = false;
    }
  }

  async function approve(): Promise<void> {
    if (busy || build.active || !build.evaluation_ready) return;
    stopAudio();
    busy = true;
    try {
      applyResult(await voiceLabBuildApi.approve());
    } finally {
      busy = false;
    }
  }

  async function playEvaluation(lineId: number): Promise<void> {
    if (busy || playingLineId !== null) return;
    const bytes = await voiceLabBuildApi.getEvaluationAudio(lineId);
    if (!bytes) {
      onNotice("This VoiceLab preview is unavailable.");
      return;
    }
    stopAudio();
    audioUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
    audio = new Audio(audioUrl);
    playingLineId = lineId;
    audio.onended = stopAudio;
    audio.onerror = () => {
      stopAudio();
      onNotice("This VoiceLab preview couldn't be played.");
    };
    try {
      await audio.play();
    } catch {
      stopAudio();
      onNotice("This VoiceLab preview couldn't be played.");
    }
  }

  onMount(() => {
    void refresh();
    return () => {
      if (timer) clearTimeout(timer);
      stopAudio();
    };
  });
</script>

<section class="ti-panel mt-5 p-6">
  <div class="flex items-start justify-between gap-5">
    <div>
      <span class="ti-kicker">Voice Actor</span>
      <h3 class="mb-0 mt-2 text-xl font-semibold tracking-[-0.02em]">Create My Voice</h3>
      <p class="mb-0 mt-2 max-w-[680px] text-sm leading-6 text-[var(--ti-text-muted)]">VoiceLab uses your accepted recordings to create one local English meeting voice, then gives you new sentences to review before anything is approved.</p>
    </div>
    {#if build.approved_voice_ready}
      <span class="flex items-center gap-1.5 text-sm font-semibold text-[var(--ti-success)]"><Check size={15} />My Voice ready</span>
    {/if}
  </div>

  <div class="mt-5 flex items-center justify-between gap-4 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-4 py-3.5">
    <div>
      <strong class="text-sm font-semibold">Accepted speech</strong>
      <p class="mb-0 mt-1 text-xs text-[var(--ti-text-muted)]">{build.accepted_take_count} reviewed takes · {formatDuration(build.accepted_duration_ms)} recorded</p>
    </div>
    <span class="text-xs font-medium text-[var(--ti-text-soft)]">Minimum {formatDuration(build.minimum_duration_ms)}</span>
  </div>

  {#if build.active}
    <div class="mt-5 border-l-2 border-[var(--ti-border-strong)] pl-4">
      <strong class="text-sm font-semibold">{build.phase === "evaluating" ? "Checking your new voice" : build.phase === "cancelling" ? "Stopping creation" : "Creating My Voice"}</strong>
      <p class="mb-0 mt-1 text-sm leading-5 text-[var(--ti-text-muted)]">{build.message}</p>
    </div>
    <button type="button" class="ti-button ti-button-secondary mt-5" disabled={busy} onclick={() => void cancelBuild()}>
      <Square size={14} /><span>{busy ? "Stopping..." : "Stop Creating"}</span>
    </button>
  {:else if build.evaluation_ready}
    <div class="mt-5">
      <strong class="text-sm font-semibold">Listen before approving</strong>
      <p class="mb-0 mt-1 text-sm leading-5 text-[var(--ti-text-muted)]">These sentences were not part of your recording script. Approve only if the voice sounds like you.</p>
      <div class="mt-4 space-y-2">
        {#each build.evaluation_samples as sample}
          <div class="flex items-center gap-3 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] px-4 py-3">
            <button type="button" class="ti-button ti-button-secondary shrink-0" disabled={playingLineId !== null} onclick={() => void playEvaluation(sample.line_id)}>
              <Play size={14} /><span>{playingLineId === sample.line_id ? "Playing..." : "Preview"}</span>
            </button>
            <span class="text-sm leading-5 text-[var(--ti-text-muted)]">{sample.exact_text}</span>
          </div>
        {/each}
      </div>
      <button type="button" class="ti-button mt-5" disabled={busy} onclick={() => void approve()}>
        <Check size={15} /><span>{busy ? "Saving..." : "Approve My Voice"}</span>
      </button>
    </div>
  {:else}
    {#if !build.can_build}
      <p class="mb-0 mt-5 text-sm leading-5 text-[var(--ti-text-muted)]">{build.message}</p>
    {:else}
      <label class="mt-5 flex items-start gap-3 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] p-4">
        <input class="mt-0.5 size-4 accent-[var(--ti-action)]" type="checkbox" bind:checked={authorized} />
        <span class="text-sm leading-5 text-[var(--ti-text-muted)]">I confirm these recordings are my voice, or a voice I have permission to create.</span>
      </label>
      <button type="button" class="ti-button mt-4" disabled={busy || !authorized} onclick={() => void startBuild()}>
        <span>{busy ? "Starting..." : build.approved_voice_ready ? "Create Again" : "Create My Voice"}</span>
      </button>
    {/if}
  {/if}

  <p class="mb-0 mt-5 text-xs leading-5 text-[var(--ti-text-soft)]">VoiceLab does not treat recording count, training completion, or an internal similarity number as proof that the voice is good. Your held-out listening review is required before approval.</p>
</section>
