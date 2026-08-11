<script lang="ts">
  import { ArrowLeft, Check, ChevronRight } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { runtimeApi } from "../app/bridge/runtimeApi";
  import {
    runtimeProductFacade,
    type ProductAudioDeviceKind,
    type ProductRuntimeSnapshot,
  } from "../app/bridge/runtimeProductFacade";
  import { errorMessage } from "../app/shared/state";
  import type { AudioDeviceListReport, RuntimeSettings } from "../app/shared/types";
  import StatusBadge from "../components/ui/StatusBadge.svelte";

  type SetupStep = 1 | 2 | 3 | 4 | 5;
  type SetupState = "new" | "deferred" | "completed";

  let {
    initialSettings,
    onComplete,
  }: {
    initialSettings: RuntimeSettings;
    onComplete: (settings: RuntimeSettings) => void | Promise<void>;
  } = $props();

  function cloneSettings(value: RuntimeSettings): RuntimeSettings {
    return { ...value, audio: { ...value.audio } };
  }

  function checkpoint(value: RuntimeSettings): SetupStep {
    const step = Math.round(Number(value.meeting_setup_checkpoint || 1));
    return Math.max(1, Math.min(5, step)) as SetupStep;
  }

  let settings = $state<RuntimeSettings>(cloneSettings(initialSettings));
  let snapshot = $state<ProductRuntimeSnapshot | null>(null);
  let devices = $state<AudioDeviceListReport | null>(null);
  let meetingSoundReady = $state<boolean | null>(null);
  let step = $state<SetupStep>(checkpoint(settings));
  let busy = $state(false);
  let message = $state("");
  let selectedMicrophone = $state(String(settings.audio.input_device_id ?? ""));
  let selectedMeetingSound = $state(String(settings.audio.output_device_id ?? ""));

  function compact(value: unknown, fallback = "Unavailable"): string {
    const clean = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!clean) return fallback;
    return clean.length > 180 ? `${clean.slice(0, 179).trimEnd()}…` : clean;
  }

  function deviceId(device: { id?: string; name: string }): string {
    return String(device.id ?? device.name).trim();
  }

  function devicesFor(kind: ProductAudioDeviceKind) {
    return kind === "microphone" ? devices?.input_devices ?? [] : devices?.output_devices ?? [];
  }

  function currentDevice(kind: ProductAudioDeviceKind): string {
    const value = kind === "microphone" ? settings.audio.input_device_id : settings.audio.output_device_id;
    return String(value ?? "").trim();
  }

  function savedDeviceMissing(kind: ProductAudioDeviceKind): boolean {
    const current = currentDevice(kind);
    return Boolean(current && devices && !devicesFor(kind).some((device) => deviceId(device) === current));
  }

  function currentMicrophone(): string {
    return compact(snapshot?.inputStatus?.selected_device_name ?? settings.audio.input_device_id, "Windows Default");
  }

  function currentMeetingSound(): string {
    return compact(settings.audio.output_device_id, "Windows Default");
  }

  async function refreshSnapshot(): Promise<void> {
    try {
      snapshot = await runtimeProductFacade.loadProductRuntimeSnapshot();
      settings = cloneSettings(snapshot.settings ?? settings);
      selectedMicrophone = String(settings.audio.input_device_id ?? "");
      selectedMeetingSound = String(settings.audio.output_device_id ?? "");
    } catch (error) {
      message = `Setup check failed: ${errorMessage(error)}`;
    }
  }

  async function refreshDevices(): Promise<void> {
    try {
      devices = await runtimeProductFacade.loadProductAudioDevices();
      if (!devices.ok && !message) message = devices.note ?? "Audio devices are unavailable.";
    } catch (error) {
      devices = null;
      if (!message) message = `Audio devices could not be listed: ${errorMessage(error)}`;
    }
  }

  async function refreshMeetingSoundProbe(): Promise<void> {
    try {
      const probe = await runtimeProductFacade.probeProductAudioDevice("meeting-sound", settings.audio.output_device_id);
      meetingSoundReady = probe.ok;
      if (!probe.ok && !message) message = probe.message;
    } catch (error) {
      meetingSoundReady = false;
      if (!message) message = `Meeting sound could not be checked: ${errorMessage(error)}`;
    }
  }

  function safeResumeStep(value: SetupStep): SetupStep {
    if (value <= 2) return value;
    if (!snapshot?.readiness.microphoneReady) return 2;
    if (value >= 5 && !snapshot.readiness.meetingRouteReady) return 4;
    return value;
  }

  async function initialize(): Promise<void> {
    if (step > 1) {
      await refreshSnapshot();
      step = safeResumeStep(step);
      if (step === 2 || step === 3) await refreshDevices();
      if (step === 3) await refreshMeetingSoundProbe();
    }
  }

  async function persistSetupFact(state: SetupState, nextCheckpoint: SetupStep): Promise<boolean> {
    const candidate = cloneSettings(settings);
    candidate.meeting_setup_state = state;
    candidate.meeting_setup_checkpoint = Math.max(checkpoint(candidate), nextCheckpoint);
    try {
      const result = await runtimeApi.saveSettings(candidate);
      if (!result.ok) throw new Error(result.message || "Setup progress could not be saved.");
      settings = cloneSettings(await runtimeApi.loadSettings().catch(() => candidate));
      return true;
    } catch (error) {
      message = `Setup progress was not saved: ${errorMessage(error)}`;
      return false;
    }
  }

  async function advance(nextStep: SetupStep): Promise<void> {
    if (busy) return;
    busy = true;
    message = "Saving setup progress...";
    const saved = await persistSetupFact("new", nextStep);
    if (saved) {
      step = nextStep;
      message = "";
      if (nextStep === 2 || nextStep === 4 || nextStep === 5) await refreshSnapshot();
      if (nextStep === 2 || nextStep === 3) await refreshDevices();
      if (nextStep === 3) await refreshMeetingSoundProbe();
    }
    busy = false;
  }

  function goBack(): void {
    if (busy || step <= 1) return;
    step = Math.max(1, step - 1) as SetupStep;
    message = "";
    if (step === 2 || step === 3) void refreshDevices();
  }

  async function deferSetup(): Promise<void> {
    if (busy) return;
    busy = true;
    message = "Saving your choice...";
    const saved = await persistSetupFact("deferred", step);
    busy = false;
    if (saved) await onComplete(settings);
  }

  async function saveSelectedDevice(kind: ProductAudioDeviceKind): Promise<void> {
    if (busy) return;
    const candidate = (kind === "microphone" ? selectedMicrophone : selectedMeetingSound).trim() || null;
    const current = kind === "microphone" ? settings.audio.input_device_id : settings.audio.output_device_id;
    if ((current ?? null) === candidate) return;

    busy = true;
    message = kind === "microphone" ? "Checking microphone before saving..." : "Checking Meeting sound before saving...";
    try {
      const result = await runtimeProductFacade.selectProductAudioDevice(kind, candidate);
      settings = cloneSettings(result.settings);
      message = result.message;
      if (result.ok) {
        selectedMicrophone = String(settings.audio.input_device_id ?? "");
        selectedMeetingSound = String(settings.audio.output_device_id ?? "");
        await refreshDevices();
        if (kind === "microphone") await refreshSnapshot();
        else await refreshMeetingSoundProbe();
      }
    } catch (error) {
      message = `Device preference was not changed: ${errorMessage(error)}`;
    } finally {
      busy = false;
    }
  }

  async function checkMicrophone(): Promise<void> {
    if (busy) return;
    busy = true;
    message = "Checking your microphone...";
    try {
      const result = await runtimeProductFacade.runProductSetupAction("check-microphone");
      await refreshSnapshot();
      message = snapshot?.readiness.microphoneReady
        ? "Your microphone is ready."
        : compact(result, "Microphone setup still needs attention.");
    } catch (error) {
      message = `Microphone check failed: ${errorMessage(error)}`;
    } finally {
      busy = false;
    }
  }

  async function fixSetup(): Promise<void> {
    if (busy) return;
    busy = true;
    message = "Running setup checks...";
    try {
      const result = await runtimeProductFacade.runProductRecoveryAction("fix-setup");
      await refreshSnapshot();
      message = compact(result, "Setup check completed.");
    } catch (error) {
      message = `Setup check failed: ${errorMessage(error)}`;
    } finally {
      busy = false;
    }
  }

  async function verifySetup(): Promise<void> {
    if (busy) return;
    busy = true;
    message = "Checking your setup...";
    await refreshSnapshot();
    message = snapshot?.readiness.meetingReady
      ? "Required Meeting translation setup is ready."
      : compact(snapshot?.readiness.summary, "Setup still needs attention.");
    busy = false;
  }

  async function completeSetup(): Promise<void> {
    if (busy || !snapshot?.readiness.meetingReady) return;
    busy = true;
    message = "Saving setup completion...";
    const saved = await persistSetupFact("completed", 5);
    busy = false;
    if (saved) await onComplete(settings);
  }

  function selectValue(event: Event): string {
    return (event.currentTarget as HTMLSelectElement).value;
  }

  onMount(() => {
    void initialize();
  });
