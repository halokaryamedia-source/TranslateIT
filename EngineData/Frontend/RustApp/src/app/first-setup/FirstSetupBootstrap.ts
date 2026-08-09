import { runtimeApi } from "../bridge/runtimeApi";
import {
  runtimeProductFacade,
  type ProductRuntimeSnapshot,
} from "../bridge/runtimeProductFacade";
import { defaultSettings, errorMessage } from "../shared/state";
import type { RuntimeSettings } from "../shared/types";

type SetupStep = 1 | 2 | 3 | 4 | 5;
type SetupState = "new" | "deferred" | "completed";

const MIN_SETUP_STEP: SetupStep = 1;
const MAX_SETUP_STEP: SetupStep = 5;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compact(value: unknown, fallback = "Unavailable"): string {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 180 ? `${clean.slice(0, 179).trimEnd()}…` : clean;
}

function setupState(settings: RuntimeSettings): SetupState {
  if (settings.meeting_setup_state === "deferred") return "deferred";
  if (settings.meeting_setup_state === "completed") return "completed";
  return "new";
}

function setupCheckpoint(settings: RuntimeSettings): SetupStep {
  const value = Math.round(Number(settings.meeting_setup_checkpoint || MIN_SETUP_STEP));
  return Math.max(MIN_SETUP_STEP, Math.min(MAX_SETUP_STEP, value)) as SetupStep;
}

function currentMicrophone(settings: RuntimeSettings, snapshot: ProductRuntimeSnapshot | null): string {
  return compact(
    snapshot?.inputStatus?.selected_device_name ?? settings.audio.input_device_id,
    "Windows Default",
  );
}

function currentMeetingSound(settings: RuntimeSettings): string {
  return compact(settings.audio.output_device_id, "Windows Default");
}

function statusText(ready: boolean, checking = false): string {
  if (ready) return "Ready";
  return checking ? "Checking" : "Setup Needed";
}

function statusTone(ready: boolean, checking = false): "good" | "neutral" | "warning" {
  if (ready) return "good";
  return checking ? "neutral" : "warning";
}

function progress(step: SetupStep): string {
  return `<div class="first-setup-progress" aria-label="Setup progress"><span>Step ${step} of 5</span><div><i style="width:${step * 20}%"></i></div></div>`;
}

function footerActions(options: {
  back?: boolean;
  primaryId?: string;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  secondaryId?: string;
  secondaryLabel?: string;
  defer?: boolean;
  busy?: boolean;
}): string {
  const back = options.back
    ? `<button class="first-setup-button first-setup-button--quiet" data-setup-action="back" type="button"${options.busy ? " disabled" : "">Back</button>`
    : `<span></span>`;
  const secondary = options.secondaryId && options.secondaryLabel
    ? `<button id="${options.secondaryId}" class="first-setup-button first-setup-button--secondary" type="button"${options.busy ? " disabled" : "">${escapeHtml(options.secondaryLabel)}</button>`
    : "";
  const defer = options.defer
    ? `<button class="first-setup-button first-setup-button--quiet" data-setup-action="defer" type="button"${options.busy ? " disabled" : "">Set up later</button>`
    : "";
  const primary = options.primaryId && options.primaryLabel
    ? `<button id="${options.primaryId}" class="first-setup-button first-setup-button--primary" type="button"${options.primaryDisabled || options.busy ? " disabled" : "">${escapeHtml(options.primaryLabel)}</button>`
    : "";
  return `<footer class="first-setup-footer"><div>${back}</div><div class="first-setup-footer-actions">${defer}${secondary}${primary}</div></footer>`;
}

class FirstSetupCoordinator {
  private settings: RuntimeSettings;
  private snapshot: ProductRuntimeSnapshot | null = null;
  private step: SetupStep;
  private busy = false;
  private message = "";

  constructor(
    private readonly app: HTMLElement,
    settings: RuntimeSettings,
    private readonly startMainApp: () => void,
  ) {
    this.settings = settings;
    this.step = setupCheckpoint(settings);
  }

