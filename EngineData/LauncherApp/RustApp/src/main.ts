import "./styles.css";
import "./settingsLayout.css";
import "./launcherGuard.css";
import "./referenceLayout.css";
import { LauncherController } from "./app/launcher/launcherController";
import { bindAttachmentLimitWatcher } from "./app/launcher/attachmentLimitWatcher";
import { bindAudioPipelineResultWatcher as bindResultWatcher } from "./app/launcher/audioPipelineResultWatcher";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw Error("TranslateIT app root was not found.");
}

new LauncherController(app).start();
bindAttachmentLimitWatcher();
bindResultWatcher();
