<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { Dialog } from "bits-ui";
  import { onMount } from "svelte";
  import { runtimeApi, type MeetingCommittedTurnsSnapshot, type MeetingSessionStatus } from "./app/bridge/runtimeApi";
  import {
    mapProductMeetingState,
    runtimeProductFacade,
    type ProductRuntimeSnapshot,
    type ProductSetupAction,
  } from "./app/bridge/runtimeProductFacade";
  import { defaultSettings, errorMessage } from "./app/shared/state";
  import type { RuntimeSettings } from "./app/shared/types";
  import Sidebar from "./components/layout/Sidebar.svelte";
  import FirstSetup from "./pages/FirstSetup.svelte";
  import Meeting from "./pages/Meeting.svelte";
  import Settings from "./pages/Settings.svelte";
  import Text from "./pages/Text.svelte";

  const MEETING_REFRESH_MS = 1200;
  type AppRoute = "meeting" | "text" | "settings";

  let booting = $state(true);
  let setupRequired = $state(false);
  let settings = $state<RuntimeSettings>(defaultSettings());
  let snapshot = $state<ProductRuntimeSnapshot | null>(null);
  let route = $state<AppRoute>("meeting");
  let notice = $state("Preparing local translator...");
  let meetingActionBusy = $state(false);
  let setupActionBusy = $state(false);
  let micTestBusy = $state(false);
  let meetingStatus = $state<MeetingSessionStatus | null>(null);
  let meetingTurns = $state<MeetingCommittedTurnsSnapshot | null>(null);

  let closeDialogOpen = $state(false);
  let closeDialogMessage = $state("");
  let closeDialogCanStop = $state(false);
  let stopAndCloseBusy = $state(false);
  let closeAfterExistingStop = $state(false);
  let meetingPollInFlight = false;
  let closeCheckInFlight = false;

  function cloneSettings(value: RuntimeSettings): RuntimeSettings {
    return { ...value, audio: { ...value.audio } };
  }

  function compactNotice(value: unknown): string {
    const clean = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!clean) return "Status unavailable.";
    return clean.length > 220 ? `${clean.slice(0, 219).trimEnd()}…` : clean;
  }

  const presence = $derived(
    snapshot?.meeting.live
      ? "Live"
      : snapshot?.readiness.meetingReady
        ? "Ready"
        : snapshot?.readiness.textReady
          ? "Degraded"
          : snapshot?.readiness.level === "blocked"
            ? "Setup Needed"
            : "Checking",
  );

  const direction = $derived(
    route === "meeting"
      ? "ID → EN"
      : `${settings.source_language.toUpperCase()} → ${settings.target_language.toUpperCase()}`,
  );

  const pageTitle = $derived(route === "meeting" ? "Meeting" : route === "text" ? "Text" : "Settings");

  function meetingStatusUnavailable(status: MeetingSessionStatus): boolean {
    return status.runtime_claim === "frontend_bridge_unavailable" || status.lifecycle === "unavailable";
  }

  function setNotice(message: string): void {
    notice = compactNotice(message);
  }

  async function refreshSnapshot(preferredNotice?: string): Promise<void> {
    try {
      const next = await runtimeProductFacade.loadProductRuntimeSnapshot();
      snapshot = next;
      settings = cloneSettings(next.settings);
      meetingStatus = next.meetingSession;
      if (!next.meeting.hasSession) meetingTurns = null;
      setNotice(preferredNotice ?? (next.meeting.hasSession ? next.meeting.message : next.readiness.summary));
    } catch (error) {
      setNotice(`Runtime check failed: ${errorMessage(error)}`);
    }
  }

  async function applySettings(next: RuntimeSettings): Promise<void> {
    settings = cloneSettings(next);
    if (snapshot) snapshot = { ...snapshot, settings: cloneSettings(next) };
    await refreshSnapshot();
  }

  async function finishFirstSetup(next: RuntimeSettings): Promise<void> {
    settings = cloneSettings(next);
    setupRequired = false;
    await refreshSnapshot("Setup choice saved.");
    route = "meeting";
  }

  async function handleMeetingAction(): Promise<void> {
    if (meetingActionBusy || !snapshot) return;
    const meeting = snapshot.meeting;
    const action = meeting.canStop ? "stop" : "start";
    if (action === "start" && !meeting.canStart) {
      setNotice(snapshot.readiness.nextAction ?? meeting.message);
      return;
    }
    if (action === "stop" && !meeting.canStop) {
      setNotice(meeting.message);
      return;
    }

    meetingActionBusy = true;
    setNotice(action === "start" ? "Starting Meeting Translation..." : "Stopping Meeting Translation...");
    try {
      const result = await runtimeProductFacade.runProductMeetingAction(action);
      await refreshSnapshot(result.message);
      if (action === "stop" && !result.meeting.hasSession) meetingTurns = null;
    } catch (error) {
      setNotice(`Meeting command failed: ${errorMessage(error)}`);
      await refreshSnapshot();
    } finally {
      meetingActionBusy = false;
    }
  }

  async function runSetupAction(action: ProductSetupAction): Promise<void> {
    if (setupActionBusy) return;
    setupActionBusy = true;
    setNotice(action === "verify-models" ? "Verifying models..." : action === "check-microphone" ? "Checking microphone..." : "Refreshing setup...");
    try {
      const message = await runtimeProductFacade.runProductSetupAction(action);
      await refreshSnapshot(message);
    } finally {
      setupActionBusy = false;
    }
  }

  async function fixSetup(): Promise<void> {
    if (setupActionBusy) return;
    setupActionBusy = true;
    setNotice("Running setup checks...");
    try {
      const message = await runtimeProductFacade.runProductRecoveryAction("fix-setup");
      await refreshSnapshot(message);
    } finally {
      setupActionBusy = false;
    }
  }

  async function toggleMicTest(): Promise<void> {
    if (micTestBusy || !snapshot) return;
    if (snapshot.meeting.hasSession) {
      setNotice(snapshot.meeting.live
        ? "Mic Test is unavailable while Translation is live. Stop Translation first."
        : "Mic Test is unavailable while Meeting resources are in use.");
      return;
    }
    if (!snapshot.readiness.voiceReady && !snapshot.readiness.recording) {
      setNotice(snapshot.readiness.nextAction ?? "Voice capture setup is not ready.");
      return;
    }

    micTestBusy = true;
    try {
      const result = snapshot.readiness.recording ? await runtimeApi.stopCapture() : await runtimeApi.startCapture();
      await refreshSnapshot(result.message);
    } catch (error) {
      setNotice(`Voice command failed: ${errorMessage(error)}`);
    } finally {
      micTestBusy = false;
    }
  }

  async function pollMeeting(): Promise<void> {
    if (meetingPollInFlight || booting || setupRequired) return;
    if (!snapshot?.meeting.hasSession && !closeAfterExistingStop) return;

    meetingPollInFlight = true;
    try {
      const status = await runtimeApi.getMeetingSessionStatus();
      if (meetingStatusUnavailable(status)) return;
      meetingStatus = status;
      const mapped = mapProductMeetingState(status);
      if (snapshot) snapshot = { ...snapshot, meetingSession: status, meeting: mapped };

      if (status.has_session) {
        meetingTurns = await runtimeApi.getMeetingCommittedTurns().catch(() => meetingTurns);
      } else {
        meetingTurns = null;
        if (closeAfterExistingStop) await destroyNativeWindow();
      }
    } catch {
      // Product recovery remains explicit. Poll failure does not invent a lifecycle state.
    } finally {
      meetingPollInFlight = false;
    }
  }

  function showCloseDialog(message: string, canStop: boolean): void {
    closeDialogMessage = compactNotice(message);
    closeDialogCanStop = canStop;
    closeDialogOpen = true;
  }

  function keepApplicationOpen(): void {
    closeAfterExistingStop = false;
    stopAndCloseBusy = false;
    closeDialogCanStop = false;
    closeDialogOpen = false;
  }

  async function destroyNativeWindow(): Promise<void> {
    closeAfterExistingStop = false;
    closeDialogOpen = false;
    await getCurrentWindow().destroy();
  }

  async function inspectNativeCloseRequest(): Promise<void> {
    if (closeCheckInFlight || stopAndCloseBusy) return;
    closeCheckInFlight = true;
    try {
      const status = await runtimeApi.getMeetingSessionStatus();
      if (meetingStatusUnavailable(status)) {
        showCloseDialog("TranslateIT could not verify the current Meeting state, so closing was blocked. Retry Stop & Close after the runtime is available, or keep the app open.", true);
        return;
      }

      const meeting = mapProductMeetingState(status);
      if (!status.has_session) {
        await destroyNativeWindow();
        return;
      }
      if (!meeting.applicationOwned) {
        showCloseDialog("Meeting resources are still owned by another TranslateIT runtime operation. Close remains blocked until that operation releases them.", false);
        return;
      }
      if (meeting.lifecycle === "stopping") {
        closeAfterExistingStop = true;
        showCloseDialog("Translation is already stopping. TranslateIT will stay open until the canonical Stop lifecycle finishes.", false);
        return;
      }

      showCloseDialog(`${meeting.label} Meeting Translation is still active. Stop & Close will run the same safe Stop lifecycle used by the Meeting workspace before TranslateIT exits.`, true);
    } finally {
      closeCheckInFlight = false;
    }
  }

  async function handleStopAndClose(): Promise<void> {
    if (stopAndCloseBusy) return;
    stopAndCloseBusy = true;
    try {
      const status = await runtimeApi.getMeetingSessionStatus();
      if (meetingStatusUnavailable(status)) {
        showCloseDialog("TranslateIT could not verify the current Meeting state, so closing remains blocked.", true);
        return;
      }

      const meeting = mapProductMeetingState(status);
      if (!status.has_session) {
        await destroyNativeWindow();
        return;
      }
      if (!meeting.applicationOwned) {
        showCloseDialog("Meeting resources are still owned by another TranslateIT runtime operation. Close remains blocked.", false);
        return;
      }
      if (meeting.lifecycle === "stopping") {
        closeAfterExistingStop = true;
        showCloseDialog("Translation is already stopping. TranslateIT will stay open until Stop finishes.", false);
        return;
      }

      const result = await runtimeProductFacade.runProductMeetingAction("stop");
      if (!result.ok) {
        showCloseDialog(`Translation could not be stopped safely, so TranslateIT remains open. ${result.message}`, true);
        return;
      }

      const verified = await runtimeApi.getMeetingSessionStatus();
      if (meetingStatusUnavailable(verified)) {
        showCloseDialog("Stop returned, but TranslateIT could not verify that the Meeting session cleared. The app remains open.", true);
        return;
      }
      if (!verified.has_session) {
        await destroyNativeWindow();
        return;
      }

      const verifiedMeeting = mapProductMeetingState(verified);
      if (verifiedMeeting.applicationOwned && verifiedMeeting.lifecycle === "stopping") {
        closeAfterExistingStop = true;
        showCloseDialog("Translation is stopping. TranslateIT will close only after the Meeting session is cleared.", false);
        return;
      }
      showCloseDialog("Stop finished without proof that the Meeting session was cleared. TranslateIT remains open.", verifiedMeeting.applicationOwned);
    } catch (error) {
      showCloseDialog(`TranslateIT could not complete the safe close check. ${errorMessage(error)}`, true);
    } finally {
      stopAndCloseBusy = false;
    }
  }

  onMount(() => {
    let disposed = false;
    let unlistenClose: (() => void) | null = null;

    const boot = async () => {
      try {
        settings = cloneSettings(await runtimeApi.loadSettings().catch(() => defaultSettings()));
        setupRequired = settings.meeting_setup_state === "new";
        if (!setupRequired) await refreshSnapshot();
      } finally {
        if (!disposed) booting = false;
      }
    };

    const installCloseGuard = async () => {
      try {
        unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
          event.preventDefault();
          await inspectNativeCloseRequest();
        });
      } catch {
        // Browser-only frontend preview has no native close event. No close success is fabricated.
      }
    };

    void boot();
    void installCloseGuard();
    const timer = window.setInterval(() => void pollMeeting(), MEETING_REFRESH_MS);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      unlistenClose?.();
    };
  });
