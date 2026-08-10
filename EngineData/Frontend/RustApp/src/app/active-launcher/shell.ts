import {
  lockedHomeWorkspace,
  lockedMainSidebar,
  lockedSettingsPage,
  lockedWarmupScreen,
} from "./lockedReferenceShellParts";

function globalMeetingShell(): string {
  return `
    <section id="globalMeetingStrip" class="global-meeting-strip" aria-live="polite" hidden>
      <div class="global-meeting-strip-copy">
        <span class="global-meeting-strip-kicker">Meeting</span>
        <strong id="globalMeetingStripState">Live</strong>
        <span id="globalMeetingStripSummary" class="global-meeting-strip-summary">ID → EN · Translation is active.</span>
      </div>
      <button id="globalMeetingOpenButton" class="global-meeting-strip-open" type="button">Open Meeting</button>
    </section>

    <dialog id="meetingCloseDialog" class="meeting-close-dialog" aria-labelledby="meetingCloseDialogTitle">
      <form method="dialog" class="meeting-close-dialog-card">
        <span class="hero-kicker">Meeting still active</span>
        <h2 id="meetingCloseDialogTitle">Stop Translation before closing TranslateIT?</h2>
        <p id="meetingCloseDialogMessage">TranslateIT will safely stop the current Meeting session before the application closes.</p>
        <div class="meeting-close-dialog-actions">
          <button id="meetingCloseKeepOpenButton" class="assistant-action secondary" type="button">Keep Open</button>
          <button id="meetingCloseStopButton" class="assistant-action global-meeting-close-stop" type="button">Stop &amp; Close</button>
        </div>
      </form>
    </dialog>`;
}

export function mountAppShell(app: HTMLElement): void {
  app.innerHTML = `
    ${lockedWarmupScreen()}
    <main id="mainApp" class="app-shell is-hidden">
      ${lockedMainSidebar()}
      ${lockedHomeWorkspace()}
      ${lockedSettingsPage()}
      ${globalMeetingShell()}
    </main>`;
}
