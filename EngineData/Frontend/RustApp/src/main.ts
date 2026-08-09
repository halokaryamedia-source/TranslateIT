import "./styles.css";
import "./launcherGuard.css";
import "./professionalUi.css";
import "./referenceLayout.css";
import "./mainPageLayout.css";
import "./historyLayout.css";
import "./firstSetupLayout.css";
import "./audioSettingsLayout.css";
import "./translateSettingsLayout.css";
import "./developerSettingsLayout.css";
import { SimpleLauncherController } from "./app/simple-launcher/SimpleLauncherController";
import { startDesktopWithFirstSetup } from "./app/first-setup/FirstSetupBootstrap";
import { restoreNativeWindow } from "./app/active-launcher/windowRescue";
import { installStartupDiagnostics, startupTrace } from "./app/active-launcher/startupDiagnostics";

installStartupDiagnostics();
startupTrace("boot:marker", {
  marker: "translateit-tauri-desktop-runtime@0.1.0/simple-ui-v1",
  currentUrl: window.location.href,
});

window.setTimeout(() => {
  void restoreNativeWindow("boot:delayed");
}, 900);

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw Error("TranslateIT app root was not found.");

void startDesktopWithFirstSetup(app, () => new SimpleLauncherController(app).start());
