import "./styles.css";
import "./launcherGuard.css";
import "./professionalUi.css";
import "./referenceLayout.css";
import "./mainPageLayout.css";
import "./globalMeetingShell.css";
import "./meetingLiveActivity.css";
import "./firstSetupLayout.css";
import "./developerSettingsLayout.css";
import { SimpleLauncherController } from "./app/simple-launcher/SimpleLauncherController";
import { startGlobalMeetingShell } from "./app/simple-launcher/GlobalMeetingShell";
import { startMeetingLiveActivityPresentation } from "./app/simple-launcher/MeetingLiveActivityPresentation";
import { startDesktopWithFirstSetup } from "./app/first-setup/FirstSetupBootstrap";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw Error("TranslateIT app root was not found.");

void startDesktopWithFirstSetup(app, () => {
  const controller = new SimpleLauncherController(app);
  controller.start();
  startMeetingLiveActivityPresentation();
  void startGlobalMeetingShell();
});
