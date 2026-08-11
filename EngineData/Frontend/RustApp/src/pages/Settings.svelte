<script lang="ts">
  import { ArrowLeft, Bug, RefreshCw } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { runtimeApi } from "../app/bridge/runtimeApi";
  import {
    runtimeProductFacade,
    type ProductAudioDeviceKind,
    type ProductRuntimeSnapshot,
    type ProductSetupAction,
  } from "../app/bridge/runtimeProductFacade";
  import type { AudioDeviceListReport, RuntimeSettings } from "../app/shared/types";
  import StatusBadge from "../components/ui/StatusBadge.svelte";
  import StatusRow from "../components/ui/StatusRow.svelte";

  type SettingsTab = "meeting" | "advanced";

  let {
    snapshot,
    settings,
    setupBusy = false,
    micTestBusy = false,
    onSettingsChange,
    onRefresh,
    onSetupAction,
    onFixSetup,
    onMicTest,
    onNotice,
  }: {
    snapshot: ProductRuntimeSnapshot;
    settings: RuntimeSettings;
    setupBusy?: boolean;
    micTestBusy?: boolean;
    onSettingsChange: (settings: RuntimeSettings) => void | Promise<void>;
    onRefresh: (message?: string) => void | Promise<void>;
    onSetupAction: (action: ProductSetupAction) => void | Promise<void>;
    onFixSetup: () => void | Promise<void>;
    onMicTest: () => void | Promise<void>;
    onNotice: (message: string) => void;
  } = $props();

  let tab = $state<SettingsTab>("meeting");
  let diagnosticsOpen = $state(false);
  let diagnosticsLoading = $state(false);
  let devices = $state<AudioDeviceListReport | null>(null);
  let devicesLoading = $state(false);
  let deviceSaving = $state(false);
  let deviceMessage = $state("Loading audio devices...");

  function deviceId(device: { id?: string; name: string }): string {
    return String(device.id ?? device.name).trim();
  }

  function currentDevice(kind: ProductAudioDeviceKind): string {
    return String(kind === "microphone" ? settings.audio.input_device_id ?? "" : settings.audio.output_device_id ?? "");
  }

  function deviceMissing(kind: ProductAudioDeviceKind): boolean {
    const selected = currentDevice(kind).trim();
    if (!selected || !devices) return false;
    const list = kind === "microphone" ? devices.input_devices : devices.output_devices;
    return !list.some((device) => deviceId(device) === selected);
  }

  async function loadDevices(): Promise<void> {
    if (devicesLoading) return;
    devicesLoading = true;
    deviceMessage = "Loading audio devices...";
    try {
      devices = await runtimeProductFacade.loadProductAudioDevices();
      deviceMessage = devices.ok ? "Choose a device to check it before saving." : "Audio devices are unavailable right now. Try again.";
    } catch {
      devices = null;
      deviceMessage = "Audio devices are unavailable right now. Try again.";
    } finally {
      devicesLoading = false;
    }
  }

  async function changeDevice(kind: ProductAudioDeviceKind, value: string): Promise<void> {
    if (deviceSaving) return;
    const candidate = value.trim() || null;
    const previous = kind === "microphone" ? settings.audio.input_device_id : settings.audio.output_device_id;
    if ((previous ?? null) === candidate) return;

    deviceSaving = true;
    deviceMessage = "Checking device...";
    try {
      const result = await runtimeProductFacade.selectProductAudioDevice(kind, candidate, settings);
      deviceMessage = result.message;
      onNotice(result.message);
      if (!result.ok) return;
      await onSettingsChange(result.settings);
      await onRefresh(result.message);
      await loadDevices();
    } catch {
      deviceMessage = "The device wasn't changed. Try again or check Diagnostics.";
      onNotice(deviceMessage);
    } finally {
      deviceSaving = false;
    }
  }

  function selectValue(event: Event): string {
    return (event.currentTarget as HTMLSelectElement).value;
  }

  async function refreshDiagnostics(): Promise<void> {
    if (diagnosticsLoading) return;
    diagnosticsOpen = true;
    diagnosticsLoading = true;
    onNotice("Refreshing Diagnostics...");
    try {
      await onRefresh("Diagnostics refreshed.");
    } finally {
      diagnosticsLoading = false;
    }
  }

  onMount(() => {
    void loadDevices();
  });
</script>