  async start(): Promise<void> {
    if (setupState(this.settings) !== "new") {
      this.startMainApp();
      return;
    }

    if (this.step > 1) {
      await this.refreshSnapshot();
      this.step = this.safeResumeStep(this.step);
    }
    this.render();
  }

  private safeResumeStep(checkpoint: SetupStep): SetupStep {
    if (checkpoint <= 2) return checkpoint;
    if (!this.snapshot?.readiness.microphoneReady) return 2;
    if (checkpoint >= 5 && !this.snapshot.readiness.meetingRouteReady) return 4;
    return checkpoint;
  }

  private async refreshSnapshot(): Promise<void> {
    try {
      this.snapshot = await runtimeProductFacade.loadProductRuntimeSnapshot();
      this.settings = this.snapshot.settings ?? this.settings;
    } catch (error) {
      this.message = `Setup check failed: ${errorMessage(error)}`;
    }
  }

  private async persistSetupFact(state: SetupState, checkpoint: SetupStep): Promise<boolean> {
    const previousState = this.settings.meeting_setup_state;
    const previousCheckpoint = this.settings.meeting_setup_checkpoint;
    this.settings.meeting_setup_state = state;
    this.settings.meeting_setup_checkpoint = Math.max(setupCheckpoint(this.settings), checkpoint);

    try {
      const result = await runtimeApi.saveSettings(this.settings);
      if (!result.ok) throw Error(result.message || "Setup progress could not be saved.");
      this.settings = await runtimeApi.loadSettings().catch(() => this.settings);
      return true;
    } catch (error) {
      this.settings.meeting_setup_state = previousState;
      this.settings.meeting_setup_checkpoint = previousCheckpoint;
      this.message = `Setup progress was not saved: ${errorMessage(error)}`;
      return false;
    }
  }

