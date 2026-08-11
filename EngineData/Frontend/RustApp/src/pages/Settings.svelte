<script lang="ts">
  import { onMount } from "svelte";
  import { Activity, Bug, Mic, RefreshCw } from "@lucide/svelte";
  import { runtimeApi } from "../app/bridge/runtimeApi";
  import {
    runtimeProductFacade,
    type ProductAudioDeviceKind,
    type ProductRuntimeSnapshot,
    type ProductSetupAction,
  } from "../app/bridge/runtimeProductFacade";
  import { errorMessage } from "../app/shared/state";
  import type { AudioDeviceListReport, RuntimeSettings } from "../app/shared/types";
  import StatusBadge from "../components/ui/StatusBadge.svelte";

  type SettingsTab = "meeting" | "advanced";

  let {
    snapshot,
    settings,
    onSettingsChange,
    onRefresh,
    onSetupAction,
    onFixSetup,
    onMicTest,
    onNotice,
  }: {
    snapshot: ProductRuntimeSnapshot;
    settings: RuntimeSettings;
    onSettingsChange: (settings: RuntimeSettings) => void | Promise<void>;
    onRefresh: (message?: string) => void | Promise<void>;
    onSetupAction: (action: ProductSetupAction) => void | Promise<void>;
    onFixSetup: () => void | Promise<void>;
    onMicTest: () => void | Promise<void>;
    onNotice: (message: string) => void;
  } = $props();

  let tab = $state<SettingsTab>("meeting");
  let diagnosticsOpen = $state(false);
  let devices = $state<AudioDeviceListReport | null>(null);
  let devicesLoading = $state(false);
  let deviceSaving = $state(false);
  let deviceMessage = $state("Loading available audio devices...");

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
    deviceMessage = "Loading available audio devices...";
    try {
      devices = await runtimeProductFacade.loadProductAudioDevices();
      deviceMessage = devices.ok
        ? "Choose a device to check it before saving."
        : devices.note ?? "Audio devices are unavailable.";
    } catch (error) {
      devices = null;
      deviceMessage = `Audio devices could not be listed: ${errorMessage(error)}`;
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
    deviceMessage = "Checking device before saving...";
    try {
      const result = await runtimeProductFacade.selectProductAudioDevice(kind, candidate);
      deviceMessage = result.message;
      if (!result.ok) return;
      await onSettingsChange(result.settings);
      await loadDevices();
    } catch (error) {
      deviceMessage = `Device preference was not changed: ${errorMessage(error)}`;
    } finally {
      deviceSaving = false;
    }
  }

  function selectValue(event: Event): string {
    return (event.currentTarget as HTMLSelectElement).value;
  }

  async function refreshDiagnostics(): Promise<void> {
    await onRefresh("Diagnostics refreshed.");
    diagnosticsOpen = true;
  }

  onMount(() => {
    void loadDevices();
  });
</script>

