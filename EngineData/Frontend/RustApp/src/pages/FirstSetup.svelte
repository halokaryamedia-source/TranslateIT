<script lang="ts">
  import { ArrowLeft, Check, ChevronRight } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { runtimeApi, type VirtualMicRouteContractStatus } from "../app/bridge/runtimeApi";
  import {
    runtimeProductFacade,
    type ProductAudioDeviceKind,
    type ProductRuntimeSnapshot,
  } from "../app/bridge/runtimeProductFacade";
  import { cloneSettings, compact, deviceId } from "../app/shared/state";
  import type { AudioDeviceListReport, RuntimeSettings } from "../app/shared/types";
  import StatusRow from "../components/ui/StatusRow.svelte";

  type SetupStep = 1 | 2 | 3 | 4 | 5;
  type SetupState = "new" | "deferred" | "completed";

  let {
    initialSettings,
    onComplete,
    onOpenMyVoice,
  }: {
    initialSettings: RuntimeSettings;
    onComplete: (settings: RuntimeSettings) => void | Promise<void>;
    onOpenMyVoice: (settings: RuntimeSettings) => void | Promise<void>;
  } = $props();

  function checkpoint(value: RuntimeSettings): SetupStep {
    const step = Math.round(Number(value.meeting_setup_checkpoint || 1));
    return Math.max(1, Math.min(5, step)) as SetupStep;
  }

  // These are intentional one-time snapshots. Subsequent setup changes are owned
  // locally or refreshed explicitly through the existing runtime actions below.
  let settings = $state<RuntimeSettings>((() => cloneSettings(initialSettings))());
  let snapshot = $state<ProductRuntimeSnapshot | null>(null);
  let routeStatus = $state<VirtualMicRouteContractStatus | null>(null);
  let devices = $state<AudioDeviceListReport | null>(null);
  let meetingSoundReady = $state<boolean | null>(null);
  const myVoiceReady = $derived(snapshot?.readiness.approvedVoiceReady ?? null);
  let step = $state<SetupStep>((() => checkpoint(settings))());
  let busy = $state(false);
  let message = $state("");
  let selectedMicrophone = $state((() => String(settings.audio.input_device_id ?? ""))());
  let selectedMeetingSound = $state((() => String(settings.audio.output_device_id ?? ""))());

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

  function currentMeetingMicrophone(): string {
    return compact(routeStatus?.selected_input_device, "Meeting microphone not configured");
  }

  async function refreshSnapshot(): Promise<void> {
    try {
      const [nextSnapshot, nextRouteStatus] = await Promise.all([
        runtimeProductFacade.loadProductRuntimeSnapshot(),
        runtimeApi.getVirtualMicRouteStatus(),
      ]);
      snapshot = nextSnapshot;
      routeStatus = nextRouteStatus;
      settings = cloneSettings(snapshot.settings);
      selectedMicrophone = String(settings.audio.input_device_id ?? "");
      selectedMeetingSound = String(settings.audio.output_device_id ?? "");
    } catch {
      routeStatus = null;
      message = "Couldn't check setup. Try again.";
    }
  }

  async function refreshDevices(): Promise<void> {
    try {
      devices = await runtimeProductFacade.loadProductAudioDevices();
      if (!devices.ok && !message) message = "Audio devices are unavailable right now. Try again.";
    } catch {
      devices = null;
      if (!message) message = "Audio devices are unavailable right now. Try again.";
    }
  }

  async function refreshMeetingSoundProbe(): Promise<void> {
    try {
      const probe = await runtimeProductFacade.probeProductAudioDevice("meeting-sound", settings.audio.output_device_id);
      meetingSoundReady = probe.ok;
      if (!probe.ok && !message) message = probe.message;
    } catch {
      meetingSoundReady = false;
      if (!message) message = "Couldn't check meeting sound. Try again.";
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
      if (!result.ok) throw new Error("setup save failed");
      const savedSettings = await runtimeApi.loadSettings();
      settings = cloneSettings(savedSettings ?? candidate);
      return true;
    } catch {
      message = "Couldn't save setup progress. Try again.";
      return false;
    }
  }

  async function advance(nextStep: SetupStep): Promise<void> {
    if (busy) return;
    busy = true;
    message = "Saving...";
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
    message = "Saving...";
    const saved = await persistSetupFact("deferred", step);
    busy = false;
    if (saved) await onComplete(settings);
  }

  async function saveSelectedDevice(kind: ProductAudioDeviceKind): Promise<void> {
    if (busy) return;
    const candidate = (kind === "microphone" ? selectedMicrophone : selectedMeetingSound).trim() || null;

    busy = true;
    message = kind === "microphone" ? "Checking microphone..." : "Checking meeting sound...";
    try {
      const result = await runtimeProductFacade.selectProductAudioDevice(kind, candidate, settings);
      settings = cloneSettings(result.settings);
      message = result.message;
      if (result.ok) {
        selectedMicrophone = String(settings.audio.input_device_id ?? "");
        selectedMeetingSound = String(settings.audio.output_device_id ?? "");
        await refreshDevices();
        if (kind === "microphone") await refreshSnapshot();
        else await refreshMeetingSoundProbe();
      }
    } catch {
      message = "The device wasn't changed. Try again.";
    } finally {
      busy = false;
    }
  }

  async function fixSetup(): Promise<void> {
    if (busy) return;
    busy = true;
    message = "Checking setup...";
    try {
      const result = await runtimeProductFacade.runProductRecoveryAction("fix-setup");
      await refreshSnapshot();
      message = compact(result, "Setup check finished.");
    } catch {
      message = "Couldn't check setup. Try again.";
    } finally {
      busy = false;
    }
  }

  async function verifySetup(): Promise<void> {
    if (busy) return;
    busy = true;
    message = "Checking setup...";
    if (step === 5) {
      await runtimeProductFacade.runProductSetupAction("check-readiness");
    }
    await refreshSnapshot();
    message = myVoiceReady && snapshot?.readiness.meetingReady ? "Everything needed for Meeting translation is ready." : "Setup still needs attention.";
    busy = false;
  }

  async function openMyVoice(): Promise<void> {
    if (busy) return;
    busy = true;
    message = "Saving setup before choosing a Meeting voice...";
    const saved = await persistSetupFact("deferred", 5);
    busy = false;
    if (saved) await onOpenMyVoice(settings);
  }

  async function completeSetup(): Promise<void> {
    if (busy || !myVoiceReady || !snapshot?.readiness.meetingReady) return;
    busy = true;
    message = "Saving...";
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

<main class="grid min-h-screen place-items-center overflow-y-auto bg-[var(--ti-bg)] px-8 py-10" aria-label="TranslateIT Setup">
  <section class="ti-panel w-full max-w-[900px] overflow-hidden">
    <header class="flex items-center gap-3 border-b border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-7 py-5">
      <div class="grid size-10 place-items-center rounded-[12px] border border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)] text-base font-bold">T</div>
      <div>
        <strong class="block text-sm font-semibold">TranslateIT</strong>
        <span class="mt-0.5 block text-xs text-[var(--ti-text-muted)]">Meeting setup</span>
      </div>
      <div class="ml-auto min-w-44" role="progressbar" aria-label="Setup progress" aria-valuemin="1" aria-valuemax="5" aria-valuenow={step}>
        <div class="text-[11px] font-semibold text-[var(--ti-text-muted)]">Step {step} of 5</div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ti-border)]"><div class="h-full rounded-full bg-[var(--ti-accent)]" style={`width:${step * 20}%`}></div></div>
      </div>
    </header>

    <section class="mx-auto grid max-w-[720px] gap-6 px-8 py-9">
      {#if step === 1}
        <div>
          <span class="ti-kicker">Welcome</span>
          <h1 class="ti-page-title text-[2.2rem]">Set up meeting translation</h1>
          <p class="ti-page-copy">We'll check your meeting audio, then help you choose a ready Meeting voice. Built-in Male/Female work immediately; My Voice can replace them later.</p>
          <div class="mt-6 grid grid-cols-2 gap-3">
            <div class="ti-subtle-card p-4"><span class="ti-field-label">You speak</span><strong class="mt-1 block text-sm font-semibold">Indonesian → English voice</strong></div>
            <div class="ti-subtle-card p-4"><span class="ti-field-label">You read</span><strong class="mt-1 block text-sm font-semibold">English → Indonesian text</strong><small class="mt-1 block text-xs text-[var(--ti-text-soft)]">Optional</small></div>
          </div>
        </div>
      {:else if step === 2}
        <div><span class="ti-kicker">Microphone</span><h1 class="ti-page-title">Which microphone do you use?</h1><p class="ti-page-copy">Choose the microphone you normally speak into during calls.</p></div>
        <div class="grid grid-cols-[1fr_auto] items-end gap-3">
          <label class="grid gap-2"><span class="ti-field-label">Microphone</span><select class="ti-field min-h-11 px-3" disabled={busy} value={selectedMicrophone} onchange={(event) => { selectedMicrophone = selectValue(event); }}><option value="">Windows Default</option>{#each devicesFor("microphone") as device (deviceId(device))}<option value={deviceId(device)}>{device.name}{device.is_default ? " · Windows default" : ""}</option>{/each}{#if savedDeviceMissing("microphone")}<option value={currentDevice("microphone")}>{currentDevice("microphone")} · unavailable</option>{/if}</select></label>
          <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void saveSelectedDevice("microphone")}>Use This Microphone</button>
        </div>
        <div class="ti-subtle-card overflow-hidden"><StatusRow label="Selected microphone" value={currentMicrophone()} detail="The microphone you speak into." status={snapshot?.readiness.microphoneReady ? "" : snapshot?.readiness.level === "checking" ? "Checking" : "Setup Needed"} tone={snapshot?.readiness.level === "checking" ? "neutral" : "warning"} /></div>
      {:else if step === 3}
        <div><span class="ti-kicker">Meeting sound</span><h1 class="ti-page-title">Where do you hear the meeting?</h1><p class="ti-page-copy">Choose the speakers or headphones used by your meeting app. This is only needed for optional English → Indonesian text.</p></div>
        <div class="grid grid-cols-[1fr_auto] items-end gap-3">
          <label class="grid gap-2"><span class="ti-field-label">Meeting sound</span><select class="ti-field min-h-11 px-3" disabled={busy} value={selectedMeetingSound} onchange={(event) => { selectedMeetingSound = selectValue(event); }}><option value="">Windows Default</option>{#each devicesFor("meeting-sound") as device (deviceId(device))}<option value={deviceId(device)}>{device.name}{device.is_default ? " · Windows default" : ""}</option>{/each}{#if savedDeviceMissing("meeting-sound")}<option value={currentDevice("meeting-sound")}>{currentDevice("meeting-sound")} · unavailable</option>{/if}</select></label>
          <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void saveSelectedDevice("meeting-sound")}>Use This Device</button>
        </div>
        <div class="ti-subtle-card overflow-hidden"><StatusRow label="Selected meeting sound" value={currentMeetingSound()} detail="Optional incoming translation can listen here." status={meetingSoundReady ? "" : "Check Device"} tone="warning" /></div>
      {:else if step === 4}
        <div><span class="ti-kicker">Meeting microphone</span><h1 class="ti-page-title">Set your meeting microphone</h1><p class="ti-page-copy">In your meeting app, choose the exact microphone shown below.</p></div>
        <div class="rounded-[var(--ti-radius-md)] border border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)] p-5"><span class="ti-field-label">In your meeting app</span><strong class="mt-2 block text-base font-semibold">Microphone → {currentMeetingMicrophone()}</strong></div>
        <div class="ti-subtle-card overflow-hidden"><StatusRow label="Meeting microphone" value={currentMeetingMicrophone()} detail="TranslateIT uses this microphone to send your English voice into the meeting." status={snapshot?.readiness.meetingRouteReady ? "" : snapshot?.readiness.level === "checking" ? "Checking" : "Setup Needed"} tone={snapshot?.readiness.level === "checking" ? "neutral" : "warning"} /></div>
      {:else}
        <div><span class="ti-kicker">Ready</span><h1 class="ti-page-title">{myVoiceReady && snapshot?.readiness.meetingReady ? "You're ready to translate." : "One more thing needs attention."}</h1><p class="ti-page-copy">TranslateIT checks the essentials before you start a meeting.</p></div>
        <div class="ti-subtle-card divide-y divide-[var(--ti-border)] overflow-hidden">
          <StatusRow label="Microphone" value={currentMicrophone()} status={snapshot?.readiness.microphoneReady ? "Ready" : "Setup Needed"} tone={snapshot?.readiness.microphoneReady ? "good" : "warning"} />
          <StatusRow label="Meeting voice" value={myVoiceReady ? "Selected voice ready" : myVoiceReady === null ? "Checking Meeting voice" : "Choose Built-in Male/Female or create My Voice"} status={myVoiceReady ? "Ready" : myVoiceReady === null ? "Checking" : "Setup Needed"} tone={myVoiceReady ? "good" : myVoiceReady === null ? "neutral" : "warning"} />
          <StatusRow label="Meeting microphone" value={currentMeetingMicrophone()} status={snapshot?.readiness.meetingRouteReady ? "Ready" : "Setup Needed"} tone={snapshot?.readiness.meetingRouteReady ? "good" : "warning"} />
          <StatusRow label="Incoming translation" value="English → Indonesian text" detail="Optional; it doesn't block your translated voice." status="Optional" tone="neutral" />
        </div>
      {/if}

      {#if message}
        <p class="m-0 rounded-[var(--ti-radius-sm)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--ti-text-muted)]" aria-live="polite">{message}</p>
      {/if}

      <footer class="flex items-center justify-between gap-4 border-t border-[var(--ti-border)] pt-5">
        <div>{#if step > 1}<button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={goBack}><ArrowLeft size={16} /> Back</button>{/if}</div>
        <div class="ti-action-row justify-end">
          <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void deferSetup()}>Set Up Later</button>
          {#if step === 1}
            <button type="button" class="ti-button" disabled={busy} onclick={() => void advance(2)}>Continue <ChevronRight size={16} /></button>
          {:else if step === 2}
            <button type="button" class="ti-button" disabled={busy || !snapshot?.readiness.microphoneReady} onclick={() => void advance(3)}>Continue <ChevronRight size={16} /></button>
          {:else if step === 3}
            <button type="button" class="ti-button" disabled={busy} onclick={() => void advance(4)}>Continue <ChevronRight size={16} /></button>
          {:else if step === 4}
            <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void verifySetup()}>Check Again</button>
            <button type="button" class="ti-button" disabled={busy || !snapshot?.readiness.meetingRouteReady} onclick={() => void advance(5)}>Continue <ChevronRight size={16} /></button>
          {:else}
            <button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void verifySetup()}>Check Again</button>
            {#if !snapshot?.readiness.meetingReady && myVoiceReady}<button type="button" class="ti-button ti-button-secondary" disabled={busy} onclick={() => void fixSetup()}>Check Setup</button>{/if}
            {#if myVoiceReady}
              <button type="button" class="ti-button" disabled={busy || !snapshot?.readiness.meetingReady} onclick={() => void completeSetup()}><Check size={16} /> Open Meeting</button>
            {:else}
              <button type="button" class="ti-button" disabled={busy} onclick={() => void openMyVoice()}>Choose Meeting Voice <ChevronRight size={16} /></button>
            {/if}
          {/if}
        </div>
      </footer>
    </section>
  </section>
</main>
