<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { Dialog } from "bits-ui";
  import { onMount } from "svelte";
  import { runtimeApi, type MeetingCommittedTurnsSnapshot, type MeetingSessionStatus } from "./app/bridge/runtimeApi";
  import {
    mapProductMeetingState,
    mapProductReadiness,
    meetingBridgeUnavailable,
    runtimeProductFacade,
    type ProductRuntimeSnapshot,
    type ProductSetupAction,
  } from "./app/bridge/runtimeProductFacade";
  import { myVoiceApi } from "./app/bridge/myVoiceApi";
  import { myVoiceBuildApi } from "./app/bridge/myVoiceBuildApi";
  import { cloneSettings, compact, defaultSettings } from "./app/shared/state";
  import type {
    AppRoute,
    HelperBridgeStatus,
    HelperBridgeWorkerResponse,
    InputPreparationStatus,
    RuntimeSettings,
  } from "./app/shared/types";
  import Sidebar from "./components/layout/Sidebar.svelte";
  import FirstSetup from "./pages/FirstSetup.svelte";
  import Meeting from "./pages/Meeting.svelte";
  import MyVoice from "./pages/MyVoice.svelte";
  import Settings from "./pages/Settings.svelte";
  import Text from "./pages/Text.svelte";

  const MEETING_REFRESH_MS = 1200;
  type CloseDialogAction = "stop" | "retry" | null;

  let booting = $state(true);
  let setupRequired = $state(false);
  let setupSettings = $state<RuntimeSettings>(defaultSettings());
  let route = $state<AppRoute>("meeting");
  let notice = $state("Getting TranslateIT ready...");
  let meetingActionBusy = $state(false);
  let setupActionBusy = $state(false);
  let micTestBusy = $state(false);
  let myVoiceRecording = $state(false);
  let runtimeLoaded = $state(false);
  let runtimeSettings = $state<RuntimeSettings>(defaultSettings());
  let helperStatus = $state<HelperBridgeStatus | null>(null);
  let workerStatus = $state<HelperBridgeWorkerResponse | null>(null);
  let inputStatus = $state<InputPreparationStatus | null>(null);
  let approvedVoiceReady = $state<boolean | null>(null);
  let meetingStatus = $state<MeetingSessionStatus | null>(null);
  let meetingTurns = $state<MeetingCommittedTurnsSnapshot | null>(null);

  let closeDialogOpen = $state(false);
  let closeDialogTitle = $state("Close TranslateIT?");
  let closeDialogMessage = $state("");
  let closeDialogAction = $state<CloseDialogAction>(null);
  let stopAndCloseBusy = $state(false);
  let closeAfterExistingStop = $state(false);
  let meetingPollInFlight = false;
  let closeCheckInFlight = false;
  let lastTranscriptStatusKey = "";

  const snapshot = $derived.by<ProductRuntimeSnapshot | null>(() => {
    if (!runtimeLoaded) return null;
    return {
      settings: runtimeSettings,
      helper: helperStatus,
      workerStatus,
      inputStatus,
      meetingSession: meetingStatus,
      meeting: mapProductMeetingState(meetingStatus),
      readiness: mapProductReadiness({
        settings: runtimeSettings,
        helper: helperStatus,
        workerStatus,
        inputStatus,
        meetingSession: meetingStatus,
        approvedVoiceReady,
      }),
    };
  });

  const presence = $derived(
    snapshot?.meeting.live
      ? "Live"
      : snapshot?.readiness.level === "unavailable"
        ? "Unavailable"
        : snapshot?.readiness.meetingReady
          ? "Ready"
          : snapshot?.readiness.textReady
            ? "Degraded"
            : snapshot?.readiness.level === "blocked"
              ? "Setup Needed"
              : "Checking",
  );

  const closePrimaryLabel = $derived(
    closeDialogAction === "retry" ? "Try Again" : stopAndCloseBusy ? "Stopping..." : "Stop & Close",
  );

  function transcriptStatusKey(status: MeetingSessionStatus): string {
    return [
      status.session_id ?? "none",
      status.outbound.updated_unix_ms,
      status.incoming.updated_unix_ms,
      status.outbound.utterance_sequence,
    ].join(":");
  }

  function setNotice(message: string): void {
    notice = compact(message, "Status unavailable.", 220);
  }

  function navigate(next: AppRoute): void {
    if (myVoiceRecording && next !== "my-voice") {
      setNotice("Stop the current My Voice recording before leaving My Voice.");
      return;
    }
    route = next;
  }

  function applyMeetingStatus(status: MeetingSessionStatus, preferredNotice?: string): void {
    meetingStatus = status;
    if (preferredNotice) setNotice(preferredNotice);
  }

  async function refreshSnapshot(preferredNotice?: string, knownSettings?: RuntimeSettings): Promise<void> {
    try {
      const previousSessionId = snapshot?.meeting.sessionId ?? null;
      const next = await runtimeProductFacade.loadProductRuntimeSnapshot(knownSettings);
      runtimeSettings = cloneSettings(next.settings);
      setupSettings = cloneSettings(next.settings);
      helperStatus = next.helper;
      workerStatus = next.workerStatus;
      inputStatus = next.inputStatus;
      approvedVoiceReady = next.readiness.approvedVoiceReady;

      if (next.settings.meeting_setup_state === "new") {
        setupRequired = true;
        runtimeLoaded = false;
        meetingStatus = null;
        meetingTurns = null;
        lastTranscriptStatusKey = "";
        setNotice(preferredNotice ?? "Continue Meeting setup to use voice translation.");
        return;
      }

      setupRequired = false;
      runtimeLoaded = true;
      meetingStatus = next.meetingSession;
      if (!next.meeting.hasSession || previousSessionId !== next.meeting.sessionId) {
        meetingTurns = null;
        lastTranscriptStatusKey = "";
      }
      setNotice(preferredNotice ?? (next.meeting.hasSession ? next.meeting.message : next.readiness.summary));
    } catch {
      setNotice("TranslateIT couldn't refresh its status. Try again or open Diagnostics.");
    }
  }

  async function applySettings(next: RuntimeSettings): Promise<void> {
    const nextSettings = cloneSettings(next);
    runtimeSettings = nextSettings;
    setupSettings = nextSettings;
  }

  async function finishFirstSetup(next: RuntimeSettings): Promise<void> {
    setupSettings = cloneSettings(next);
    setupRequired = false;
    await refreshSnapshot("Setup saved.", next);
    route = "meeting";
  }

  async function openMyVoiceFromSetup(next: RuntimeSettings): Promise<void> {
    setupSettings = cloneSettings(next);
    setupRequired = false;
    await refreshSnapshot("Create My Voice before starting Meeting translation.", next);
    route = "my-voice";
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
    setNotice(action === "start" ? "Starting translation..." : "Stopping translation...");
    try {
      const result = await runtimeProductFacade.runProductMeetingAction(action);
      const resultNotice = result.ok
        ? action === "start" ? "Translation is live." : "Translation stopped."
        : action === "start"
          ? "Translation couldn't start. Check Setup or Diagnostics and try again."
          : "Translation couldn't stop safely. Try again or check Diagnostics.";
      applyMeetingStatus(result.status, resultNotice);
      if (!result.status.has_session) {
        meetingTurns = null;
        lastTranscriptStatusKey = "";
      } else if (action === "start") {
        meetingTurns = null;
        lastTranscriptStatusKey = "";
      }
    } catch {
      setNotice("The Meeting action couldn't be completed. Try again or check Diagnostics.");
      await refreshSnapshot();
    } finally {
      meetingActionBusy = false;
    }
  }

  async function runSetupAction(action: ProductSetupAction): Promise<void> {
    if (setupActionBusy) return;
    setupActionBusy = true;
    setNotice(action === "verify-models" ? "Checking translation files..." : "Checking setup...");
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
    setNotice("Checking setup...");
    try {
      const message = await runtimeProductFacade.runProductRecoveryAction("fix-setup");
      await refreshSnapshot(message);
    } finally {
      setupActionBusy = false;
    }
  }

  async function toggleMicTest(): Promise<void> {
    if (micTestBusy || !snapshot) return;
    if (myVoiceRecording) {
      setNotice("Stop the My Voice recording before using Mic Test.");
      return;
    }
    if (snapshot.meeting.applicationOwned) {
      setNotice(snapshot.meeting.live
        ? "Stop Meeting translation before using Mic Test."
        : "Mic Test is unavailable while Meeting audio is in use.");
      return;
    }
    const micTestOwnsRuntime = snapshot.meeting.hasSession && !snapshot.meeting.applicationOwned;
    if (!snapshot.readiness.voiceReady && !snapshot.readiness.recording && !micTestOwnsRuntime) {
      setNotice("Microphone setup isn't ready yet.");
      return;
    }

    micTestBusy = true;
    const wasRecording = snapshot.readiness.recording || micTestOwnsRuntime;
    try {
      const result = wasRecording ? await runtimeApi.stopCapture() : await runtimeApi.startCapture();
      await refreshSnapshot(result.ok ? (wasRecording ? "Mic Test stopped." : "Mic Test started.") : "Mic Test couldn't be completed. Try again or check Diagnostics.");
    } catch {
      setNotice("Mic Test couldn't be completed. Try again or check Diagnostics.");
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
      applyMeetingStatus(status);

      if (meetingBridgeUnavailable(status)) {
        meetingTurns = null;
        lastTranscriptStatusKey = "";
        setNotice("Meeting translation is temporarily unavailable.");
        return;
      }

      if (status.has_session) {
        const statusKey = transcriptStatusKey(status);
        if (statusKey !== lastTranscriptStatusKey) {
          const nextTurns = await runtimeApi.getMeetingCommittedTurns();
          if (nextTurns.ok && nextTurns.has_session && nextTurns.session_id === status.session_id) {
            meetingTurns = nextTurns;
            lastTranscriptStatusKey = statusKey;
          } else if (!meetingTurns) {
            meetingTurns = nextTurns;
          }
        }
      } else {
        meetingTurns = null;
        lastTranscriptStatusKey = "";
        if (closeAfterExistingStop) await destroyNativeWindow();
      }
    } catch {
      // A thrown poll failure provides no authoritative replacement state.
    } finally {
      meetingPollInFlight = false;
    }
  }

  function showCloseDialog(title: string, message: string, action: CloseDialogAction): void {
    closeDialogTitle = title;
    closeDialogMessage = compact(message, "Status unavailable.", 220);
    closeDialogAction = action;
    closeDialogOpen = true;
  }

  function keepApplicationOpen(): void {
    closeAfterExistingStop = false;
    stopAndCloseBusy = false;
    closeDialogAction = null;
    closeDialogOpen = false;
  }

  async function destroyNativeWindow(): Promise<void> {
    closeAfterExistingStop = false;
    closeDialogOpen = false;
    await getCurrentWindow().destroy();
  }

  type CloseVerdict =
    | { kind: "dialog"; title: string; message: string; action: CloseDialogAction }
    | { kind: "destroy" }
    | { kind: "stop-and-close" };

  function closeDialog(title: string, message: string, action: CloseDialogAction): CloseVerdict {
    return { kind: "dialog", title, message, action };
  }

  async function resolveCloseVerdict(): Promise<CloseVerdict> {
    const myVoice = await myVoiceApi.getState();
    if (myVoice.recording_line_id !== null) {
      return closeDialog(
        "Voice recording is still running",
        "Stop the current My Voice recording before closing TranslateIT so the take can be reviewed safely.",
        null,
      );
    }
    if (myVoice.pending_review) {
      return closeDialog(
        "Review the current voice take",
        "Accept or retry the current My Voice take before closing TranslateIT.",
        null,
      );
    }

    const build = await myVoiceBuildApi.getStatus();
    if (build.phase === "unavailable") {
      return closeDialog(
        "Can't check My Voice yet",
        "TranslateIT can't confirm whether My Voice is still being created. Keep the app open and try again.",
        "retry",
      );
    }
    if (build.active) {
      return closeDialog(
        "My Voice is still being created",
        "Stop My Voice creation before closing TranslateIT so the training process can end safely.",
        null,
      );
    }

    const status = await runtimeApi.getMeetingSessionStatus();
    if (meetingBridgeUnavailable(status)) {
      return closeDialog(
        "Can't check the meeting yet",
        "TranslateIT can't confirm whether Meeting translation is still active. Keep the app open or try the check again.",
        "retry",
      );
    }
    if (!status.has_session) return { kind: "destroy" };

    const meeting = mapProductMeetingState(status);
    if (!meeting.applicationOwned) {
      return closeDialog(
        "Audio is still in use",
        "Another TranslateIT action is still using the microphone. Finish that action before closing the app.",
        null,
      );
    }
    if (meeting.lifecycle === "stopping") {
      closeAfterExistingStop = true;
      return closeDialog(
        "Translation is stopping",
        "TranslateIT will close after Meeting translation finishes stopping.",
        null,
      );
    }

    return { kind: "stop-and-close" };
  }

  function applyCloseVerdict(verdict: CloseVerdict): void {
    if (verdict.kind === "destroy") {
      void destroyNativeWindow();
      return;
    }
    if (verdict.kind === "stop-and-close") {
      showCloseDialog(
        "Translation is still running",
        "Stop & Close ends Meeting translation safely before closing TranslateIT.",
        "stop",
      );
      return;
    }
    showCloseDialog(verdict.title, verdict.message, verdict.action);
  }

  async function inspectNativeCloseRequest(): Promise<void> {
    if (closeCheckInFlight || stopAndCloseBusy) return;
    closeCheckInFlight = true;
    try {
      applyCloseVerdict(await resolveCloseVerdict());
    } finally {
      closeCheckInFlight = false;
    }
  }

  async function handleStopAndClose(): Promise<void> {
    if (stopAndCloseBusy) return;
    stopAndCloseBusy = true;
    try {
      const verdict = await resolveCloseVerdict();
      if (verdict.kind !== "stop-and-close") {
        applyCloseVerdict(verdict);
        return;
      }

      const result = await runtimeProductFacade.runProductMeetingAction("stop");
      if (!result.ok) {
        showCloseDialog("Couldn't stop translation", "TranslateIT will stay open. Try Stop again or check Diagnostics.", "stop");
        return;
      }

      const verified = await runtimeApi.getMeetingSessionStatus();
      if (meetingBridgeUnavailable(verified)) {
        showCloseDialog("Couldn't confirm Stop", "TranslateIT couldn't confirm that Meeting translation ended, so the app will stay open.", "retry");
        return;
      }
      if (!verified.has_session) {
        await destroyNativeWindow();
        return;
      }

      const verifiedMeeting = mapProductMeetingState(verified);
      if (verifiedMeeting.applicationOwned && verifiedMeeting.lifecycle === "stopping") {
        closeAfterExistingStop = true;
        showCloseDialog("Translation is stopping", "TranslateIT will close after translation finishes stopping.", null);
        return;
      }
      showCloseDialog("Translation is still active", "TranslateIT hasn't confirmed that Meeting translation ended, so the app will stay open.", verifiedMeeting.applicationOwned ? "stop" : null);
    } catch {
      showCloseDialog("Couldn't close TranslateIT", "The app will stay open. Try again or check Diagnostics.", "retry");
    } finally {
      stopAndCloseBusy = false;
    }
  }

  async function handleCloseDialogPrimary(): Promise<void> {
    if (closeDialogAction === "retry") {
      closeDialogOpen = false;
      await inspectNativeCloseRequest();
      return;
    }
    if (closeDialogAction === "stop") await handleStopAndClose();
  }

  onMount(() => {
    let disposed = false;
    let unlistenClose: (() => void) | null = null;

    const boot = async () => {
      try {
        const loadedSettings = await runtimeApi.loadSettings();
        if (!loadedSettings) {
          setNotice("TranslateIT can't reach the desktop runtime yet. Try again when it is available.");
          return;
        }
        setupSettings = cloneSettings(loadedSettings);
        setupRequired = setupSettings.meeting_setup_state === "new";
        if (!setupRequired) await refreshSnapshot(undefined, loadedSettings);
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
    <section class="w-full max-w-[560px] text-center">
      <div class="mx-auto grid size-12 place-items-center rounded-[14px] border border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)] text-lg font-bold">T</div>
      <h1 class="mb-0 mt-5 text-2xl font-semibold tracking-[-0.03em]">Getting TranslateIT ready</h1>
      <p class="mb-0 mt-2 text-sm leading-6 text-[var(--ti-text-muted)]">Checking your saved setup.</p>
    </section>
  </main>
{:else if setupRequired}
  <FirstSetup initialSettings={setupSettings} onComplete={finishFirstSetup} onOpenMyVoice={openMyVoiceFromSetup} />
{:else if snapshot}
  <main class="flex h-screen min-h-0 bg-[var(--ti-bg)]">
    <Sidebar active={route} {presence} onNavigate={navigate} />

    <section class="flex min-w-0 flex-1 flex-col">
      <header class="flex min-h-14 shrink-0 items-center gap-4 border-b border-[var(--ti-border)] bg-[var(--ti-bg)] px-6">
        <p class="m-0 min-w-0 flex-1 truncate text-xs text-[var(--ti-text-muted)]" aria-live="polite" title={notice}>{notice}</p>

        {#if route !== "meeting" && snapshot.meeting.applicationOwned && snapshot.meeting.hasSession}
          <button
            type="button"
            class="flex items-center gap-2 rounded-full border border-[var(--ti-success-border)] bg-[var(--ti-success-surface)] px-3 py-1.5 text-left"
            onclick={() => { navigate("meeting"); }}
          >
            <span class="size-2 rounded-full bg-[var(--ti-success)]" aria-hidden="true"></span>
            <strong class="text-xs font-semibold text-[var(--ti-success)]">Meeting {snapshot.meeting.label.toLowerCase()}</strong>
          </button>
        {/if}

      </header>

      <div class="min-h-0 flex-1 overflow-y-auto">
        {#if route === "meeting"}
          <Meeting
            {snapshot}
            {meetingStatus}
            {meetingTurns}
            actionBusy={meetingActionBusy}
            onMeetingAction={handleMeetingAction}
            onRefresh={() => refreshSnapshot("Setup checked.")}
            onFixSetup={fixSetup}
            onOpenMyVoice={() => navigate("my-voice")}
          />
        {:else if route === "text"}
          <Text
            settings={snapshot.settings}
            textStatus={snapshot.readiness.textStatus}
            onSettingsChange={applySettings}
            onNotice={setNotice}
          />
        {:else if route === "my-voice"}
          <MyVoice
            onNotice={setNotice}
            onRecordingChange={(recording) => { myVoiceRecording = recording; }}
          />
        {:else}
          <Settings
            {snapshot}
            settings={snapshot.settings}
            setupBusy={setupActionBusy}
            {micTestBusy}
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
    <section class="ti-panel w-full max-w-[560px] p-7">
      <span class="ti-kicker">TranslateIT</span>
      <h1 class="mb-0 mt-3 text-2xl font-semibold">TranslateIT isn't ready yet</h1>
      <p class="mb-0 mt-3 text-sm leading-6 text-[var(--ti-text-muted)]">{notice}</p>
      <button
        type="button"
        class="ti-button mt-5"
        onclick={() => {
          setNotice("Checking again...");
          void refreshSnapshot();
        }}
      >Try Again</button>
    </section>
  </main>
{/if}

<Dialog.Root bind:open={closeDialogOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-[var(--ti-overlay)] backdrop-blur-[2px]" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-[min(500px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--ti-radius-lg)] border border-[var(--ti-border-strong)] bg-[var(--ti-surface)] p-6 shadow-[var(--ti-shadow-dialog)]">
      <Dialog.Title class="text-xl font-semibold">{closeDialogTitle}</Dialog.Title>
      <Dialog.Description class="mt-3 text-sm leading-6 text-[var(--ti-text-muted)]">{closeDialogMessage}</Dialog.Description>
      <div class="mt-6 flex justify-end gap-3">
        <button type="button" class="ti-button ti-button-secondary" disabled={stopAndCloseBusy} onclick={keepApplicationOpen}>Keep Open</button>
        {#if closeDialogAction}
          <button type="button" class={`ti-button ${closeDialogAction === "stop" ? "ti-button-danger" : ""}`} disabled={stopAndCloseBusy} onclick={() => void handleCloseDialogPrimary()}>{closePrimaryLabel}</button>
        {/if}
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
