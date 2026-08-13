<script lang="ts">
  import { Check, Circle, Mic, Play, RotateCcw, Square } from "@lucide/svelte";
  import { onMount } from "svelte";
  import {
    voiceLabApi,
    type GuidedRecordingActionResult,
    type GuidedRecordingState,
  } from "../app/bridge/voiceLabApi";

  let {
    onNotice,
    onRecordingChange,
  }: {
    onNotice: (message: string) => void;
    onRecordingChange: (recording: boolean) => void;
  } = $props();

  let state = $state<GuidedRecordingState>({ recording_line_id: null, pending_review: null, lines: [] });
  let selectedLineId = $state<number | null>(null);
  let authorized = $state(false);
  let busy = $state(false);
  let replaying = $state(false);
  let audio: HTMLAudioElement | null = null;
  let audioUrl: string | null = null;

  const acceptedCount = $derived(state.lines.filter((line) => line.accepted).length);
  const currentLine = $derived(state.lines.find((line) => line.line_id === selectedLineId) ?? null);
  const isRecording = $derived(state.recording_line_id !== null);
  const pendingLineId = $derived(state.pending_review?.line_id ?? null);

  function chooseDefaultLine(next: GuidedRecordingState): void {
    if (next.recording_line_id !== null) {
      selectedLineId = next.recording_line_id;
      return;
    }
    if (next.pending_review) {
      selectedLineId = next.pending_review.line_id;
      return;
    }
    if (selectedLineId !== null && next.lines.some((line) => line.line_id === selectedLineId)) return;
    selectedLineId = next.lines.find((line) => !line.accepted)?.line_id ?? next.lines[0]?.line_id ?? null;
  }

  function applyState(next: GuidedRecordingState): void {
    state = next;
    chooseDefaultLine(next);
    onRecordingChange(next.recording_line_id !== null);
  }

  function applyResult(result: GuidedRecordingActionResult): void {
    applyState(result.recording);
    onNotice(result.message);
  }

  async function refresh(): Promise<void> {
    const next = await voiceLabApi.getState();
    applyState(next);
  }

  async function startRecording(): Promise<void> {
    if (busy || selectedLineId === null) return;
    if (!authorized) {
      onNotice("Confirm that this is your voice, or that you have permission to use it.");
      return;
    }
    busy = true;
    try {
      applyResult(await voiceLabApi.startTake(selectedLineId, authorized));
    } finally {
      busy = false;
    }
  }

  async function stopRecording(): Promise<void> {
    if (busy || state.recording_line_id === null) return;
    busy = true;
    try {
      applyResult(await voiceLabApi.stopTake(state.recording_line_id));
    } finally {
      busy = false;
    }
  }

  async function retryTake(): Promise<void> {
    if (busy || pendingLineId === null) return;
    stopReplay();
    busy = true;
    try {
      applyResult(await voiceLabApi.retryTake(pendingLineId));
    } finally {
      busy = false;
    }
  }

  async function acceptTake(): Promise<void> {
    if (busy || pendingLineId === null || state.pending_review?.quality_blocker) return;
    stopReplay();
    busy = true;
    try {
      const result = await voiceLabApi.acceptTake(pendingLineId);
      applyResult(result);
      if (result.ok) {
        selectedLineId = result.recording.lines.find((line) => !line.accepted)?.line_id ?? pendingLineId;
      }
    } finally {
      busy = false;
    }
  }

  function stopReplay(): void {
    audio?.pause();
    audio = null;
    replaying = false;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }

  async function replayTake(): Promise<void> {
    if (busy || replaying || selectedLineId === null) return;
    const bytes = await voiceLabApi.getTakeAudio(selectedLineId);
    if (!bytes) {
      onNotice("This take isn't available for replay yet.");
      return;
    }
    stopReplay();
    const blob = new Blob([bytes], { type: "audio/wav" });
    audioUrl = URL.createObjectURL(blob);
    audio = new Audio(audioUrl);
    replaying = true;
    audio.onended = stopReplay;
    audio.onerror = () => {
      stopReplay();
      onNotice("The recorded take couldn't be played.");
    };
    try {
      await audio.play();
      onNotice("Playing the recorded take.");
    } catch {
      stopReplay();
      onNotice("The recorded take couldn't be played.");
    }
  }

  onMount(() => {
    void refresh();
    return () => {
      stopReplay();
      onRecordingChange(false);
    };
  });
</script>

