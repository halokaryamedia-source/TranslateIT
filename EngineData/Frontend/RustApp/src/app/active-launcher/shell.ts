import { icon } from "../shared/icons";
import {
  lockedHomeWorkspace,
  lockedMainSidebar,
  lockedRuntimeSinks,
  lockedSettingsPage,
  lockedWarmupScreen,
} from "./lockedReferenceShellParts";

export function mountAppShell(app: HTMLElement): void {
  app.innerHTML = `
    ${lockedWarmupScreen()}
    <main id="mainApp" class="app-shell is-hidden">
      ${lockedMainSidebar()}
      ${lockedHomeWorkspace()}
      ${lockedSettingsPage()}
      ${lockedRuntimeSinks()}
    </main>`;
}

export function homeDefaultCards(): string {
  return `<article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("keyboard")}</div><h4>Text input</h4></div><p>Type or paste Indonesian text and get an English translation in the conversation.</p></article><article class="feature-card"><div class="feature-title-row"><div class="feature-icon">${icon("mic")}</div><h4>Voice input</h4></div><p>Press the microphone button. A recording indicator appears while voice capture is active.</p></article>`;
}