<section class="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)]">
  <aside class="border-r border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-5 py-7">
    <h2 class="m-0 text-xl font-black">Settings</h2>
    <nav class="mt-7 grid gap-2" aria-label="Settings navigation">
      <button
        type="button"
        class={`flex min-h-11 items-center gap-3 rounded-[var(--ti-radius-md)] border px-4 text-sm font-semibold ${tab === "meeting" ? "border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)]" : "border-transparent text-[var(--ti-text-muted)]"}`}
        onclick={() => { tab = "meeting"; diagnosticsOpen = false; }}
      >
        <Mic size={17} /> Meeting
      </button>
      <button
        type="button"
        class={`flex min-h-11 items-center gap-3 rounded-[var(--ti-radius-md)] border px-4 text-sm font-semibold ${tab === "advanced" ? "border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)]" : "border-transparent text-[var(--ti-text-muted)]"}`}
        onclick={() => { tab = "advanced"; diagnosticsOpen = false; }}
      >
        <Activity size={17} /> Advanced
      </button>
    </nav>
  </aside>

  <div class="min-h-0 overflow-y-auto px-8 py-8">
    {#if tab === "meeting"}
      <section class="mx-auto grid max-w-[900px] gap-5">
        <header>
          <span class="ti-kicker">Meeting settings</span>
          <h2 class="mb-0 mt-2 text-3xl font-black tracking-[-0.035em]">Meeting</h2>
          <p class="mb-0 mt-3 text-sm text-[var(--ti-text-muted)]">Configure the audio TranslateIT uses for meeting translation.</p>
        </header>

        <article class="ti-panel grid gap-5 p-6">
          <div class="grid grid-cols-2 gap-4">
            <label class="grid gap-2">
              <span class="text-xs font-bold text-[var(--ti-text-muted)]">Your microphone</span>
              <select
                class="ti-field min-h-11 px-3"
                disabled={devicesLoading || deviceSaving}
                value={currentDevice("microphone")}
                onchange={(event) => void changeDevice("microphone", selectValue(event))}
              >
                <option value="">Windows Default</option>
                {#each devices?.input_devices ?? [] as device (deviceId(device))}
                  <option value={deviceId(device)}>{device.name}{device.is_default ? " · current Windows default" : ""}</option>
                {/each}
                {#if deviceMissing("microphone")}
                  <option value={currentDevice("microphone")}>{currentDevice("microphone")} · unavailable</option>
                {/if}
              </select>
            </label>

            <label class="grid gap-2">
              <span class="text-xs font-bold text-[var(--ti-text-muted)]">Meeting sound</span>
              <select
                class="ti-field min-h-11 px-3"
                disabled={devicesLoading || deviceSaving}
                value={currentDevice("meeting-sound")}
                onchange={(event) => void changeDevice("meeting-sound", selectValue(event))}
              >
                <option value="">Windows Default</option>
                {#each devices?.output_devices ?? [] as device (deviceId(device))}
                  <option value={deviceId(device)}>{device.name}{device.is_default ? " · current Windows default" : ""}</option>
                {/each}
                {#if deviceMissing("meeting-sound")}
                  <option value={currentDevice("meeting-sound")}>{currentDevice("meeting-sound")} · unavailable</option>
                {/if}
              </select>
            </label>
          </div>

          <div class="flex items-center justify-between gap-5 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-4">
            <div>
              <span class="text-xs text-[var(--ti-text-muted)]">Meeting microphone</span>
              <strong class="mt-1 block text-sm">TranslateIT Meeting Microphone</strong>
            </div>
            <StatusBadge label={snapshot.readiness.meetingRouteReady ? "Ready" : "Setup Needed"} tone={snapshot.readiness.meetingRouteReady ? "good" : "warning"} />
          </div>

          <p class="m-0 text-sm text-[var(--ti-text-muted)]" aria-live="polite">{deviceMessage}</p>

          <div class="flex flex-wrap gap-3">
            <button type="button" class="ti-button ti-button-secondary" onclick={() => void onSetupAction("check-microphone")}>Check Microphone</button>
            <button type="button" class="ti-button ti-button-secondary" onclick={() => void onMicTest()}>{snapshot.readiness.recording ? "Stop Mic Test" : "Mic Test"}</button>
            <button type="button" class="ti-button ti-button-secondary" onclick={() => void onFixSetup()}>Check Setup</button>
          </div>
        </article>
      </section>
    {:else if !diagnosticsOpen}
      <section class="mx-auto grid max-w-[900px] gap-5">
        <header>
          <span class="ti-kicker">Advanced</span>
          <h2 class="mb-0 mt-2 text-3xl font-black tracking-[-0.035em]">Setup health</h2>
          <p class="mb-0 mt-3 text-sm text-[var(--ti-text-muted)]">Technical details stay separate from normal translation controls.</p>
        </header>

        <article class="ti-panel grid gap-4 p-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-4">
              <span class="text-xs text-[var(--ti-text-muted)]">Local translation</span>
              <div class="mt-3"><StatusBadge label={snapshot.readiness.textStatus} tone={snapshot.readiness.textReady ? "good" : "warning"} /></div>
            </div>
            <div class="rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-4">
              <span class="text-xs text-[var(--ti-text-muted)]">Meeting</span>
              <div class="mt-3"><StatusBadge label={snapshot.readiness.meetingStatus} tone={snapshot.readiness.meetingReady ? "good" : "warning"} /></div>
            </div>
          </div>
          <button type="button" class="ti-button ti-button-secondary w-fit" onclick={() => { diagnosticsOpen = true; }}>Open Diagnostics</button>
        </article>
      </section>
    {:else}
      <section class="mx-auto grid max-w-[900px] gap-5">
        <header class="flex items-start justify-between gap-5">
          <div>
            <span class="ti-kicker">Advanced</span>
            <h2 class="mb-0 mt-2 text-3xl font-black tracking-[-0.035em]">Diagnostics</h2>
            <p class="mb-0 mt-3 text-sm text-[var(--ti-text-muted)]">Read-only technical status for troubleshooting.</p>
          </div>
          <button type="button" class="ti-button ti-button-secondary" onclick={() => { diagnosticsOpen = false; }}>Back</button>
        </header>

        <article class="ti-panel grid gap-4 p-6">
          <div class="grid grid-cols-3 gap-4">
            <div class="rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-4">
              <span class="text-xs text-[var(--ti-text-muted)]">Worker</span>
              <strong class="mt-2 block text-sm">{snapshot.helper?.state ?? "Not checked"}</strong>
            </div>
            <div class="rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-4">
              <span class="text-xs text-[var(--ti-text-muted)]">Outbound provider</span>
              <strong class="mt-2 block text-sm">{snapshot.helper?.provider_ready ? "Available" : "Setup Needed"}</strong>
            </div>
            <div class="rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] p-4">
              <span class="text-xs text-[var(--ti-text-muted)]">Execution device</span>
              <strong class="mt-2 block text-sm">{snapshot.helper?.cuda_ready ? "CUDA" : snapshot.helper?.degraded_mode ? "CPU / degraded" : "Not verified"}</strong>
            </div>
          </div>

          <p class="m-0 text-sm leading-6 text-[var(--ti-text-muted)]">{snapshot.helper?.message ?? "Refresh status to check the local worker."}</p>

          <div class="flex flex-wrap gap-3">
            <button type="button" class="ti-button ti-button-secondary" onclick={() => void refreshDiagnostics()}><RefreshCw size={16} /> Refresh Status</button>
            <button type="button" class="ti-button ti-button-secondary" onclick={() => void onSetupAction("verify-models")}><Bug size={16} /> Verify Models</button>
          </div>
        </article>

        <article class="ti-panel p-6">
          <h3 class="m-0 text-sm font-bold">Recent command errors</h3>
          <div class="mt-4 grid gap-2">
            {#if runtimeApi.getCommandErrors().length === 0}
              <p class="m-0 text-sm text-[var(--ti-text-muted)]">No recent frontend/Tauri command failures.</p>
            {:else}
              {#each runtimeApi.getCommandErrors() as error (`${error.occurred_at}-${error.command}`)}
                <div class="rounded-[var(--ti-radius-sm)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-4 py-3">
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
