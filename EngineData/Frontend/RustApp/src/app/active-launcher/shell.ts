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
  return "";
}