  private async advance(step: SetupStep): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.message = "Saving setup progress...";
    this.render();
    const saved = await this.persistSetupFact("new", step);
    if (saved) {
      this.step = step;
      this.message = "";
      if (step === 2 || step === 4 || step === 5) await this.refreshSnapshot();
    }
    this.busy = false;
    this.render();
  }

  private goBack(): void {
    if (this.busy || this.step <= 1) return;
    this.step = Math.max(1, this.step - 1) as SetupStep;
    this.message = "";
    this.render();
  }

  private async deferSetup(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.message = "Saving your choice...";
    this.render();
    const saved = await this.persistSetupFact("deferred", this.step);
    this.busy = false;
    if (!saved) {
      this.render();
      return;
    }
    this.startMainApp();
  }

  private async checkMicrophone(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.message = "Checking your microphone...";
    this.render();
    try {
      const result = await runtimeProductFacade.runProductSetupAction("check-microphone");
      await this.refreshSnapshot();
      this.message = this.snapshot?.readiness.microphoneReady
        ? "Your microphone is ready."
        : compact(result, "Microphone setup still needs attention.");
    } catch (error) {
      this.message = `Microphone check failed: ${errorMessage(error)}`;
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async fixSetup(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.message = "Running setup checks...";
    this.render();
    try {
      const result = await runtimeProductFacade.runProductRecoveryAction("fix-setup");
      await this.refreshSnapshot();
      this.message = compact(result, "Setup check completed.");
    } catch (error) {
      this.message = `Setup check failed: ${errorMessage(error)}`;
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async retryVerify(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.message = "Checking your setup...";
    this.render();
    await this.refreshSnapshot();
    this.message = this.snapshot?.readiness.meetingReady
      ? "Required Meeting translation setup is ready."
      : compact(this.snapshot?.readiness.summary, "Setup still needs attention.");
    this.busy = false;
    this.render();
  }

  private async completeSetup(): Promise<void> {
    if (this.busy || !this.snapshot?.readiness.meetingReady) return;
    this.busy = true;
    this.message = "Saving setup completion...";
    this.render();
    const saved = await this.persistSetupFact("completed", 5);
    this.busy = false;
    if (!saved) {
      this.render();
      return;
    }
    this.startMainApp();
  }

  private render(): void {
    const content = this.renderStep();
    this.app.innerHTML = `<main class="first-setup-shell" aria-label="TranslateIT First Setup">
      <section class="first-setup-window">
        <header class="first-setup-brand"><div class="first-setup-mark">T</div><div><strong>TranslateIT</strong><span>Meeting translation setup</span></div></header>
        ${progress(this.step)}
        ${content}
        ${this.message ? `<p class="first-setup-message" aria-live="polite">${escapeHtml(this.message)}</p>` : ""}
      </section>
    </main>`;
    this.bindStepActions();
  }

  private renderStep(): string {
    const readiness = this.snapshot?.readiness;
    const checking = readiness?.level === "checking";

    if (this.step === 1) {
      return `<section class="first-setup-content first-setup-content--welcome">
        <span class="first-setup-kicker">Welcome</span>
        <h1>Speak Indonesian. Your meeting hears English.</h1>
        <p>Understand English conversations with Indonesian live translation. TranslateIT runs locally after the required setup is available.</p>
        <div class="first-setup-language-summary"><span>Indonesian → English voice</span><span>English → Indonesian text</span></div>
        ${footerActions({ primaryId: "setupStartButton", primaryLabel: "Set Up Meeting", defer: true, busy: this.busy })}
      </section>`;
    }

    if (this.step === 2) {
      const ready = Boolean(readiness?.microphoneReady);
      const detail = ready
        ? "TranslateIT can use this microphone for outbound translation."
        : compact(this.snapshot?.inputStatus?.note ?? this.snapshot?.inputStatus?.blocker, "Check the microphone before continuing. If Windows blocks access, enable microphone permission in Windows Settings and retry.");
      return `<section class="first-setup-content">
        <span class="first-setup-kicker">Your microphone</span>
        <h1>Set up the microphone you speak into.</h1>
        <p>TranslateIT uses your current microphone selection for Indonesian speech.</p>
        <div class="first-setup-check-row"><div><span>Current microphone</span><strong>${escapeHtml(currentMicrophone(this.settings, this.snapshot))}</strong><small>${escapeHtml(detail)}</small></div><b data-tone="${statusTone(ready, Boolean(checking))}">${statusText(ready, Boolean(checking))}</b></div>
        ${footerActions({ back: true, primaryId: "setupMicrophoneContinueButton", primaryLabel: "Continue", primaryDisabled: !ready, secondaryId: "setupCheckMicrophoneButton", secondaryLabel: ready ? "Check Again" : "Check Microphone", defer: true, busy: this.busy })}
      </section>`;
    }

    if (this.step === 3) {
      return `<section class="first-setup-content">
        <span class="first-setup-kicker">Meeting sound</span>
        <h1>Where do you listen to your meetings?</h1>
        <p>This is the current device preference for meeting sound.</p>
        <div class="first-setup-check-row"><div><span>Current meeting sound</span><strong>${escapeHtml(currentMeetingSound(this.settings))}</strong><small>Incoming English → Indonesian translation is not connected yet in this build. Your translated outbound voice can still be set up independently.</small></div><b data-tone="warning">Incoming unavailable</b></div>
        ${footerActions({ back: true, primaryId: "setupMeetingSoundContinueButton", primaryLabel: "Continue", defer: true, busy: this.busy })}
      </section>`;
    }

    if (this.step === 4) {
      const ready = Boolean(readiness?.meetingRouteReady);
      return `<section class="first-setup-content">
        <span class="first-setup-kicker">Meeting microphone</span>
        <h1>Prepare TranslateIT Meeting Microphone.</h1>
        <p>In Zoom, Meet, Teams, or another meeting app, choose this as your microphone.</p>
        <div class="first-setup-check-row"><div><span>Meeting microphone</span><strong>TranslateIT Meeting Microphone</strong><small>${ready ? "The managed Meeting microphone route is available." : "TranslateIT cannot safely send translated voice to the Meeting microphone yet."}</small></div><b data-tone="${statusTone(ready, Boolean(checking))}">${statusText(ready, Boolean(checking))}</b></div>
        <div class="first-setup-guidance"><span>In your meeting app</span><strong>Microphone → TranslateIT Meeting Microphone</strong></div>
        ${footerActions({ back: true, primaryId: "setupMeetingMicContinueButton", primaryLabel: "Continue", primaryDisabled: !ready, secondaryId: "setupFixButton", secondaryLabel: "Fix Setup", defer: true, busy: this.busy })}
      </section>`;
    }

    const meetingReady = Boolean(readiness?.meetingReady);
    const microphoneReady = Boolean(readiness?.microphoneReady);
    const routeReady = Boolean(readiness?.meetingRouteReady);
    const textReady = Boolean(readiness?.textReady);
    return `<section class="first-setup-content">
      <span class="first-setup-kicker">Verify / Ready</span>
      <h1>${meetingReady ? "You're ready to translate." : "Setup still needs attention."}</h1>
      <p>${meetingReady ? "Required outbound Meeting translation capabilities are ready. Incoming translation can be fixed separately when its lane is available." : "TranslateIT rechecks actual capabilities here instead of trusting an old Ready flag."}</p>
      <div class="first-setup-checklist">
        <div><span>Your microphone</span><b data-tone="${statusTone(microphoneReady)}">${statusText(microphoneReady)}</b></div>
        <div><span>Local translation</span><b data-tone="${statusTone(textReady)}">${statusText(textReady)}</b></div>
        <div><span>Meeting microphone</span><b data-tone="${statusTone(routeReady)}">${statusText(routeReady)}</b></div>
        <div><span>Incoming translation</span><b data-tone="warning">Unavailable</b></div>
      </div>
      ${footerActions({ back: true, primaryId: "setupCompleteButton", primaryLabel: "Go to Meeting", primaryDisabled: !meetingReady, secondaryId: "setupVerifyButton", secondaryLabel: meetingReady ? "Check Again" : "Retry", defer: true, busy: this.busy })}
      ${!meetingReady ? `<button id="setupVerifyFixButton" class="first-setup-inline-action" type="button"${this.busy ? " disabled" : ""}>Fix Setup</button>` : ""}
    </section>`;
  }

  private bindStepActions(): void {
    this.app.querySelector<HTMLButtonElement>("[data-setup-action='back']")?.addEventListener("click", () => this.goBack());
    this.app.querySelector<HTMLButtonElement>("[data-setup-action='defer']")?.addEventListener("click", () => void this.deferSetup());
    this.app.querySelector<HTMLButtonElement>("#setupStartButton")?.addEventListener("click", () => void this.advance(2));
    this.app.querySelector<HTMLButtonElement>("#setupCheckMicrophoneButton")?.addEventListener("click", () => void this.checkMicrophone());
    this.app.querySelector<HTMLButtonElement>("#setupMicrophoneContinueButton")?.addEventListener("click", () => void this.advance(3));
    this.app.querySelector<HTMLButtonElement>("#setupMeetingSoundContinueButton")?.addEventListener("click", () => void this.advance(4));
    this.app.querySelector<HTMLButtonElement>("#setupFixButton")?.addEventListener("click", () => void this.fixSetup());
    this.app.querySelector<HTMLButtonElement>("#setupMeetingMicContinueButton")?.addEventListener("click", () => void this.advance(5));
    this.app.querySelector<HTMLButtonElement>("#setupVerifyButton")?.addEventListener("click", () => void this.retryVerify());
    this.app.querySelector<HTMLButtonElement>("#setupVerifyFixButton")?.addEventListener("click", () => void this.fixSetup());
    this.app.querySelector<HTMLButtonElement>("#setupCompleteButton")?.addEventListener("click", () => void this.completeSetup());
  }
}

export async function startDesktopWithFirstSetup(app: HTMLElement, startMainApp: () => void): Promise<void> {
  const settings = await runtimeApi.loadSettings().catch(() => defaultSettings());
  if (setupState(settings) !== "new") {
    startMainApp();
    return;
  }
  const coordinator = new FirstSetupCoordinator(app, settings, startMainApp);
  await coordinator.start();
}