<section class="ti-page ti-page-wide">
  <header class="ti-page-header">
    <div>
      <h2 class="ti-page-title">VoiceLab</h2>
      <p class="ti-page-copy">Record clear English lines to build your reusable meeting voice.</p>
    </div>
    <span class="ti-pill">{acceptedCount}/{state.lines.length || "—"} accepted</span>
  </header>

  <div class="grid grid-cols-[minmax(0,1fr)_300px] gap-5">
    <article class="ti-panel p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="ti-kicker">My Voice</span>
          <h3 class="mb-0 mt-2 text-xl font-semibold tracking-[-0.02em]">Guided recording</h3>
          <p class="mb-0 mt-2 max-w-[680px] text-sm leading-6 text-[var(--ti-text-muted)]">Use the same microphone and a quiet room. Read each line in your normal speaking voice.</p>
        </div>
      </div>

      <label class="mt-6 flex items-start gap-3 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-4">
        <input class="mt-0.5 size-4 accent-[var(--ti-action)]" type="checkbox" bind:checked={authorized} disabled={isRecording} />
        <span class="text-sm leading-5 text-[var(--ti-text-muted)]">I own this voice or have permission to create and use this Voice Actor.</span>
      </label>

      {#if currentLine}
        <div class="mt-6 rounded-[var(--ti-radius-lg)] border border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)] p-6">
          <div class="flex items-center justify-between gap-3">
            <span class="ti-field-label">Line {currentLine.line_id}</span>
            {#if currentLine.accepted}
              <span class="flex items-center gap-1.5 text-xs font-semibold text-[var(--ti-success)]"><Check size={14} />Accepted</span>
            {/if}
          </div>
          <p class="mb-0 mt-5 text-[20px] font-medium leading-8 tracking-[-0.015em]">{currentLine.text}</p>
        </div>

        {#if state.pending_review && pendingLineId === currentLine.line_id}
          <div class="mt-5 border-l-2 border-[var(--ti-border-strong)] pl-4">
            <strong class="text-sm font-semibold">Review this take</strong>
            <p class={`mb-0 mt-1 text-sm leading-5 ${state.pending_review.quality_blocker ? "text-[var(--ti-danger)]" : "text-[var(--ti-text-muted)]"}`}>
              {state.pending_review.quality_blocker
                ? "This recording has a basic signal-quality problem. Replay it if useful, then record the line again."
                : "Listen once before accepting it for your Voice Actor dataset."}
            </p>
          </div>
        {/if}

        <div class="mt-6 flex flex-wrap items-center gap-3">
          {#if isRecording && state.recording_line_id === currentLine.line_id}
            <button type="button" class="ti-button ti-button-danger" disabled={busy} onclick={() => void stopRecording()}>
              <Square size={15} fill="currentColor" /><span>{busy ? "Stopping..." : "Stop"}</span>
            </button>
            <span class="flex items-center gap-2 text-sm text-[var(--ti-danger)]"><span class="size-2 animate-pulse rounded-full bg-current"></span>Recording</span>
          {:else if state.pending_review && pendingLineId === currentLine.line_id}
            <button type="button" class="ti-button ti-button-secondary" disabled={busy || replaying} onclick={() => void replayTake()}>
              <Play size={15} /><span>{replaying ? "Playing..." : "Replay"}</span>
            </button>
            <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void retryTake()}>
              <RotateCcw size={15} /><span>Retry</span>
            </button>
            {#if !state.pending_review.quality_blocker}
              <button type="button" class="ti-button" disabled={busy} onclick={() => void acceptTake()}>
                <Check size={15} /><span>{busy ? "Saving..." : "Accept"}</span>
              </button>
            {/if}
          {:else}
            <button type="button" class="ti-button" disabled={busy || !authorized} onclick={() => void startRecording()}>
              <Mic size={15} /><span>{currentLine.accepted ? "Record Again" : "Record"}</span>
            </button>
            {#if currentLine.accepted}
              <button type="button" class="ti-button ti-button-secondary" disabled={busy || replaying} onclick={() => void replayTake()}>
                <Play size={15} /><span>{replaying ? "Playing..." : "Replay Accepted"}</span>
              </button>
            {/if}
          {/if}
        </div>
      {:else}
        <div class="mt-6 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] p-5 text-sm text-[var(--ti-text-muted)]">VoiceLab recording lines are unavailable right now.</div>
      {/if}

      <p class="mb-0 mt-7 text-xs leading-5 text-[var(--ti-text-soft)]">Accepted takes stay on this device and are prepared for the later Voice Actor build. Recording count alone is not treated as proof of voice quality.</p>
    </article>

    <aside class="ti-panel overflow-hidden">
      <div class="border-b border-[var(--ti-border)] px-4 py-3.5">
        <strong class="text-sm font-semibold">Recording lines</strong>
      </div>
      <div class="max-h-[590px] overflow-y-auto p-2">
        {#each state.lines as line}
          <button
            type="button"
            class={`flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-sm transition-colors ${selectedLineId === line.line_id ? "bg-[var(--ti-surface-raised)] text-[var(--ti-text)]" : "text-[var(--ti-text-muted)] hover:bg-[var(--ti-surface-soft)]"}`}
            disabled={isRecording || state.pending_review !== null}
            onclick={() => { selectedLineId = line.line_id; }}
          >
            {#if line.accepted}
              <Check size={15} class="shrink-0 text-[var(--ti-success)]" />
            {:else}
              <Circle size={13} class="shrink-0 text-[var(--ti-text-soft)]" />
            {/if}
            <span class="min-w-0 flex-1 truncate">Line {line.line_id}</span>
          </button>
        {/each}
      </div>
    </aside>
  </div>
</section>