</script>

<main class="grid min-h-screen place-items-center overflow-y-auto bg-[var(--ti-bg)] px-8 py-10" aria-label="TranslateIT First Setup">
  <section class="ti-panel w-full max-w-[900px] p-7">
    <header class="flex items-center gap-3 border-b border-[var(--ti-border)] pb-5">
      <div class="grid size-11 place-items-center rounded-[14px] border border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)] text-lg font-black">T</div>
      <div>
        <strong class="block text-sm">TranslateIT</strong>
        <span class="mt-1 block text-xs text-[var(--ti-text-muted)]">Meeting translation setup</span>
      </div>
      <div class="ml-auto min-w-40">
        <div class="flex items-center justify-between text-[11px] font-bold text-[var(--ti-text-muted)]"><span>Setup progress</span><span>{step}/5</span></div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ti-surface-soft)]"><div class="h-full rounded-full bg-[var(--ti-accent)]" style={`width:${step * 20}%`}></div></div>
      </div>
    </header>

    <section class="mx-auto grid max-w-[720px] gap-6 py-9">
      {#if step === 1}
        <div>
          <span class="ti-kicker">Welcome</span>
          <h1 class="mb-0 mt-3 text-4xl font-black tracking-[-0.04em]">Speak Indonesian. Your meeting hears English.</h1>
          <p class="mb-0 mt-4 max-w-2xl text-sm leading-6 text-[var(--ti-text-muted)]">Understand English conversations with Indonesian live translation. TranslateIT runs locally after the required setup is available.</p>
          <div class="mt-6 flex flex-wrap gap-2 text-xs text-[var(--ti-text-muted)]">
            <span class="rounded-full border border-[var(--ti-border)] px-3 py-2">Indonesian → English voice</span>
            <span class="rounded-full border border-[var(--ti-border)] px-3 py-2">English → Indonesian text</span>
          </div>
        </div>
      {:else if step === 2}
        <div>
          <span class="ti-kicker">Your microphone</span>
          <h1 class="mb-0 mt-3 text-3xl font-black tracking-[-0.035em]">Set up the microphone you speak into.</h1>
          <p class="mb-0 mt-3 text-sm leading-6 text-[var(--ti-text-muted)]">Choose Windows Default or pin one microphone. TranslateIT checks the candidate before replacing your saved preference.</p>
        </div>
        <div class="grid grid-cols-[1fr_auto] items-end gap-3">
          <label class="grid gap-2">
            <span class="text-xs font-bold text-[var(--ti-text-muted)]">Microphone</span>
            <select class="ti-field min-h-11 px-3" disabled={busy} value={selectedMicrophone} onchange={(event) => { selectedMicrophone = selectValue(event); }}>
              <option value="">Windows Default</option>
              {#each devicesFor("microphone") as device (deviceId(device))}
                <option value={deviceId(device)}>{device.name}{device.is_default ? " · current Windows default" : ""}</option>
              {/each}
              {#if savedDeviceMissing("microphone")}
                <option value={currentDevice("microphone")}>{currentDevice("microphone")} · unavailable</option>
              {/if}
            </select>
          </label>
          <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void saveSelectedDevice("microphone")}>Use Microphone</button>
        </div>
        <div class="flex items-center justify-between gap-6 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-4">
          <div><span class="text-xs text-[var(--ti-text-muted)]">Current microphone</span><strong class="mt-1 block text-sm">{currentMicrophone()}</strong></div>
          <StatusBadge label={snapshot?.readiness.microphoneReady ? "Ready" : snapshot?.readiness.level === "checking" ? "Checking" : "Setup Needed"} tone={snapshot?.readiness.microphoneReady ? "good" : snapshot?.readiness.level === "checking" ? "neutral" : "warning"} />
        </div>
      {:else if step === 3}
        <div>
          <span class="ti-kicker">Meeting sound</span>
          <h1 class="mb-0 mt-3 text-3xl font-black tracking-[-0.035em]">Where do you listen to your meetings?</h1>
          <p class="mb-0 mt-3 text-sm leading-6 text-[var(--ti-text-muted)]">Choose Windows Default or pin one output device. The endpoint is checked before the preference is saved.</p>
        </div>
        <div class="grid grid-cols-[1fr_auto] items-end gap-3">
          <label class="grid gap-2">
            <span class="text-xs font-bold text-[var(--ti-text-muted)]">Meeting sound</span>
            <select class="ti-field min-h-11 px-3" disabled={busy} value={selectedMeetingSound} onchange={(event) => { selectedMeetingSound = selectValue(event); }}>
              <option value="">Windows Default</option>
              {#each devicesFor("meeting-sound") as device (deviceId(device))}
                <option value={deviceId(device)}>{device.name}{device.is_default ? " · current Windows default" : ""}</option>
              {/each}
              {#if savedDeviceMissing("meeting-sound")}
                <option value={currentDevice("meeting-sound")}>{currentDevice("meeting-sound")} · unavailable</option>
              {/if}
            </select>
          </label>
          <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void saveSelectedDevice("meeting-sound")}>Use Meeting Sound</button>
        </div>
        <div class="flex items-center justify-between gap-6 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-4">
          <div><span class="text-xs text-[var(--ti-text-muted)]">Current Meeting sound</span><strong class="mt-1 block text-sm">{currentMeetingSound()}</strong></div>
          <StatusBadge label={meetingSoundReady ? "Device ready" : "Check device"} tone={meetingSoundReady ? "good" : "warning"} />
        </div>
        <p class="m-0 text-xs leading-5 text-[var(--ti-text-soft)]">Incoming English → Indonesian is optional. Selecting Meeting Sound does not by itself claim that incoming capture is already working.</p>
      {:else if step === 4}
        <div>
          <span class="ti-kicker">Meeting microphone</span>
          <h1 class="mb-0 mt-3 text-3xl font-black tracking-[-0.035em]">Prepare TranslateIT Meeting Microphone.</h1>
          <p class="mb-0 mt-3 text-sm leading-6 text-[var(--ti-text-muted)]">In Zoom, Meet, Teams, or another meeting app, choose this as your microphone.</p>
        </div>
        <div class="flex items-center justify-between gap-6 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-5">
          <div><span class="text-xs text-[var(--ti-text-muted)]">Meeting microphone</span><strong class="mt-1 block text-sm">TranslateIT Meeting Microphone</strong></div>
          <StatusBadge label={snapshot?.readiness.meetingRouteReady ? "Ready" : snapshot?.readiness.level === "checking" ? "Checking" : "Setup Needed"} tone={snapshot?.readiness.meetingRouteReady ? "good" : snapshot?.readiness.level === "checking" ? "neutral" : "warning"} />
        </div>
        <div class="rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-raised)] p-4 text-sm"><span class="text-[var(--ti-text-muted)]">In your meeting app</span><strong class="mt-1 block">Microphone → TranslateIT Meeting Microphone</strong></div>
      {:else}
        <div>
          <span class="ti-kicker">Verify / Ready</span>
          <h1 class="mb-0 mt-3 text-3xl font-black tracking-[-0.035em]">{snapshot?.readiness.meetingReady ? "You're ready to translate." : "Setup still needs attention."}</h1>
          <p class="mb-0 mt-3 text-sm leading-6 text-[var(--ti-text-muted)]">TranslateIT rechecks current capabilities here instead of trusting an old Ready flag.</p>
        </div>
        <div class="grid gap-2">
          <div class="flex items-center justify-between rounded-[var(--ti-radius-sm)] border border-[var(--ti-border)] px-4 py-3"><span class="text-sm">Your microphone</span><StatusBadge label={snapshot?.readiness.microphoneReady ? "Ready" : "Setup Needed"} tone={snapshot?.readiness.microphoneReady ? "good" : "warning"} /></div>
          <div class="flex items-center justify-between rounded-[var(--ti-radius-sm)] border border-[var(--ti-border)] px-4 py-3"><span class="text-sm">Local translation</span><StatusBadge label={snapshot?.readiness.textReady ? "Ready" : "Setup Needed"} tone={snapshot?.readiness.textReady ? "good" : "warning"} /></div>
          <div class="flex items-center justify-between rounded-[var(--ti-radius-sm)] border border-[var(--ti-border)] px-4 py-3"><span class="text-sm">Meeting microphone</span><StatusBadge label={snapshot?.readiness.meetingRouteReady ? "Ready" : "Setup Needed"} tone={snapshot?.readiness.meetingRouteReady ? "good" : "warning"} /></div>
          <div class="flex items-center justify-between rounded-[var(--ti-radius-sm)] border border-[var(--ti-border)] px-4 py-3"><span class="text-sm">Incoming translation</span><StatusBadge label="Optional" tone="neutral" /></div>
        </div>
      {/if}

      {#if message}
        <p class="m-0 rounded-[var(--ti-radius-sm)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--ti-text-muted)]" aria-live="polite">{message}</p>
      {/if}

      <footer class="flex items-center justify-between gap-4 border-t border-[var(--ti-border)] pt-5">
        <div>
          {#if step > 1}
            <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={goBack}><ArrowLeft size={16} /> Back</button>
          {/if}
        </div>
        <div class="flex flex-wrap justify-end gap-3">
          <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void deferSetup()}>Set up later</button>
          {#if step === 1}
            <button type="button" class="ti-button" disabled={busy} onclick={() => void advance(2)}>Set Up Meeting <ChevronRight size={16} /></button>
          {:else if step === 2}
            <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void checkMicrophone()}>Check Microphone</button>
            <button type="button" class="ti-button" disabled={busy || !snapshot?.readiness.microphoneReady} onclick={() => void advance(3)}>Continue <ChevronRight size={16} /></button>
          {:else if step === 3}
            <button type="button" class="ti-button" disabled={busy} onclick={() => void advance(4)}>Continue <ChevronRight size={16} /></button>
          {:else if step === 4}
            <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void fixSetup()}>Fix Setup</button>
            <button type="button" class="ti-button" disabled={busy || !snapshot?.readiness.meetingRouteReady} onclick={() => void advance(5)}>Continue <ChevronRight size={16} /></button>
          {:else}
            <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void verifySetup()}>Retry</button>
            {#if !snapshot?.readiness.meetingReady}
              <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void fixSetup()}>Fix Setup</button>
            {/if}
            <button type="button" class="ti-button" disabled={busy || !snapshot?.readiness.meetingReady} onclick={() => void completeSetup()}><Check size={16} /> Go to Meeting</button>
          {/if}
        </div>
      </footer>
    </section>
  </section>
</main>