</script>

{#if booting}
  <main class="grid min-h-screen place-items-center bg-[var(--ti-bg)] p-8">
    <section class="ti-panel w-full max-w-[620px] p-8">
      <span class="ti-kicker">TranslateIT</span>
      <h1 class="mb-0 mt-3 text-3xl font-black tracking-[-0.035em]">Preparing local translator</h1>
      <p class="mb-0 mt-4 text-sm leading-6 text-[var(--ti-text-muted)]">Loading saved settings and current desktop state. No synthetic progress is shown.</p>
    </section>
  </main>
{:else if setupRequired}
  <FirstSetup initialSettings={settings} onComplete={finishFirstSetup} />
{:else if snapshot}
  <main class="flex h-screen min-h-0 bg-[var(--ti-bg)]">
    <Sidebar active={route} {presence} onNavigate={(next) => { route = next; }} />

    <section class="flex min-w-0 flex-1 flex-col">
      <header class="flex min-h-20 shrink-0 items-center gap-5 border-b border-[var(--ti-border)] bg-[var(--ti-bg)] px-8">
        <div>
          <h1 class="m-0 text-lg font-black">{pageTitle}</h1>
          <p class="mb-0 mt-1 max-w-[680px] truncate text-xs text-[var(--ti-text-muted)]" title={notice}>{notice}</p>
        </div>

        {#if route !== "meeting" && snapshot.meeting.applicationOwned && snapshot.meeting.hasSession}
          <button
            type="button"
            class="ml-auto flex items-center gap-3 rounded-full border border-[#285942] bg-[var(--ti-success-surface)] px-4 py-2 text-left"
            onclick={() => { route = "meeting"; }}
          >
            <span class="size-2 rounded-full bg-[var(--ti-success)]"></span>
            <span><strong class="block text-xs text-[var(--ti-success)]">{snapshot.meeting.label}</strong><small class="text-[11px] text-[var(--ti-text-muted)]">Open active Meeting</small></span>
          </button>
        {/if}

        <span class={route !== "meeting" && snapshot.meeting.applicationOwned && snapshot.meeting.hasSession ? "" : "ml-auto"}>
          <span class="rounded-full border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-3 py-2 text-xs font-bold text-[var(--ti-text-muted)]">{direction}</span>
        </span>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto">
        {#if route === "meeting"}
          <Meeting
            {snapshot}
            {meetingStatus}
            {meetingTurns}
            actionBusy={meetingActionBusy}
            onMeetingAction={handleMeetingAction}
            onRefresh={() => refreshSnapshot("Readiness refreshed.")}
            onFixSetup={fixSetup}
          />
        {:else if route === "text"}
          <Text
            {settings}
            textStatus={snapshot.readiness.textStatus}
            onSettingsChange={applySettings}
            onNotice={setNotice}
          />
        {:else}
          <Settings
            {snapshot}
            {settings}
            onSettingsChange={applySettings}
            onRefresh={refreshSnapshot}
            onSetupAction={runSetupAction}
            onFixSetup={fixSetup}
            onMicTest={toggleMicTest}
            onNotice={setNotice}
          />
        {/if}
      </div>
    </section>
  </main>
{:else}
  <main class="grid min-h-screen place-items-center bg-[var(--ti-bg)] p-8">
    <section class="ti-panel w-full max-w-[620px] p-8">
      <span class="ti-kicker">TranslateIT</span>
      <h1 class="mb-0 mt-3 text-3xl font-black">Desktop state unavailable</h1>
      <p class="mb-0 mt-4 text-sm text-[var(--ti-text-muted)]">{notice}</p>
      <button type="button" class="ti-button mt-5" onclick={() => void refreshSnapshot("Readiness refreshed.")}>Retry</button>
    </section>
  </main>
{/if}

<Dialog.Root bind:open={closeDialogOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--ti-radius-lg)] border border-[var(--ti-border-strong)] bg-[var(--ti-surface)] p-6 shadow-[var(--ti-shadow-dialog)]">
      <Dialog.Title class="text-xl font-black">Meeting Translation is still active</Dialog.Title>
      <Dialog.Description class="mt-3 text-sm leading-6 text-[var(--ti-text-muted)]">{closeDialogMessage}</Dialog.Description>
      <div class="mt-6 flex justify-end gap-3">
        <button type="button" class="ti-button ti-button-secondary" disabled={stopAndCloseBusy} onclick={keepApplicationOpen}>Keep Open</button>
        <button type="button" class="ti-button" disabled={!closeDialogCanStop || stopAndCloseBusy} onclick={() => void handleStopAndClose()}>
          {stopAndCloseBusy ? "Stopping..." : "Stop & Close"}
        </button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