<section class="min-h-0 overflow-y-auto">
  <div class="ti-page">
    <header>
      <span class="ti-kicker">Settings</span>
      <h2 class="ti-page-title">TranslateIT settings</h2>
      <p class="ti-page-copy">Choose your meeting audio and check setup when something needs attention.</p>
    </header>

    <nav class="flex w-fit gap-1 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-1" aria-label="Settings sections">
      <button
        type="button"
        class={`min-h-9 rounded-[10px] px-4 text-sm font-semibold transition-colors ${tab === "meeting" ? "bg-[var(--ti-surface-raised)] text-[var(--ti-text)]" : "text-[var(--ti-text-muted)] hover:text-[var(--ti-text)]"}`}
        aria-current={tab === "meeting" ? "page" : undefined}
        onclick={() => { tab = "meeting"; diagnosticsOpen = false; }}
      >Meeting</button>
      <button
        type="button"
        class={`min-h-9 rounded-[10px] px-4 text-sm font-semibold transition-colors ${tab === "advanced" ? "bg-[var(--ti-surface-raised)] text-[var(--ti-text)]" : "text-[var(--ti-text-muted)] hover:text-[var(--ti-text)]"}`}
        aria-current={tab === "advanced" ? "page" : undefined}
        onclick={() => { tab = "advanced"; diagnosticsOpen = false; }}
      >Advanced</button>
    </nav>

    {#if tab === "meeting"}
      <section class="grid gap-5">
        <header class="ti-page-header">
          <div>
            <h3 class="m-0 text-xl font-semibold tracking-[-0.02em]">Meeting audio</h3>
            <p class="mb-0 mt-2 text-sm text-[var(--ti-text-muted)]">Choose what you speak into and where you hear the meeting.</p>
          </div>
          {#if !snapshot.readiness.meetingReady}
            <StatusBadge label={snapshot.readiness.level === "unavailable" ? "Unavailable" : "Setup Needed"} tone={snapshot.readiness.level === "unavailable" ? "danger" : "warning"} />
          {/if}
        </header>

        <article class="ti-panel overflow-hidden">
          <div class="grid grid-cols-2 gap-px bg-[var(--ti-border)]">
            <label class="grid gap-3 bg-[var(--ti-surface)] p-6">
              <span class="ti-field-label">Microphone</span>
              <select class="ti-field min-h-11 px-3" disabled={devicesLoading || deviceSaving} value={currentDevice("microphone")} onchange={(event) => void changeDevice("microphone", selectValue(event))}>
                <option value="">Windows Default</option>
                {#each devices?.input_devices ?? [] as device (deviceId(device))}
                  <option value={deviceId(device)}>{device.name}{device.is_default ? " · Windows default" : ""}</option>
                {/each}
                {#if deviceMissing("microphone")}
                  <option value={currentDevice("microphone")}>{currentDevice("microphone")} · unavailable</option>
                {/if}
              </select>
              <small class="text-xs leading-5 text-[var(--ti-text-soft)]">The microphone you speak into.</small>
            </label>

            <label class="grid gap-3 bg-[var(--ti-surface)] p-6">
              <span class="ti-field-label">Meeting sound</span>
              <select class="ti-field min-h-11 px-3" disabled={devicesLoading || deviceSaving} value={currentDevice("meeting-sound")} onchange={(event) => void changeDevice("meeting-sound", selectValue(event))}>
                <option value="">Windows Default</option>
                {#each devices?.output_devices ?? [] as device (deviceId(device))}
                  <option value={deviceId(device)}>{device.name}{device.is_default ? " · Windows default" : ""}</option>
                {/each}
                {#if deviceMissing("meeting-sound")}
                  <option value={currentDevice("meeting-sound")}>{currentDevice("meeting-sound")} · unavailable</option>
                {/if}
              </select>
              <small class="text-xs leading-5 text-[var(--ti-text-soft)]">Used for optional English → Indonesian meeting text.</small>
            </label>
          </div>

          <div class="border-t border-[var(--ti-border)]">
            <StatusRow
              label="Meeting microphone"
              value="TranslateIT Meeting Microphone"
              detail="Choose this microphone inside your meeting app."
              status={snapshot.readiness.meetingRouteReady ? "" : snapshot.readiness.level === "unavailable" ? "Unavailable" : "Setup Needed"}
              tone={snapshot.readiness.level === "unavailable" ? "danger" : "warning"}
            />
          </div>

          <footer class="grid gap-4 border-t border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-6">
            <p class="m-0 text-sm leading-6 text-[var(--ti-text-muted)]" aria-live="polite">{deviceMessage}</p>
            <div class="ti-action-row">
              <button type="button" class="ti-button ti-button-secondary" disabled={setupBusy || deviceSaving} onclick={() => void onSetupAction("check-microphone")}>{setupBusy ? "Checking..." : "Check Microphone"}</button>
              <button type="button" class="ti-button ti-button-secondary" disabled={micTestBusy || setupBusy || deviceSaving} onclick={() => void onMicTest()}>{micTestBusy ? "Working..." : snapshot.readiness.recording ? "Stop Mic Test" : "Mic Test"}</button>
              <button type="button" class="ti-button ti-button-secondary" disabled={setupBusy || deviceSaving} onclick={() => void onFixSetup()}>{setupBusy ? "Checking..." : "Check Setup"}</button>
            </div>
          </footer>
        </article>
      </section>
    {:else if !diagnosticsOpen}
      <section class="grid gap-5">
        <header>
          <h3 class="m-0 text-xl font-semibold tracking-[-0.02em]">Setup health</h3>
          <p class="mb-0 mt-2 text-sm text-[var(--ti-text-muted)]">Open Diagnostics only when you need technical details.</p>
        </header>

        <article class="ti-panel overflow-hidden">
          <div class="divide-y divide-[var(--ti-border)]">
            <StatusRow
              label="Text translation"
              value="Indonesian ↔ English"
              detail="Standalone text translation."
              status={snapshot.readiness.textReady ? "Ready" : snapshot.readiness.textStatus}
              tone={snapshot.readiness.textReady ? "good" : snapshot.readiness.level === "unavailable" ? "danger" : "warning"}
            />
            <StatusRow
              label="Meeting translation"
              value="Indonesian voice → English voice"
              detail="Required microphone and meeting output."
              status={snapshot.readiness.meetingReady ? "Ready" : snapshot.readiness.meetingStatus}
              tone={snapshot.readiness.meetingReady ? "good" : snapshot.readiness.level === "unavailable" ? "danger" : "warning"}
            />
          </div>
          <footer class="border-t border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-5">
            <button type="button" class="ti-button ti-button-secondary" disabled={diagnosticsLoading} onclick={() => void refreshDiagnostics()}>{diagnosticsLoading ? "Opening..." : "Open Diagnostics"}</button>
          </footer>
        </article>
      </section>
    {:else}
      <section class="grid gap-5">
        <header class="ti-page-header">
          <div>
            <span class="ti-kicker">Advanced</span>
            <h3 class="ti-page-title">Diagnostics</h3>
            <p class="ti-page-copy">Technical status for troubleshooting.</p>
          </div>
          <button type="button" class="ti-button ti-button-secondary" onclick={() => { diagnosticsOpen = false; }}><ArrowLeft size={16} /> Back</button>
        </header>

        <article class="ti-panel p-6">
          <div class="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-4">
            <div class="ti-state-card"><span class="ti-field-label">Worker</span><strong class="mt-2 block text-sm">{snapshot.helper?.state ?? "Not checked"}</strong></div>
            <div class="ti-state-card"><span class="ti-field-label">Outbound provider</span><strong class="mt-2 block text-sm">{snapshot.helper?.provider_ready ? "Available" : "Setup Needed"}</strong></div>
            <div class="ti-state-card"><span class="ti-field-label">Execution device</span><strong class="mt-2 block text-sm">{snapshot.helper?.cuda_ready ? "CUDA" : snapshot.helper?.degraded_mode ? "CPU / degraded" : "Not verified"}</strong></div>
          </div>

          <p class="mb-0 mt-5 text-sm leading-6 text-[var(--ti-text-muted)]">{snapshot.helper?.message ?? "Refresh status to check the local worker."}</p>

          <div class="ti-action-row mt-5">
            <button type="button" class="ti-button ti-button-secondary" disabled={setupBusy || diagnosticsLoading} onclick={() => void refreshDiagnostics()}><RefreshCw size={16} /> {diagnosticsLoading || setupBusy ? "Refreshing..." : "Refresh Status"}</button>
            <button type="button" class="ti-button ti-button-secondary" disabled={setupBusy || diagnosticsLoading} onclick={() => void onSetupAction("verify-models")}><Bug size={16} /> Verify Models</button>
          </div>
        </article>

        <article class="ti-panel p-6">
          <div class="flex items-end justify-between gap-5">
            <div><span class="ti-kicker">Troubleshooting</span><h4 class="mb-0 mt-2 text-base font-semibold">Recent command errors</h4></div>
            <span class="ti-pill">{runtimeApi.getCommandErrors().length} recent</span>
          </div>
          <div class="mt-4 grid gap-2">
            {#if runtimeApi.getCommandErrors().length === 0}
              <p class="m-0 text-sm text-[var(--ti-text-muted)]">No recent frontend/Tauri command failures.</p>
            {:else}
              {#each runtimeApi.getCommandErrors() as error (`${error.occurred_at}-${error.command}`)}
                <div class="ti-subtle-card px-4 py-3">
                  <strong class="text-xs">{error.command}</strong>
                  <p class="mb-0 mt-1 text-xs leading-5 text-[var(--ti-text-muted)]">{error.message}</p>
                </div>
              {/each}
            {/if}
          </div>
        </article>
      </section>
    {/if}
  </div>
</section>
